import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { mensagemDoErro } from '../admin/erros';
import './hoje.css';

type Resumo = components['schemas']['ResumoDoDia'];
type ItemAgenda = Resumo['agenda'][number];
type Pedido = Resumo['solicitacoes']['itens'][number];

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const diaHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
const reais = (valor: string | null | undefined) =>
  Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataLonga = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
const dataCurta = (data: string) =>
  new Date(`${data}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

function saudacao(): string {
  const h = Number(
    new Date().toLocaleString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }),
  );
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const ICONE_ESPECIE: Record<string, string> = {
  Cachorro: '🐶',
  Gato: '🐱',
  Ave: '🐦',
  Roedor: '🐹',
  Coelho: '🐰',
  Réptil: '🦎',
  Peixe: '🐟',
};

function situacao(item: ItemAgenda): { rotulo: string; classe: string } {
  if (item.status === 'CANCELADO') return { rotulo: 'Cancelado', classe: 'cancelado' };
  if (item.status === 'NAO_COMPARECEU') return { rotulo: 'Não veio', classe: 'faltou' };
  if (item.atendimentoStatus === 'EM_ANDAMENTO') return { rotulo: 'Em atendimento', classe: 'andamento' };
  if (item.status === 'REALIZADO' || item.atendimentoStatus === 'FINALIZADO') {
    return item.pago === false
      ? { rotulo: 'Atendido · a receber', classe: 'receber' }
      : { rotulo: 'Atendido', classe: 'feito' };
  }
  return new Date(item.inicio) <= new Date()
    ? { rotulo: 'Aguardando', classe: 'aguardando' }
    : { rotulo: 'Agendado', classe: 'agendado' };
}

/** Telefone em link de WhatsApp com a mensagem pronta para lembrar da vacina. */
function linkWhatsApp(telefone: string, tutor: string | null, pet: string, vacina: string) {
  const numero = telefone.replace(/\D/g, '');
  const texto = `Olá${tutor ? `, ${tutor.split(' ')[0]}` : ''}! A ${vacina} do ${pet} está chegando. Quer agendar?`;
  return `https://wa.me/55${numero}?text=${encodeURIComponent(texto)}`;
}

function CartaoPedido({ pedido, aoResponder }: { pedido: Pedido; aoResponder: (texto: string) => void }) {
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function aceitar() {
    setEnviando(true);
    const { error } = await api.POST('/solicitacoes/{solicitacaoId}/aceite', {
      params: { path: { solicitacaoId: pedido.id } },
      body: {},
    });
    setEnviando(false);
    if (error) return setErro(mensagemDoErro(error));
    aoResponder(`${pedido.servicoNome} do ${pedido.petNome} entrou na agenda. O tutor foi avisado.`);
  }

  async function recusar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    const { error } = await api.POST('/solicitacoes/{solicitacaoId}/recusa', {
      params: { path: { solicitacaoId: pedido.id } },
      body: { motivo: motivo.trim() },
    });
    setEnviando(false);
    if (error) return setErro(mensagemDoErro(error));
    aoResponder(`Pedido do ${pedido.petNome} recusado. O tutor recebeu o motivo.`);
  }

  return (
    <li className="hoje-pedido">
      <div className="hoje-pedido__topo">
        <strong>
          {pedido.servicoNome} · {pedido.petNome}
        </strong>
        <span>{diaHora(pedido.dataHoraDesejada)}</span>
      </div>
      <p className="hoje-pedido__tutor">{pedido.tutorNome}</p>
      {pedido.observacoes && <p className="hoje-pedido__obs">“{pedido.observacoes}”</p>}
      {erro && <Alerta tipo="erro" titulo={erro} />}
      {recusando ? (
        <form className="hoje-pedido__recusa" onSubmit={(e) => void recusar(e)}>
          <label>
            Motivo para o tutor
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: sem horário nesse dia, pode ser na sexta?"
              required
              minLength={3}
            />
          </label>
          <div className="hoje-pedido__acoes">
            <Botao type="submit" variante="perigo" carregando={enviando}>
              Recusar
            </Botao>
            <Botao variante="texto" onClick={() => setRecusando(false)}>
              Voltar
            </Botao>
          </div>
        </form>
      ) : (
        <div className="hoje-pedido__acoes">
          <Botao carregando={enviando} onClick={() => void aceitar()}>
            Aceitar
          </Botao>
          <Botao variante="secundaria" onClick={() => setRecusando(true)}>
            Recusar
          </Botao>
        </div>
      )}
    </li>
  );
}

