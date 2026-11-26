import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from './erros';
import './admin.css';
import './logs.css';

type Resumo = components['schemas']['ChamadoResumo'];
type Detalhe = components['schemas']['ChamadoDetalhe'];
type Status = components['schemas']['StatusChamado'];
type Acao = '' | 'intervir' | 'pedir';
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const ROTULO: Record<Status, string> = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  AGUARDANDO_INFORMACAO: 'Aguardando informação',
  RESOLVIDO: 'Resolvido',
  FECHADO: 'Fechado',
};
const TIPO: Record<Resumo['solicitante']['tipo'], string> = {
  TUTOR: 'Tutor',
  EMPRESA: 'Empresa',
  FUNCIONARIO: 'Funcionário',
  ADMINISTRADOR: 'Administrador',
};
const dataHora = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** Central de suporte (UC-26): analisa o chamado, registra a intervenção ou pede informação (RN32). */
export function Chamados() {
  const [status, setStatus] = useState<Status | ''>('ABERTO');
  const [lista, setLista] = useState<Resumo[] | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [chamado, setChamado] = useState<Detalhe | null>(null);
  const [acao, setAcao] = useState<Acao>('');
  const [acaoExecutada, setAcaoExecutada] = useState('');
  const [descricao, setDescricao] = useState('');
  const [novoStatus, setNovoStatus] = useState<'EM_ANALISE' | 'RESOLVIDO' | 'FECHADO'>('RESOLVIDO');
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.GET('/admin/chamados', { params: { query: status ? { status } : {} } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [status, versao]);

  useEffect(() => {
    if (!selecionadoId) return;
    let ativo = true;
    void api.GET('/admin/chamados/{chamadoId}', { params: { path: { chamadoId: selecionadoId } } }).then(({ data }) => {
      if (ativo) setChamado(data ?? null);
    });
    return () => {
      ativo = false;
    };
  }, [selecionadoId, versao]);

  function abrir(id: string) {
    setSelecionadoId(id);
    setChamado(null);
    setAcao('');
    setAviso(null);
  }

  function escolher(a: Acao) {
    setAcao(a);
    setAcaoExecutada('');
    setDescricao('');
    setNovoStatus('RESOLVIDO');
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    if (!chamado) return;
    setSalvando(true);
    const caminho = { params: { path: { chamadoId: chamado.id } } };
    const { error } =
      acao === 'pedir'
        ? await api.POST('/admin/chamados/{chamadoId}/pedido-informacao', { ...caminho, body: { mensagem: descricao } })
        : await api.POST('/admin/chamados/{chamadoId}/intervencoes', {
            ...caminho,
            body: { acaoExecutada, descricao, status: novoStatus },
          });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Nada foi registrado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAviso({
      tipo: 'sucesso',
      titulo: acao === 'pedir' ? 'Pedido de informação enviado' : 'Intervenção registrada',
      mensagem: `${chamado.solicitante.nome} recebe o aviso por e-mail, e a ação ficou na auditoria.`,
    });
    setAcao('');
    setVersao((v) => v + 1);
  }

  const podeAgir = chamado && chamado.status !== 'FECHADO';

  return (
    <div className="pagina">
      <h1>Chamados de suporte</h1>
      <label className="admin__selecao">
        Situação
        <select
          value={status}
          onChange={(e) => {
            setLista(null);
            setStatus(e.target.value as Status | '');
          }}
        >
          <option value="">Todos</option>
          {(Object.keys(ROTULO) as Status[]).map((s) => (
            <option key={s} value={s}>
              {ROTULO[s]}
            </option>
          ))}
        </select>
      </label>

      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta tipo="info" titulo="Nenhum chamado nesta situação" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Chamados" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Protocolo</th>
                <th scope="col">Título</th>
                <th scope="col">Solicitante</th>
                <th scope="col">Aberto em</th>
                <th scope="col">Situação</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} aria-selected={c.id === selecionadoId}>
                  <td>{c.protocolo}</td>
                  <td>{c.titulo}</td>
                  <td>
                    {c.solicitante.nome} ({TIPO[c.solicitante.tipo]})
                  </td>
                  <td>{dataHora(c.dataAbertura)}</td>
                  <td>{ROTULO[c.status]}</td>
                  <td>
                    <Botao variante="texto" onClick={() => abrir(c.id)} aria-label={`Abrir o chamado ${c.protocolo}`}>
                      Abrir
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chamado && (
        <Cartao titulo={`${chamado.protocolo} · ${chamado.titulo}`} subtitulo={`${chamado.solicitante.nome} · ${chamado.solicitante.email}`}>
          {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
          <dl className="admin__detalhes">
            <dt>Situação</dt>
            <dd>{ROTULO[chamado.status]}</dd>
            <dt>Aberto em</dt>
            <dd>{dataHora(chamado.dataAbertura)}</dd>
            {chamado.atendente && (
              <>
                <dt>Atendente</dt>
                <dd>{chamado.atendente}</dd>
              </>
            )}
          </dl>
          <p className="admin__descricao">{chamado.descricao}</p>

          <h2 className="admin__subtitulo">Intervenções</h2>
          {chamado.intervencoes.length === 0 ? (
            <p>Nenhuma intervenção ainda.</p>
          ) : (
            <ol className="admin__historico">
              {chamado.intervencoes.map((i) => (
                <li key={`${i.dataHora}-${i.acaoExecutada}`}>
                  <strong>{i.acaoExecutada}</strong> · {dataHora(i.dataHora)} · {i.autor}
                  <br />
                  {i.descricao}
                </li>
              ))}
            </ol>
          )}

          {podeAgir && !acao && (
            <div className="admin__acoes">
              <Botao onClick={() => escolher('intervir')}>Registrar intervenção</Botao>
              <Botao variante="secundaria" onClick={() => escolher('pedir')}>
                Pedir informação
              </Botao>
            </div>
          )}
          {podeAgir && acao && (
            <form className="admin__formulario" onSubmit={(e) => void registrar(e)} aria-label={acao === 'pedir' ? 'Pedir informação' : 'Registrar intervenção'}>
              {acao === 'intervir' && (
                <>
                  <Campo rotulo="Ação executada" value={acaoExecutada} onChange={(e) => setAcaoExecutada(e.target.value)} maxLength={255} required />
                  <label className="admin__selecao">
                    Nova situação
                    <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value as typeof novoStatus)}>
                      <option value="EM_ANALISE">Em análise</option>
                      <option value="RESOLVIDO">Resolvido</option>
                      <option value="FECHADO">Fechado</option>
                    </select>
                  </label>
                </>
              )}
              <label className="admin__selecao" htmlFor="chamado-texto">
                {acao === 'pedir' ? 'O que falta para resolver' : 'O que foi feito'}
              </label>
              <textarea id="chamado-texto" rows={3} maxLength={2000} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              <div className="admin__acoes">
                <Botao
                  type="submit"
                  carregando={salvando}
                  disabled={descricao.trim().length < 5 || (acao === 'intervir' && acaoExecutada.trim().length < 3)}
                >
                  {acao === 'pedir' ? 'Enviar pedido' : 'Registrar'}
                </Botao>
                <Botao variante="texto" onClick={() => setAcao('')}>
                  Cancelar
                </Botao>
              </div>
            </form>
          )}
        </Cartao>
      )}
    </div>
  );
}
