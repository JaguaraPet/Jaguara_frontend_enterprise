import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';
import '../admin/admin.css';

type Perfil = components['schemas']['PerfilDaEmpresa'];
type Permissao = { codigo: string; modulo: string; descricao: string };
type Aviso = { tipo: 'sucesso' | 'erro' | 'info'; titulo: string; mensagem?: string };

const NOVO = 'novo';
const PROTEGIDO = 'Proprietário';

/** Perfis de acesso da empresa (UC-16, RN20): cria, altera as permissões e exclui os perfis da equipe. */
export function Perfis() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const edita = usuario?.permissoes.includes('perfil:editar') ?? false;
  const [perfis, setPerfis] = useState<Perfil[] | null>(null);
  const [catalogo, setCatalogo] = useState<Permissao[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  function preencher(p?: Perfil) {
    setSelecionado(p?.id ?? NOVO);
    setNome(p?.nome ?? '');
    setDescricao(p?.descricao ?? '');
    setMarcadas(p?.permissoes ?? []);
    setConfirmarExclusao(false);
  }

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void Promise.all([
      api.GET('/empresas/{empresaId}/perfis', { params: { path: { empresaId } } }),
      api.GET('/empresas/{empresaId}/permissoes', { params: { path: { empresaId } } }),
    ]).then(([p, c]) => {
      if (!ativo) return;
      const lista = p.data ?? [];
      setPerfis(lista);
      setCatalogo(c.data ?? []);
      preencher(lista.find((x) => x.id === selecionado) ?? lista.find((x) => x.nome !== PROTEGIDO) ?? lista[0]);
    });
    return () => {
      ativo = false;
    };
    // O perfil escolhido só muda pela seleção; recarregar não deve trocá-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, versao]);

  const perfil = perfis?.find((p) => p.id === selecionado);
  const protegido = perfil?.nome === PROTEGIDO;
  const somenteLeitura = !edita || protegido;
  const modulos = [...new Set(catalogo.map((p) => p.modulo))];

  function escolher(id: string) {
    setAviso(null);
    preencher(id === NOVO ? undefined : perfis?.find((p) => p.id === id));
  }

  function alternar(codigo: string) {
    setMarcadas((atuais) => (atuais.includes(codigo) ? atuais.filter((c) => c !== codigo) : [...atuais, codigo]));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const body = { nome: nome.trim(), ...(descricao.trim() ? { descricao: descricao.trim() } : {}), permissoes: marcadas };
    const { data, error } = perfil
      ? await api.PUT('/perfis/{perfilId}', { params: { path: { perfilId: perfil.id } }, body })
      : await api.POST('/empresas/{empresaId}/perfis', { params: { path: { empresaId } }, body });
    setSalvando(false);
    if (error || !data) {
      setAviso({ tipo: 'erro', titulo: 'Perfil não salvo', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: perfil ? `Perfil ${data.nome} alterado` : `Perfil ${data.nome} criado`,
      mensagem: perfil ? 'As novas permissões valem na próxima ação de quem usa este perfil.' : 'Já pode ser escolhido em Funcionários.',
    });
    setSelecionado(data.id);
    setVersao((v) => v + 1);
  }

  async function excluir() {
    if (!perfil) return;
    const { error } = await api.DELETE('/perfis/{perfilId}', { params: { path: { perfilId: perfil.id } } });
    setConfirmarExclusao(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Perfil não excluído', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: `Perfil ${perfil.nome} excluído` });
    setSelecionado('');
    setVersao((v) => v + 1);
  }

  const mudou =
    !perfil ||
    nome.trim() !== perfil.nome ||
    descricao.trim() !== (perfil.descricao ?? '') ||
    [...marcadas].sort().join() !== [...perfil.permissoes].sort().join();
  const valido = nome.trim().length >= 3 && marcadas.length > 0;

  return (
    <div className="pagina">
      <h1>Perfis de acesso</h1>
      <p>Cada funcionário usa um perfil, e o perfil define o que ele vê e faz no Jaguara (RN20).</p>
      {perfis === null ? (
        <p role="status">Carregando…</p>
      ) : (
        <>
          <label className="admin__selecao admin__perfil">
            Perfil
            <select value={selecionado} onChange={(e) => escolher(e.target.value)}>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.permissoes.length} {p.permissoes.length === 1 ? 'permissão' : 'permissões'})
                </option>
              ))}
              {edita && <option value={NOVO}>+ Novo perfil</option>}
            </select>
          </label>
          {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
          {protegido && (
            <Alerta tipo="info" titulo="Perfil da conta da empresa" mensagem="O Proprietário tem todas as permissões e não pode ser alterado." />
          )}
          {!edita && <Alerta tipo="info" titulo="Somente leitura" mensagem="Seu perfil pode ver, mas não alterar, os perfis de acesso." />}
          <Cartao titulo={perfil ? perfil.nome : 'Novo perfil'} subtitulo={perfil?.descricao}>
            <form className="admin__matriz" onSubmit={(e) => void salvar(e)} aria-label="Perfil de acesso">
              <fieldset disabled={somenteLeitura} className="admin__formulario">
                <Campo rotulo="Nome do perfil" value={nome} onChange={(e) => setNome(e.target.value)} minLength={3} maxLength={60} required />
                <Campo rotulo="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={255} />
              </fieldset>
              {modulos.map((m) => (
                <fieldset key={m} className="admin__eventos" disabled={somenteLeitura}>
                  <legend>{m}</legend>
                  {catalogo
                    .filter((p) => p.modulo === m)
                    .map((p) => (
                      <label key={p.codigo}>
                        <input type="checkbox" checked={marcadas.includes(p.codigo)} onChange={() => alternar(p.codigo)} />
                        {p.descricao} <code>{p.codigo}</code>
                      </label>
                    ))}
                </fieldset>
              ))}
              {!somenteLeitura && marcadas.length === 0 && (
                <Alerta tipo="alerta" titulo="Marque ao menos uma permissão" mensagem="Um perfil sem permissão não é aceito (RN20)." />
              )}
              {!somenteLeitura && (
                <div className="admin__acoes">
                  <Botao type="submit" carregando={salvando} disabled={!mudou || !valido}>
                    {perfil ? 'Salvar perfil' : 'Criar perfil'}
                  </Botao>
                  <Botao variante="texto" disabled={!mudou} onClick={() => preencher(perfil)}>
                    Desfazer
                  </Botao>
                  {perfil &&
                    (confirmarExclusao ? (
                      <>
                        <Botao variante="perigo" onClick={() => void excluir()}>
                          Confirmar exclusão
                        </Botao>
                        <Botao variante="texto" onClick={() => setConfirmarExclusao(false)}>
                          Manter perfil
                        </Botao>
                      </>
                    ) : (
                      <Botao variante="secundaria" onClick={() => setConfirmarExclusao(true)}>
                        Excluir perfil
                      </Botao>
                    ))}
                </div>
              )}
            </form>
          </Cartao>
        </>
      )}
    </div>
  );
}
