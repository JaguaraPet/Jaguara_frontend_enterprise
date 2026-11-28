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
type Detalhe = components['schemas']['AgendamentoDetalhe'];

/** Data de hoje em Brasília (AAAA-MM-DD), para a aplicação da vacina e o início da receita. */
const hojeBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
const somarDias = (data: string, dias: number) =>
  new Date(new Date(`${data}T12:00:00Z`).getTime() + dias * 86_400_000).toISOString().slice(0, 10);

interface DadosVacina {
  nome: string;
  fabricante: string;
  lote: string;
  proximaDose: string;
}
interface DadosExame {
  tipo: string;
  laboratorio: string;
  resultado: string;
}
interface DadosReceita {
  medicamento: string;
  dosagem: string;
  via: string;
  intervaloHoras: number;
  dias: number;
}

const ATALHOS_DOSE = [
  { rotulo: 'Em 21 dias', dias: 21 },
  { rotulo: 'Em 30 dias', dias: 30 },
  { rotulo: 'Em 1 ano', dias: 365 },
];

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
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [vacina, setVacina] = useState<DadosVacina>({ nome: '', fabricante: '', lote: '', proximaDose: '' });
  const [exame, setExame] = useState<DadosExame>({ tipo: '', laboratorio: '', resultado: '' });
  const [receita, setReceita] = useState<DadosReceita>({ medicamento: '', dosagem: '', via: 'Oral', intervaloHoras: 12, dias: 7 });

  useEffect(() => {
    let ativo = true;
    void api.GET('/agendamentos/{agendamentoId}', { params: { path: { agendamentoId } } }).then(({ data }) => {
      if (!ativo || !data) return;
      setDetalhe(data);
      setItens((atuais) => (atuais.length ? atuais : [{ servicoId: data.servicoId, quantidade: 1, observacao: '' }]));
      if (data.categoria === 'VACINACAO') setVacina((v) => ({ ...v, nome: v.nome || data.servicoNome }));
      if (data.categoria === 'EXAME') setExame((e) => ({ ...e, tipo: e.tipo || data.servicoNome }));
    });
    return () => {
      ativo = false;
    };
  }, [agendamentoId]);

  /**
   * Leva à carteira do pet o que foi feito no atendimento: a vacina (com o selo da clínica e o
   * lembrete da próxima dose), o resultado do exame e a receita (com os lembretes das doses).
   */
  async function registrarSaude(): Promise<string[]> {
    if (!detalhe?.podeRegistrarSaude) return [];
    const petId = detalhe.petId;
    const quem = `${detalhe.profissionalNome ?? 'Equipe'} · ${detalhe.empresaNome}`;
    const hoje = hojeBrasilia();
    const feitos: string[] = [];
    if (detalhe.categoria === 'VACINACAO' && vacina.nome.trim()) {
      const { error } = await api.POST('/pets/{petId}/vacinacoes', {
        params: { path: { petId } },
        body: {
          nomeVacina: vacina.nome.trim(),
          fabricante: vacina.fabricante.trim() || undefined,
          lote: vacina.lote.trim() || undefined,
          dataAplicacao: hoje,
          dataProximaDose: vacina.proximaDose || undefined,
          responsavelAplicacao: quem,
        },
      });
      if (!error) feitos.push(vacina.proximaDose ? 'vacina e lembrete da próxima dose' : 'vacina');
    }
    if (detalhe.categoria === 'EXAME' && exame.tipo.trim()) {
      const { error } = await api.POST('/pets/{petId}/exames', {
        params: { path: { petId } },
        body: {
          tipoExame: exame.tipo.trim(),
          dataRealizacao: hoje,
          laboratorio: exame.laboratorio.trim() || detalhe.empresaNome,
          resultado: exame.resultado.trim() || undefined,
        },
      });
      if (!error) feitos.push('exame');
    }
    if (receita.medicamento.trim() && receita.dosagem.trim()) {
      const { error } = await api.POST('/pets/{petId}/tratamentos', {
        params: { path: { petId } },
        body: {
          medicamento: receita.medicamento.trim(),
          dosagem: receita.dosagem.trim(),
          viaAdministracao: receita.via.trim() || 'Oral',
          intervaloHoras: receita.intervaloHoras,
          dataInicio: hoje,
          dataFim: somarDias(hoje, Math.max(1, receita.dias) - 1),
          // A primeira dose fica para a próxima hora cheia, a partir da saída da clínica.
          horaPrimeiraDose: `${String((new Date(Date.now() - 3 * 3_600_000).getUTCHours() + 1) % 24).padStart(2, '0')}:00`,
          observacoes: `Receitado por ${quem}.`,
        },
      });
      if (!error) feitos.push('receita com os lembretes das doses');
    }
    return feitos;
  }

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
    const feitos = await registrarSaude();
    setAviso({
      tipo: 'sucesso',
      titulo: 'Atendimento registrado',
      mensagem: feitos.length
        ? `Já está na carteira do pet: ${feitos.join(', ')}. O tutor vê no app.`
        : 'O agendamento ficou como realizado.',
    });
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

  const subtitulo = [
    detalhe?.petNome ?? contexto.petNome,
    detalhe?.servicoNome ?? contexto.servicoNome,
    detalhe?.tutorNome,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="pagina">
      <p>
        <Link to="/agenda">‹ Voltar para a agenda</Link>
      </p>
      <h1>Atendimento</h1>
      {subtitulo && <p className="atendimento__contexto">{subtitulo}</p>}
      {detalhe && detalhe.alergias.length > 0 && (
        <Alerta tipo="alerta" titulo={`Atenção: ${detalhe.alergias.join('; ')}`} />
      )}
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

            {detalhe && !detalhe.podeRegistrarSaude && (
              <Alerta
                tipo="info"
                titulo="A carteira de saúde deste pet não está liberada para a clínica"
                mensagem="O atendimento fica registrado. Para a vacina, o exame ou a receita irem direto para o app do tutor, peça a ele para compartilhar o pet com a clínica com edição clínica."
              />
            )}

            {detalhe?.podeRegistrarSaude && detalhe.categoria === 'VACINACAO' && (
              <fieldset className="atendimento__saude">
                <legend>Vacina aplicada · vai para a carteira com o selo da clínica</legend>
                <div className="atendimento__grade">
                  <Campo rotulo="Vacina" value={vacina.nome} onChange={(e) => setVacina({ ...vacina, nome: e.target.value })} />
                  <Campo rotulo="Fabricante" value={vacina.fabricante} onChange={(e) => setVacina({ ...vacina, fabricante: e.target.value })} />
                  <Campo rotulo="Lote" value={vacina.lote} onChange={(e) => setVacina({ ...vacina, lote: e.target.value })} />
                  <Campo
                    rotulo="Próxima dose"
                    type="date"
                    min={hojeBrasilia()}
                    value={vacina.proximaDose}
                    onChange={(e) => setVacina({ ...vacina, proximaDose: e.target.value })}
                  />
                </div>
                <div className="atendimento__atalhos" aria-label="Atalhos para a próxima dose">
                  {ATALHOS_DOSE.map((a) => (
                    <button
                      key={a.dias}
                      type="button"
                      onClick={() => setVacina({ ...vacina, proximaDose: somarDias(hojeBrasilia(), a.dias) })}
                    >
                      {a.rotulo}
                    </button>
                  ))}
                </div>
                <p className="atendimento__nota">O tutor recebe o lembrete da próxima dose um dia antes.</p>
              </fieldset>
            )}

            {detalhe?.podeRegistrarSaude && detalhe.categoria === 'EXAME' && (
              <fieldset className="atendimento__saude">
                <legend>Resultado do exame · vai para a carteira do pet</legend>
                <div className="atendimento__grade">
                  <Campo rotulo="Exame" value={exame.tipo} onChange={(e) => setExame({ ...exame, tipo: e.target.value })} />
                  <Campo
                    rotulo="Laboratório"
                    value={exame.laboratorio}
                    placeholder={detalhe.empresaNome}
                    onChange={(e) => setExame({ ...exame, laboratorio: e.target.value })}
                  />
                </div>
                <label className="admin__selecao">
                  Resultado (opcional, pode ser preenchido depois)
                  <textarea value={exame.resultado} onChange={(e) => setExame({ ...exame, resultado: e.target.value })} rows={3} />
                </label>
              </fieldset>
            )}

            {detalhe?.podeRegistrarSaude && detalhe.categoria !== 'VACINACAO' && (
              <fieldset className="atendimento__saude">
                <legend>Receita (opcional) · vira tratamento com lembretes no app do tutor</legend>
                <div className="atendimento__grade">
                  <Campo rotulo="Medicamento" value={receita.medicamento} onChange={(e) => setReceita({ ...receita, medicamento: e.target.value })} />
                  <Campo
                    rotulo="Dose"
                    placeholder="Ex.: 1 comprimido"
                    value={receita.dosagem}
                    onChange={(e) => setReceita({ ...receita, dosagem: e.target.value })}
                  />
                  <Campo rotulo="Via" value={receita.via} onChange={(e) => setReceita({ ...receita, via: e.target.value })} />
                  <Campo
                    rotulo="A cada (horas)"
                    type="number"
                    min={1}
                    max={72}
                    value={receita.intervaloHoras}
                    onChange={(e) => setReceita({ ...receita, intervaloHoras: Math.max(1, Number(e.target.value)) })}
                  />
                  <Campo
                    rotulo="Por quantos dias"
                    type="number"
                    min={1}
                    max={90}
                    value={receita.dias}
                    onChange={(e) => setReceita({ ...receita, dias: Math.max(1, Number(e.target.value)) })}
                  />
                </div>
              </fieldset>
            )}

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
                  {item.servicoId !== (detalhe?.servicoId ?? contexto.servicoId) && (
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
