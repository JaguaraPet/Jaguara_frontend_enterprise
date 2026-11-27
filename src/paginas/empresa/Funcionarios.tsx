import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import '../admin/logs.css';

type Funcionario = components['schemas']['Funcionario'];
type Perfil = components['schemas']['PerfilDaEmpresa'];
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const situacao = (f: Funcionario) => (!f.ativo ? 'Desligado' : f.pendente ? 'Convite enviado' : 'Ativo');

/** Equipe da empresa (UC-19) e troca de perfil de acesso (UC-16, RN20, RN23). */
export function Funcionarios() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('funcionario:editar') ?? false;
  const [lista, setLista] = useState<Funcionario[] | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [perfilId, setPerfilId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [desligando, setDesligando] = useState<Funcionario | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/funcionarios', caminho),
      api.GET('/empresas/{empresaId}/perfis', caminho),
    ]).then(([f, p]) => {
      if (!ativo) return;
      setLista(f.data ?? []);
      setPerfis(p.data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  async function cadastrar(evento: FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    const { data, error } = await api.POST('/empresas/{empresaId}/funcionarios', {
      params: { path: { empresaId } },
      body: { nome, cpf: cpf.replace(/\D/g, ''), email, cargo: cargo || undefined, perfilId },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Funcionário não cadastrado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: `Convite enviado para ${data?.email ?? email}`,
      mensagem: 'O acesso começa quando a pessoa criar a senha pelo link do e-mail.',
    });
    setNome('');
    setCpf('');
    setEmail('');
    setCargo('');
    setVersao((v) => v + 1);
  }

  async function trocarPerfil(f: Funcionario, novo: string) {
    const { error } = await api.PATCH('/funcionarios/{funcionarioId}', {
      params: { path: { funcionarioId: f.id! } },
      body: { perfilId: novo },
    });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Perfil não alterado', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: `Perfil de ${f.nome} alterado`, mensagem: 'Vale a partir do próximo acesso.' },
    );
    setVersao((v) => v + 1);
  }

  async function confirmarDesligamento() {
    if (!desligando) return;
    const { error } = await api.DELETE('/funcionarios/{funcionarioId}', {
      params: { path: { funcionarioId: desligando.id! } },
    });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Funcionário não desligado', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: `${desligando.nome} foi desligado`, mensagem: 'Todos os acessos foram encerrados.' },
    );
    setDesligando(null);
    setVersao((v) => v + 1);
  }

  return (
    <div className="pagina">
      <h1>Funcionários</h1>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {desligando && (
        <Alerta
          tipo="alerta"
          titulo={`Desligar ${desligando.nome}?`}
          mensagem="A pessoa perde o acesso na hora e as sessões abertas são encerradas."
        />
      )}
      {desligando && (
        <div className="admin__acoes">
          <Botao onClick={() => void confirmarDesligamento()}>Confirmar desligamento</Botao>
          <Botao variante="texto" onClick={() => setDesligando(null)}>
            Cancelar
          </Botao>
        </div>
      )}

      {podeEditar && (
        <Cartao titulo="Novo funcionário" subtitulo="A pessoa recebe um convite por e-mail para criar a senha.">
          <form className="admin__formulario" onSubmit={cadastrar} aria-label="Novo funcionário">
            <Campo rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <Campo
              rotulo="CPF"
              inputMode="numeric"
              ajuda="Só os números."
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              required
            />
            <Campo rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Campo rotulo="Cargo (opcional)" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            <label className="admin__selecao">
              Perfil de acesso
              <select value={perfilId} onChange={(e) => setPerfilId(e.target.value)} required>
                <option value="">Escolha</option>
                {perfis.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                    {p.descricao ? ` · ${p.descricao}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <Botao type="submit" carregando={salvando}>
              Enviar convite
            </Botao>
          </form>
        </Cartao>
      )}

      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhum funcionário cadastrado" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Equipe" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Cargo</th>
                <th scope="col">Perfil</th>
                <th scope="col">Situação</th>
                {podeEditar && <th scope="col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td>{f.nome}</td>
                  <td>{f.email}</td>
                  <td>{f.cargo || '-'}</td>
                  <td>
                    {podeEditar && f.ativo ? (
                      <select
                        aria-label={`Perfil de ${f.nome}`}
                        value={f.perfilId}
                        onChange={(e) => void trocarPerfil(f, e.target.value)}
                      >
                        {perfis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    ) : (
                      f.perfil
                    )}
                  </td>
                  <td>{situacao(f)}</td>
                  {podeEditar && (
                    <td>
                      {f.ativo && (
                        <Botao variante="texto" onClick={() => setDesligando(f)} aria-label={`Desligar ${f.nome}`}>
                          Desligar
                        </Botao>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