/**
 * Tela inicial da empresa: o dia da clínica num lugar só. Agenda de hoje por horário, pedidos
 * para responder ali mesmo, quem avisar sobre vacina e o que falta receber.
 */
export function Hoje() {
  const usuario = useUsuario();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const empresaId = usuario?.empresaId;
  const [versao, setVersao] = useState(0);
  const carregar = () => setVersao((v) => v + 1);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}/hoje', { params: { path: { empresaId } } })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setErro(mensagemDoErro(error));
        else setResumo(data);
      });
    return () => {
      ativo = false;
    };
  }, [empresaId, versao]);

  if (erro) return <Alerta tipo="erro" titulo="Não foi possível carregar o dia" mensagem={erro} />;
  if (!resumo) {
    return (
      <p className="carregando" role="status">
        Carregando o dia…
      </p>
    );
  }

  const ativos = resumo.agenda.filter((a) => a.status !== 'CANCELADO');
  const atendidos = ativos.filter((a) => a.status === 'REALIZADO').length;
  const proximo = ativos.find((a) => a.status === 'AGENDADO' && new Date(a.fim) > new Date());

  return (
    <div className="pagina hoje">
      <header className="hoje__cabecalho">
        <div>
          <p className="hoje__data">{dataLonga(resumo.data)}</p>
          <h1>{saudacao()}! Este é o dia da clínica.</h1>
        </div>
        <Link className="hoje__novo" to="/agenda/novo">
          + Novo agendamento
        </Link>
      </header>

      {aviso && <Alerta tipo="sucesso" titulo={aviso} />}

      <section className="hoje__numeros" aria-label="Números do dia">
        <div className="hoje-numero">
          <span className="hoje-numero__valor">{ativos.length}</span>
          <span className="hoje-numero__rotulo">
            atendimentos hoje · {atendidos} {atendidos === 1 ? 'feito' : 'feitos'}
          </span>
        </div>
        <Link className="hoje-numero hoje-numero--link" to="/solicitacoes">
          <span className="hoje-numero__valor">{resumo.solicitacoes.total}</span>
          <span className="hoje-numero__rotulo">
            {resumo.solicitacoes.total === 1 ? 'pedido esperando resposta' : 'pedidos esperando resposta'}
          </span>
        </Link>
        {resumo.cobrancas && (
          <Link className="hoje-numero hoje-numero--link" to="/pagamentos">
            <span className="hoje-numero__valor">{reais(resumo.cobrancas.valor)}</span>
            <span className="hoje-numero__rotulo">a receber · {resumo.cobrancas.total} em aberto</span>
          </Link>
        )}
        {resumo.semana.faturamento !== null && (
          <div className="hoje-numero">
            <span className="hoje-numero__valor">{reais(resumo.semana.faturamento)}</span>
            <span className="hoje-numero__rotulo">
              recebidos em 7 dias · {resumo.semana.atendimentos} atendimentos
            </span>
          </div>
        )}
      </section>

      <div className="hoje__colunas">
        <section className="hoje-bloco" aria-labelledby="titulo-agenda">
          <div className="hoje-bloco__topo">
            <h2 id="titulo-agenda">Agenda de hoje</h2>
            <Link to="/agenda">Ver a semana</Link>
          </div>
          {proximo && (
            <p className="hoje__proximo">
              Próximo: <strong>{proximo.petNome}</strong> às {hora(proximo.inicio)}, {proximo.servicoNome.toLowerCase()}
              {proximo.profissionalNome ? ` com ${proximo.profissionalNome}` : ''}.
            </p>
          )}
          {ativos.length === 0 ? (
            <div className="hoje-vazio">
              <p>Nenhum atendimento marcado para hoje.</p>
              <Link to="/agenda/novo">Agendar um cliente</Link>
            </div>
          ) : (
            <ol className="hoje-agenda">
              {resumo.agenda.map((item) => {
                const s = situacao(item);
                return (
                  <li key={item.id} className={`hoje-item hoje-item--${s.classe}`}>
                    <time className="hoje-item__hora" dateTime={item.inicio}>
                      {hora(item.inicio)}
                    </time>
                    <div className="hoje-item__corpo">
                      <p className="hoje-item__pet">
                        <span aria-hidden="true">{ICONE_ESPECIE[item.especie] ?? '🐾'}</span>{' '}
                        <Link to={`/pets/${item.petId}`}>{item.petNome}</Link>
                        {item.tutorNome && <span className="hoje-item__tutor"> · {item.tutorNome}</span>}
                      </p>
                      <p className="hoje-item__servico">
                        {item.servicoNome}
                        {item.profissionalNome && ` · ${item.profissionalNome}`}
                        {item.recursoNome && ` · ${item.recursoNome}`}
                      </p>
                      {item.alergias.length > 0 && (
                        <p className="hoje-item__alergia">
                          <span aria-hidden="true">⚠</span> {item.alergias.join('; ')}
                        </p>
                      )}
                    </div>
                    <div className="hoje-item__lado">
                      <span className={`hoje-situacao hoje-situacao--${s.classe}`}>{s.rotulo}</span>
                      {item.status === 'AGENDADO' && (
                        <Link className="hoje-item__acao" to={`/agenda/${item.id}/atendimento`}>
                          Atender
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="hoje__lateral">
          <section className="hoje-bloco" aria-labelledby="titulo-pedidos">
            <div className="hoje-bloco__topo">
              <h2 id="titulo-pedidos">Pedidos de agendamento</h2>
              {resumo.solicitacoes.total > resumo.solicitacoes.itens.length && (
                <Link to="/solicitacoes">Ver todos ({resumo.solicitacoes.total})</Link>
              )}
            </div>
            {resumo.solicitacoes.itens.length === 0 ? (
              <p className="hoje-vazio">Nenhum pedido esperando. Os novos aparecem aqui na hora.</p>
            ) : (
              <ul className="hoje-pedidos">
                {resumo.solicitacoes.itens.map((p) => (
                  <CartaoPedido
                    key={p.id}
                    pedido={p}
                    aoResponder={(texto) => {
                      setAviso(texto);
                      carregar();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="hoje-bloco" aria-labelledby="titulo-vacinas">
            <div className="hoje-bloco__topo">
              <h2 id="titulo-vacinas">Vacinas para avisar</h2>
            </div>
            {resumo.vacinas.length === 0 ? (
              <p className="hoje-vazio">Nenhum cliente com vacina atrasada ou vencendo neste mês.</p>
            ) : (
              <ul className="hoje-lista">
                {resumo.vacinas.map((v) => (
                  <li key={`${v.petId}-${v.vacina}`}>
                    <div>
                      <strong>{v.petNome}</strong> · {v.vacina}
                      <span className={v.atrasada ? 'hoje-lista__atrasada' : 'hoje-lista__data'}>
                        {v.atrasada ? `atrasada desde ${dataCurta(v.proximaDose)}` : `vence em ${dataCurta(v.proximaDose)}`}
                      </span>
                      {v.tutorNome && <span className="hoje-lista__quem">{v.tutorNome}</span>}
                    </div>
                    {v.tutorTelefone && (
                      <a
                        className="hoje-lista__whats"
                        href={linkWhatsApp(v.tutorTelefone, v.tutorNome, v.petNome, v.vacina)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Avisar
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {resumo.cobrancas && resumo.cobrancas.total > 0 && (
            <section className="hoje-bloco" aria-labelledby="titulo-cobrancas">
              <div className="hoje-bloco__topo">
                <h2 id="titulo-cobrancas">Cobranças em aberto</h2>
                <Link to="/pagamentos">Pagamentos</Link>
              </div>
              <ul className="hoje-lista">
                {resumo.cobrancas.itens.map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.petNome ?? c.tutorNome}</strong> · {c.descricao}
                      <span className="hoje-lista__quem">{c.tutorNome}</span>
                    </div>
                    <span className="hoje-lista__valor">{reais(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
