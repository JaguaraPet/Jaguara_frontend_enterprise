import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './logs.css';
import './admin.css';

type ContaResumo = components['schemas']['ContaResumo'];
type ContaDetalhe = components['schemas']['ContaDetalhe'];
type StatusConta = components['schemas']['StatusConta'];
type NovoStatus = 'ATIVA' | 'BLOQUEADA' | 'SUSPENSA';

const ROTULO_STATUS: Record<StatusConta, string> = {
  PENDENTE_CONFIRMACAO: 'Aguardando confirmação',
  ATIVA: 'Ativa',
  BLOQUEADA: 'Bloqueada',
  SUSPENSA: 'Suspensa',
  INATIVA: 'Excluída',
};

const ROTULO_TIPO: Record<ContaResumo['tipo'], string> = {
  TUTOR: 'Tutor',
  EMPRESA: 'Empresa',
  FUNCIONARIO: 'Funcionário',
  ADMINISTRADOR: 'Administrador',
};

const ROTULO_ACAO: Record<string, string> = {
  CONTA_SUSPENSA: 'Suspensa',
  CONTA_BLOQUEADA: 'Bloqueada',
  CONTA_REATIVADA: 'Reativada',
};

/** Ações possíveis a partir do status atual (RN34). */
function acoesPara(status: StatusConta): { valor: NovoStatus; rotulo: string }[] {
  if (status === 'PENDENTE_CONFIRMACAO' || status === 'INATIVA') return [];
  const todas: { valor: NovoStatus; rotulo: string }[] = [
    { valor: 'SUSPENSA', rotulo: 'Suspender' },
    { valor: 'BLOQUEADA', rotulo: 'Bloquear' },
    { valor: 'ATIVA', rotulo: 'Reativar' },
  ];
  return todas.filter((a) => a.valor !== status);
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Gestão de contas de usuários (UC-28, RN34): busca, perfil, bloqueio, suspensão e reativação. */
export function Contas() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<StatusConta | ''>('');
  const [filtro, setFiltro] = useState<{ busca: string; status: StatusConta | '' }>({ busca: '', status: '' });
  const [lista, setLista] = useState<ContaResumo[] | null>(null);
  const [erroLista, setErroLista] = useState(false);
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [conta, setConta] = useState<ContaDetalhe | null>(null);
  const [acao, setAcao] = useState<NovoStatus | ''>('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/admin/usuarios', {
        params: { query: { busca: filtro.busca || undefined, status: filtro.status || undefined } },
      })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErroLista(!!error);
        setLista(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [filtro, versao]);

  useEffect(() => {
    if (!selecionadaId) return;
    let ativo = true;
    void api
      .GET('/admin/usuarios/{usuarioId}', { params: { path: { usuarioId: selecionadaId } } })
      .then(({ data }) => {
        if (ativo) setConta(data ?? null);
      });
    return () => {
      ativo = false;
    };
  }, [selecionadaId, versao]);

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    setFiltro({ busca: busca.trim(), status });
  }

  function abrir(id: string) {
    setSelecionadaId(id);
    setConta(null);
    setAcao('');
    setMotivo('');
    setAviso(null);
  }

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (!conta || !acao) return;
    setSalvando(true);
    const { error } = await api.PUT('/admin/usuarios/{usuarioId}/status', {
      params: { path: { usuarioId: conta.id } },
      body: { status: acao, motivo },
    });
    setSalvando(false);
    if (error) {
      // FA1: a operação é cancelada e o status continua o mesmo.
      setAviso({ tipo: 'erro', titulo: 'Status não alterado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: `Conta ${ROTULO_STATUS[acao].toLowerCase()}`,
      mensagem: 'A alteração foi registrada na auditoria.',
    });
    setAcao('');
    setMotivo('');
    setVersao((v) => v + 1);
  }

  const acoes = conta ? acoesPara(conta.status) : [];

  return (
    <div className="pagina">
      <h1>Contas de usuários</h1>

      <form className="admin__filtros" onSubmit={buscar} aria-label="Buscar contas">
        <Campo rotulo="Nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="admin__selecao">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusConta | '')}>
            <option value="">Todos</option>
            {(Object.keys(ROTULO_STATUS) as StatusConta[]).map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
        </label>
        <Botao type="submit" variante="secundaria">
          Buscar
        </Botao>
      </form>

      {erroLista && <Alerta tipo="erro" titulo="Não foi possível carregar as contas" />}
      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhuma conta encontrada" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Contas encontradas" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Tipo</th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} aria-selected={c.id === selecionadaId}>
                  <td>{c.nome}</td>
                  <td>{c.email}</td>
                  <td>{ROTULO_TIPO[c.tipo]}</td>
                  <td>{ROTULO_STATUS[c.status]}</td>
                  <td>
                    <Botao variante="texto" onClick={() => abrir(c.id)} aria-label={`Abrir a conta de ${c.nome}`}>
                      Abrir
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {conta && (
        <Cartao titulo={conta.nome} subtitulo={`${conta.email} · ${ROTULO_TIPO[conta.tipo]}`}>
          {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
          <dl className="admin__detalhes">
            <dt>Status</dt>
            <dd>{ROTULO_STATUS[conta.status]}</dd>
            <dt>Cadastro</dt>
            <dd>{dataHora(conta.dataCadastro)}</dd>
            <dt>E-mail confirmado</dt>
            <dd>{conta.emailConfirmado ? 'Sim' : 'Não'}</dd>
            <dt>Sessões ativas</dt>
            <dd>{conta.sessoesAtivas}</dd>
          </dl>

          {acoes.length === 0 ? (
            <Alerta tipo="info" titulo="Esta conta não pode ser alterada pela administração" />
          ) : (
            <form className="admin__formulario" onSubmit={confirmar} aria-label="Alterar status da conta">
              <label className="admin__selecao">
                Ação
                <select value={acao} onChange={(e) => setAcao(e.target.value as NovoStatus | '')} required>
                  <option value="">Escolha</option>
                  {acoes.map((a) => (
                    <option key={a.valor} value={a.valor}>
                      {a.rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <Campo
                rotulo="Motivo"
                ajuda="Fica registrado na auditoria (RN34)."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                minLength={5}
                required
              />
              <Botao type="submit" carregando={salvando}>
                Confirmar
              </Botao>
            </form>
          )}

          <h2 className="admin__subtitulo">Histórico</h2>
          {conta.historico.length === 0 ? (
            <p>Nenhuma mudança de status registrada.</p>
          ) : (
            <ul className="admin__historico">
              {conta.historico.map((h) => (
                <li key={`${h.dataHora}-${h.acao}`}>
                  <strong>{ROTULO_ACAO[h.acao] ?? h.acao}</strong> em {dataHora(h.dataHora)}
                  {h.motivo ? ` · ${h.motivo}` : ''}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      )}
    </div>
  );
}
