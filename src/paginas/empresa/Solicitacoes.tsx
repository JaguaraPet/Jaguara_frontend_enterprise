import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';
import '../admin/admin.css';
import './indicadores.css';
import './solicitacoes.css';

type Solicitacao = components['schemas']['Solicitacao'];
type Status = components['schemas']['StatusSolicitacao'];
type Opcao = { id: string; nome: string };
type Aviso = { tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string };

const STATUS: Record<Status, string> = {
  PENDENTE: 'Pendentes',
  ACEITA: 'Aceitas',
  RECUSADA: 'Recusadas',
  CANCELADA: 'Canceladas',
  CONCLUIDA: 'Concluídas',
  ENCERRADA: 'Encerradas',
};

const dataHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/** Uma solicitação pendente: aceitar (com profissional e recurso opcionais) ou recusar com o motivo. */
function Pedido({
  s,
  profissionais,
  recursos,
  aoResponder,
}: {
  s: Solicitacao;
  profissionais: Opcao[];
  recursos: Opcao[];
  aoResponder: (aviso: Aviso) => void;
}) {
  const [profissionalId, setProfissionalId] = useState('');
  const [recursoId, setRecursoId] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const titulo = `${s.servico ?? 'Serviço'} · ${s.pet ?? 'Pet'}`;

  async function aceitar() {
    setEnviando(true);
    const { error } = await api.POST('/solicitacoes/{solicitacaoId}/aceite', {
      params: { path: { solicitacaoId: s.id! } },
      body: { ...(profissionalId ? { profissionalId } : {}), ...(recursoId ? { recursoId } : {}) },
    });
    setEnviando(false);
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    aoResponder({ tipo: 'sucesso', titulo: `${titulo} aceito`, mensagem: 'O agendamento entrou na agenda e o tutor recebeu o aviso.' });
  }

  async function recusar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    const { error } = await api.POST('/solicitacoes/{solicitacaoId}/recusa', {
      params: { path: { solicitacaoId: s.id! } },
      body: { motivo: motivo.trim() },
    });
    setEnviando(false);
    if (error) {
      setErro(mensagemDoErro(error));
      return;
    }
    aoResponder({ tipo: 'sucesso', titulo: `${titulo} recusado`, mensagem: 'O tutor recebeu o motivo por e-mail.' });
  }

  return (
    <Cartao titulo={titulo} subtitulo={`${dataHora(s.dataHoraDesejada)} · ${s.tutor ?? 'Tutor'}`}>
      {s.observacoes && <p className="solicitacoes__obs">“{s.observacoes}”</p>}
      {erro && <Alerta tipo="erro" titulo="Resposta não registrada" mensagem={erro} />}
      {!recusando ? (
        <div className="solicitacoes__aceite">
          <label className="admin__selecao">
            Profissional
            <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
              <option value="">Sem profissional definido</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
          {recursos.length > 0 && (
            <label className="admin__selecao">
              Recurso
              <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)}>
                <option value="">Sem recurso</option>
                {recursos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="admin__acoes">
            <Botao carregando={enviando} onClick={() => void aceitar()}>
              Aceitar
            </Botao>
            <Botao variante="secundaria" onClick={() => setRecusando(true)}>
              Recusar
            </Botao>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void recusar(e)} aria-label={`Recusar ${titulo}`} className="solicitacoes__recusa">
          <label htmlFor={`motivo-${s.id}`}>Motivo da recusa (vai para o tutor)</label>
          <textarea
            id={`motivo-${s.id}`}
            rows={2}
            maxLength={500}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: não temos horário nesse dia; sugerimos quinta às 10h."
          />
          {/* CT-41-02: sem motivo não há recusa. */}
          <div className="admin__acoes">
            <Botao type="submit" variante="perigo" carregando={enviando} disabled={motivo.trim().length < 3}>
              Confirmar recusa
            </Botao>
            <Botao variante="texto" onClick={() => setRecusando(false)}>
              Voltar
            </Botao>
          </div>
        </form>
      )}
    </Cartao>
  );
}

/** Solicitações de agendamento dos tutores (UC-41): a empresa aceita ou recusa os pedidos. */
export function Solicitacoes() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [status, setStatus] = useState<Status>('PENDENTE');
  const [lista, setLista] = useState<Solicitacao[] | null>(null);
  const [profissionais, setProfissionais] = useState<Opcao[]>([]);
  const [recursos, setRecursos] = useState<Opcao[]>([]);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!empresaId) return;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/funcionarios', caminho).catch(() => ({ data: undefined })),
      api.GET('/empresas/{empresaId}/recursos', caminho).catch(() => ({ data: undefined })),
    ]).then(([f, r]) => {
      setProfissionais((f.data ?? []).filter((x) => x.ativo !== false).map((x) => ({ id: x.id!, nome: x.nome! })));
      setRecursos((r.data ?? []).filter((x) => x.ativo !== false).map((x) => ({ id: x.id!, nome: x.nome })));
    });
  }, [empresaId]);

  useEffect(() => {
    let ativo = true;
    void api.GET('/solicitacoes', { params: { query: { status } } }).then(({ data }) => {
      if (ativo) setLista(data ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [status, versao]);

  function respondida(a: Aviso) {
    setAviso(a);
    setVersao((v) => v + 1);
  }

  return (
    <div className="pagina">
      <h1>Solicitações</h1>
      <div className="admin__filtros" role="group" aria-label="Situação">
        {(Object.keys(STATUS) as Status[]).map((s) => (
          <Botao
            key={s}
            variante={s === status ? 'primaria' : 'texto'}
            aria-pressed={s === status}
            onClick={() => {
              setAviso(null);
              setLista(null);
              setStatus(s);
            }}
          >
            {STATUS[s]}
          </Botao>
        ))}
      </div>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}
      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <Alerta
          tipo="info"
          titulo={status === 'PENDENTE' ? 'Nenhum pedido esperando resposta' : `Nenhuma solicitação ${STATUS[status].toLowerCase()}`}
        />
      ) : status === 'PENDENTE' ? (
        <div className="solicitacoes">
          {lista.map((s) => (
            <Pedido key={s.id} s={s} profissionais={profissionais} recursos={recursos} aoResponder={respondida} />
          ))}
        </div>
      ) : (
        <table className="relatorios__tabela">
          <thead>
            <tr>
              <th scope="col">Data desejada</th>
              <th scope="col">Serviço</th>
              <th scope="col">Pet</th>
              <th scope="col">Tutor</th>
              {status === 'RECUSADA' && <th scope="col">Motivo</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((s) => (
              <tr key={s.id}>
                <td>{dataHora(s.dataHoraDesejada)}</td>
                <td>{s.servico}</td>
                <td>{s.pet}</td>
                <td>{s.tutor}</td>
                {status === 'RECUSADA' && <td>{s.motivoRecusa}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
