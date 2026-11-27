import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import '../admin/admin.css';
import './indicadores.css';
import './atendimento.css';

type Atendimento = components['schemas']['Atendimento'];
type Servico = components['schemas']['Servico'];

/** O que a agenda passa ao abrir a tela (serviço e pet do horário). */
export interface ContextoAgendamento {
  servicoId?: string;
  servicoNome?: string;
  petNome?: string;
  dataHoraInicio?: string;
}

interface Item {
  servicoId: string;
  quantidade: number;
  observacao: string;
}

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Registrar serviços e atendimento (UC-23, RN27, RN28). */
export function RegistrarAtendimento() {
  const { agendamentoId = '' } = useParams();
  const contexto = (useLocation().state ?? {}) as ContextoAgendamento;
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const podeEditar = usuario?.permissoes.includes('atendimento:editar') ?? false;
  const [atendimento, setAtendimento] = useState<Atendimento | null | undefined>(undefined);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [procedimentos, setProcedimentos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<Item[]>(() =>
    contexto.servicoId ? [{ servicoId: contexto.servicoId, quantidade: 1, observacao: '' }] : [],
  );
  const [extra, setExtra] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/agendamentos/{agendamentoId}/atendimento', { params: { path: { agendamentoId } } })
      .then(({ data }) => {
        if (ativo) setAtendimento(data ?? null);
      });
    return () => {
      ativo = false;
    };
  }, [agendamentoId]);

  useEffect(() => {
    if (!empresaId) return;
    void api.GET('/empresas/{empresaId}/servicos', { params: { path: { empresaId } } }).then(({ data }) => {
      setServicos((data ?? []).filter((s) => s.ativo !== false));
    });
  }, [empresaId]);

  const nomeServico = (id?: string) => servicos.find((s) => s.id === id)?.nome ?? (id === contexto.servicoId ? contexto.servicoNome : undefined) ?? 'Serviço';

  function adicionarExtra() {
    if (!extra || itens.some((i) => i.servicoId === extra)) return;
    setItens([...itens, { servicoId: extra, quantidade: 1, observacao: '' }]);
    setExtra('');
  }

  function alterarItem(indice: number, mudanca: Partial<Item>) {
    setItens(itens.map((i, n) => (n === indice ? { ...i, ...mudanca } : i)));
  }

  async function registrar(evento: FormEvent) {
    evento.preventDefault();
    if (itens.length === 0) {
      setAviso({ tipo: 'erro', titulo: 'Inclua ao menos um serviço' });
      return;
    }
    setSalvando(true);
    const { data, error } = await api.POST('/agendamentos/{agendamentoId}/atendimento', {
      params: { path: { agendamentoId } },
      body: {
        procedimentosRealizados: procedimentos,
        observacoesClinicas: observacoes || undefined,
        itens: itens.map((i) => ({
          servicoId: i.servicoId,
          quantidade: i.quantidade,
          observacao: i.observacao || undefined,
        })),
      },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Atendimento não registrado', mensagem: mensagemDoErro(error) });
      return;
    }
    setAtendimento(data);
    setAviso({ tipo: 'sucesso', titulo: 'Atendimento registrado', mensagem: 'O agendamento ficou como realizado.' });
  }

  function abrirEdicao() {
    setProcedimentos(atendimento?.procedimentosRealizados ?? '');
    setObservacoes(atendimento?.observacoesClinicas ?? '');
    setJustificativa('');
    setEditando(true);
  }

  async function salvarEdicao(evento: FormEvent) {
    evento.preventDefault();
    if (!atendimento?.id) return;
    setSalvando(true);
    const { data, error } = await api.PATCH('/atendimentos/{atendimentoId}', {
      params: { path: { atendimentoId: atendimento.id } },
      body: { procedimentosRealizados: procedimentos, observacoesClinicas: observacoes, justificativa },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Alteração não salva', mensagem: mensagemDoErro(error) });
      return;
    }
    setAtendimento(data);
    setEditando(false);
    setAviso({ tipo: 'sucesso', titulo: 'Atendimento alterado', mensagem: 'A alteração foi registrada na auditoria.' });
  }

  const subtitulo = [contexto.petNome, contexto.servicoNome].filter(Boolean).join(' · ');

  return (
    <div className="pagina">
      <p>
        <Link to="/agenda">‹ Voltar para a agenda</Link>
      </p>
      <h1>Atendimento</h1>
      {subtitulo && <p className="atendimento__contexto">{subtitulo}</p>}
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      {atendimento === undefined && <p role="status">Carregando…</p>}

      {atendimento === null &&
        (podeEditar ? (
          <form className="atendimento__formulario" onSubmit={registrar} aria-label="Registrar atendimento">
            <label className="admin__selecao">
              Procedimentos realizados
              <textarea value={procedimentos} onChange={(e) => setProcedimentos(e.target.value)} rows={4} required />
            </label>
            <label className="admin__selecao">
              Observações clínicas (opcional)
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
            </label>

            <fieldset className="atendimento__itens">
              <legend>Serviços cobrados</legend>
              {itens.length === 0 && <p>Nenhum serviço incluído.</p>}
              {itens.map((item, n) => (
                <div key={item.servicoId} className="atendimento__item">
                  <strong>{nomeServico(item.servicoId)}</strong>
                  <Campo
                    rotulo="Quantidade"
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => alterarItem(n, { quantidade: Math.max(1, Number(e.target.value)) })}
                  />
                  <Campo
                    rotulo="Observação"
                    value={item.observacao}
                    onChange={(e) => alterarItem(n, { observacao: e.target.value })}
                  />
                  {item.servicoId !== contexto.servicoId && (
                    <Botao variante="texto" onClick={() => setItens(itens.filter((_, i) => i !== n))}>
                      Tirar
                    </Botao>
                  )}
                </div>
              ))}
              <div className="atendimento__extra">
                <label className="admin__selecao">
                  Serviço extra
                  <select value={extra} onChange={(e) => setExtra(e.target.value)}>
                    <option value="">Escolha</option>
                    {servicos
                      .filter((s) => !itens.some((i) => i.servicoId === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome} · {reais(s.preco)}
                        </option>
                      ))}
                  </select>
                </label>
                <Botao variante="secundaria" onClick={adicionarExtra} disabled={!extra}>
                  Incluir
                </Botao>
              </div>
            </fieldset>

            <Botao type="submit" carregando={salvando}>
              Registrar atendimento
            </Botao>
          </form>
        ) : (
          <Alerta tipo="info" titulo="Atendimento ainda não registrado" />
        ))}

      {atendimento && !editando && (
        <Cartao
          titulo="Atendimento finalizado"
          subtitulo={atendimento.finalizadoEm ? new Date(atendimento.finalizadoEm).toLocaleString('pt-BR') : undefined}
        >
          <dl className="admin__detalhes">
            <dt>Procedimentos</dt>
            <dd>{atendimento.procedimentosRealizados}</dd>
            <dt>Observações</dt>
            <dd>{atendimento.observacoesClinicas || '-'}</dd>
          </dl>
          <table className="relatorios__tabela">
            <thead>
              <tr>
                <th scope="col">Serviço</th>
                <th scope="col">Quantidade</th>
                <th scope="col">Valor unitário</th>
              </tr>
            </thead>
            <tbody>
              {(atendimento.itens ?? []).map((i) => (
                <tr key={i.servicoId}>
                  <td>{nomeServico(i.servicoId)}</td>
                  <td>{i.quantidade}</td>
                  <td>{reais(i.valorUnitario ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="atendimento__total">
            Total: <strong>{reais(atendimento.total ?? 0)}</strong>
          </p>
          {podeEditar && (
            <Botao variante="secundaria" onClick={abrirEdicao}>
              Alterar registro
            </Botao>
          )}
        </Cartao>
      )}

      {atendimento && editando && (
        <Cartao titulo="Alterar registro" subtitulo="Toda alteração depois de finalizado fica na auditoria.">
          <form className="atendimento__formulario" onSubmit={salvarEdicao} aria-label="Alterar atendimento">
            <label className="admin__selecao">
              Procedimentos realizados
              <textarea value={procedimentos} onChange={(e) => setProcedimentos(e.target.value)} rows={4} required />
            </label>
            <label className="admin__selecao">
              Observações clínicas
              <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={3} />
            </label>
            <Campo
              rotulo="Justificativa"
              ajuda="Pelo menos 10 caracteres."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              minLength={10}
              required
            />
            <div className="admin__acoes">
              <Botao type="submit" carregando={salvando}>
                Salvar alteração
              </Botao>
              <Botao variante="texto" onClick={() => setEditando(false)}>
                Cancelar
              </Botao>
            </div>
          </form>
        </Cartao>
      )}
    </div>
  );
}
