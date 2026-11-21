import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { diaDoInstante, diasDaSemana, hora, inicioDaSemana, rotuloDia, rotuloSemana, somarDias } from './semana';
import './agenda.css';

type Agendamento = components['schemas']['Agendamento'] & {
  servicoNome?: string;
  petNome?: string;
  profissionalNome?: string;
  recursoNome?: string;
};
type Solicitacao = components['schemas']['Solicitacao'];
interface Opcao {
  id: string;
  nome: string;
}

const STATUS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CANCELADO: 'Cancelado',
  REALIZADO: 'Realizado',
  NAO_COMPARECEU: 'Não compareceu',
};

/**
 * Agenda semanal da empresa (UC-24): segunda a domingo, com filtro por profissional ou
 * recurso e os pedidos que ainda esperam resposta.
 */
export function Agenda({ hoje: hojeTeste }: { hoje?: Date }) {
  const [hoje] = useState(() => hojeTeste ?? new Date());
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [segunda, setSegunda] = useState(() => inicioDaSemana(hoje));
  const [profissionalId, setProfissionalId] = useState('');
  const [recursoId, setRecursoId] = useState('');
  const [profissionais, setProfissionais] = useState<Opcao[]>([]);
  const [recursos, setRecursos] = useState<Opcao[]>([]);
  const [agenda, setAgenda] = useState<{ agendamentos: Agendamento[]; pendentes: Solicitacao[] } | null>(null);
  const [erro, setErro] = useState(false);

  // Opções dos filtros: só as que o perfil pode ver.
  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/funcionarios', caminho).catch(() => ({ data: undefined })),
      api.GET('/empresas/{empresaId}/recursos', caminho).catch(() => ({ data: undefined })),
    ]).then(([funcionarios, lista]) => {
      if (!ativo) return;
      setProfissionais(
        (funcionarios.data ?? [])
          .filter((f) => f.ativo !== false)
          .map((f) => ({ id: f.id ?? '', nome: f.nome ?? '' })),
      );
      setRecursos(
        (lista.data ?? []).filter((r) => r.ativo !== false).map((r) => ({ id: r.id ?? '', nome: r.nome ?? '' })),
      );
    });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}/agenda', {
        params: {
          path: { empresaId },
          query: { semana: segunda, profissionalId: profissionalId || undefined, recursoId: recursoId || undefined },
        },
      })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErro(!!error);
        setAgenda({
          agendamentos: (data?.agendamentos ?? []) as Agendamento[],
          pendentes: data?.solicitacoesPendentes ?? [],
        });
      });
    return () => {
      ativo = false;
    };
  }, [empresaId, segunda, profissionalId, recursoId]);

  const dias = diasDaSemana(segunda);

  return (
    <div className="pagina">
      <h1>Agenda</h1>
      <div className="agenda__barra">
        <Botao variante="secundaria" onClick={() => setSegunda(somarDias(segunda, -7))} aria-label="Semana anterior">
          ‹ Anterior
        </Botao>
        <p className="agenda__semana" aria-live="polite">
          Semana de {rotuloSemana(segunda)}
        </p>
        <Botao variante="secundaria" onClick={() => setSegunda(somarDias(segunda, 7))} aria-label="Próxima semana">
          Próxima ›
        </Botao>
        <Botao variante="texto" onClick={() => setSegunda(inicioDaSemana(hoje))}>
          Hoje
        </Botao>
      </div>

      <div className="agenda__filtros">
        {profissionais.length > 0 && (
          <label>
            Profissional
            <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
              <option value="">Todos</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        {recursos.length > 0 && (
          <label>
            Recurso
            <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)}>
              <option value="">Todos</option>
              {recursos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nome}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {erro && <Alerta tipo="erro" titulo="Não foi possível carregar a agenda" />}
      {agenda === null ? (
        <p role="status">Carregando…</p>
      ) : (
        <>
          {agenda.pendentes.length > 0 && (
            <Alerta
              tipo="alerta"
              titulo={
                agenda.pendentes.length === 1
                  ? '1 pedido de agendamento espera resposta'
                  : `${agenda.pendentes.length} pedidos de agendamento esperam resposta`
              }
              mensagem="Responda em Solicitações para o horário entrar na agenda."
            />
          )}
          {agenda.pendentes.length > 0 && <Link to="/solicitacoes">Ver solicitações</Link>}
          <div className="agenda__dias">
            {dias.map((dia) => {
              const doDia = agenda.agendamentos.filter((a) => a.dataHoraInicio && diaDoInstante(a.dataHoraInicio) === dia);
              return (
                <section key={dia} className="agenda__dia" aria-label={rotuloDia(dia)}>
                  <h2>{rotuloDia(dia)}</h2>
                  {doDia.length === 0 ? (
                    <p className="agenda__vazio">Livre</p>
                  ) : (
                    <ul>
                      {doDia.map((a) => (
                        <li key={a.id} className={`agenda__item agenda__item--${(a.status ?? '').toLowerCase()}`}>
                          <span className="agenda__hora">
                            {hora(a.dataHoraInicio!)}
                            {a.dataHoraFim && ` às ${hora(a.dataHoraFim)}`}
                          </span>
                          <strong>{a.servicoNome ?? 'Serviço'}</strong>
                          <span>{a.petNome ?? 'Pet'}</span>
                          {(a.profissionalNome || a.recursoNome) && (
                            <span className="agenda__detalhe">
                              {[a.profissionalNome, a.recursoNome].filter(Boolean).join(' · ')}
                            </span>
                          )}
                          <span className="agenda__status">{STATUS[a.status ?? ''] ?? a.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
