import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './admin.css';

type Perfil = components['schemas']['PerfilGlobal'];
type Permissao = {
  codigo: string;
  modulo: string;
  descricao: string;
  categoria?: 'TUTOR' | 'EMPRESA' | 'ADMINISTRADOR';
};

const CATEGORIA: Record<Perfil['categoria'], string> = {
  TUTOR: 'Tutores no app',
  EMPRESA: 'Contas de empresa',
  ADMINISTRADOR: 'Administração da plataforma',
};

/** As permissões que cabem no perfil: as da categoria dele e as compartilhadas. */
function aplicaveis(catalogo: Permissao[], categoria: Perfil['categoria']) {
  const compartilhadas: Record<string, Perfil['categoria'][]> = {
    'chat:usar': ['TUTOR', 'EMPRESA'],
    'notificacao:configurar': ['TUTOR', 'EMPRESA'],
    'relatorio:ler': ['EMPRESA', 'ADMINISTRADOR'],
  };
  return catalogo.filter((p) =>
    p.categoria ? p.categoria === categoria : (compartilhadas[p.codigo] ?? []).includes(categoria),
  );
}

/** Permissões globais (UC-29, RN35): a matriz de acesso de cada perfil da plataforma. */
export function PermissoesGlobais() {
  const [perfis, setPerfis] = useState<Perfil[] | null>(null);
  const [catalogo, setCatalogo] = useState<Permissao[]>([]);
  const [selecionado, setSelecionado] = useState('');
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void Promise.all([api.GET('/admin/perfis'), api.GET('/admin/permissoes')]).then(([p, c]) => {
      if (!ativo) return;
      const lista = p.data ?? [];
      setPerfis(lista);
      setCatalogo((c.data ?? []) as Permissao[]);
      const atual = lista.find((x) => x.id === selecionado) ?? lista[0];
      if (atual) {
        setSelecionado(atual.id);
        setMarcadas(atual.permissoes);
      }
    });
    return () => {
      ativo = false;
    };
    // O perfil escolhido só muda pela seleção; recarregar não deve trocá-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao]);

  const perfil = perfis?.find((p) => p.id === selecionado);
  const opcoes = perfil ? aplicaveis(catalogo, perfil.categoria) : [];
  const modulos = [...new Set(opcoes.map((p) => p.modulo))];

  function escolher(id: string) {
    setSelecionado(id);
    setMarcadas(perfis?.find((p) => p.id === id)?.permissoes ?? []);
    setAviso(null);
  }

  function alternar(codigo: string) {
    setMarcadas((atuais) => (atuais.includes(codigo) ? atuais.filter((c) => c !== codigo) : [...atuais, codigo]));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    const { error } = await api.PUT('/admin/perfis/{perfilId}', {
      params: { path: { perfilId: perfil.id } },
      body: { permissoes: marcadas },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Permissões não alteradas', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: `Permissões de ${perfil.nome} alteradas`,
      mensagem: `Valem a partir da próxima ação das ${perfil.usuarios} contas com este perfil.`,
    });
    setVersao((v) => v + 1);
  }

  const mudou = perfil && [...marcadas].sort().join() !== [...perfil.permissoes].sort().join();

  return (
    <div className="pagina">
      <h1>Permissões globais</h1>
      {perfis === null ? (
        <p role="status">Carregando…</p>
      ) : (
        <>
          <label className="admin__selecao admin__perfil">
            Perfil
            <select value={selecionado} onChange={(e) => escolher(e.target.value)}>
              {perfis.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} · {CATEGORIA[p.categoria]} ({p.usuarios} {p.usuarios === 1 ? 'conta' : 'contas'})
                </option>
              ))}
            </select>
          </label>
          {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
          {perfil && (
            <Cartao titulo={perfil.nome} subtitulo={perfil.descricao ?? CATEGORIA[perfil.categoria]}>
              <form className="admin__matriz" onSubmit={salvar} aria-label={`Permissões de ${perfil.nome}`}>
                {modulos.map((m) => (
                  <fieldset key={m} className="admin__eventos">
                    <legend>{m}</legend>
                    {opcoes
                      .filter((p) => p.modulo === m)
                      .map((p) => (
                        <label key={p.codigo}>
                          <input type="checkbox" checked={marcadas.includes(p.codigo)} onChange={() => alternar(p.codigo)} />
                          {p.descricao} <code>{p.codigo}</code>
                        </label>
                      ))}
                  </fieldset>
                ))}
                {marcadas.length === 0 && (
                  <Alerta tipo="alerta" titulo="Marque ao menos uma permissão" mensagem="Um perfil sem permissão não é aceito." />
                )}
                <div className="admin__acoes">
                  <Botao type="submit" carregando={salvando} disabled={!mudou}>
                    Salvar permissões
                  </Botao>
                  <Botao variante="texto" disabled={!mudou} onClick={() => setMarcadas(perfil.permissoes)}>
                    Desfazer
                  </Botao>
                </div>
              </form>
            </Cartao>
          )}
        </>
      )}
    </div>
  );
}
