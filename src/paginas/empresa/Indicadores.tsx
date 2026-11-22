import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { paths } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { useUsuario } from '../../sessao/useUsuario';
import './indicadores.css';

type Resposta = paths['/empresas/{empresaId}/indicadores']['get']['responses']['200']['content']['application/json'];
type Indicador = 'atendimentos' | 'faturamento' | 'taxaAceite' | 'servicos' | 'porDia';

const INDICADORES: { valor: Indicador; rotulo: string }[] = [
  { valor: 'atendimentos', rotulo: 'Atendimentos realizados' },
  { valor: 'faturamento', rotulo: 'Faturamento' },
  { valor: 'taxaAceite', rotulo: 'Taxa de aceite' },
  { valor: 'servicos', rotulo: 'Serviços mais pedidos' },
  { valor: 'porDia', rotulo: 'Atendimentos por dia' },
];

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const diaMes = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

/** Primeiro e último dia do mês da data, em AAAA-MM-DD. */
function mesDe(hoje: Date): { de: string; ate: string } {
  const a = hoje.getFullYear();
  const m = hoje.getMonth();
  const doisDigitos = (n: number) => String(n).padStart(2, '0');
  const ultimo = new Date(a, m + 1, 0).getDate();
  return { de: `${a}-${doisDigitos(m + 1)}-01`, ate: `${a}-${doisDigitos(m + 1)}-${doisDigitos(ultimo)}` };
}

/** Indicadores de BI da empresa (UC-17, RN21): a empresa escolhe o que ver no período. */
export function Indicadores({ hoje: hojeTeste }: { hoje?: Date }) {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [inicial] = useState(() => mesDe(hojeTeste ?? new Date()));
  const [de, setDe] = useState(inicial.de);
  const [ate, setAte] = useState(inicial.ate);
  const [periodo, setPeriodo] = useState(inicial);
  const [escolhidos, setEscolhidos] = useState<Indicador[]>(INDICADORES.map((i) => i.valor));
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}/indicadores', {
        params: { path: { empresaId }, query: periodo },
      })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErro(error ? mensagemDoErro(error) : null);
        setDados(data ?? null);
      });
    return () => {
      ativo = false;
    };
  }, [empresaId, periodo]);

  function aplicar(evento: FormEvent) {
    evento.preventDefault();
    setDados(null);
    setPeriodo({ de, ate });
  }

  function alternar(indicador: Indicador) {
    setEscolhidos((atuais) =>
      atuais.includes(indicador) ? atuais.filter((i) => i !== indicador) : [...atuais, indicador],
    );
  }

  const ve = (i: Indicador) => escolhidos.includes(i);
  const maiorServico = Math.max(1, ...(dados?.servicosMaisSolicitados.map((s) => s.quantidade) ?? []));
  const maiorDia = Math.max(1, ...(dados?.atendimentosPorDia.map((d) => d.quantidade) ?? []));

  return (
    <div className="pagina">
      <h1>Indicadores</h1>

      <form className="indicadores__filtros" onSubmit={aplicar} aria-label="Período dos indicadores">
        <Campo rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} required />
        <Campo rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} required />
        <Botao type="submit" variante="secundaria">
          Atualizar
        </Botao>
      </form>

      <fieldset className="indicadores__escolha">
        <legend>Indicadores exibidos</legend>
        {INDICADORES.map((i) => (
          <label key={i.valor}>
            <input type="checkbox" checked={ve(i.valor)} onChange={() => alternar(i.valor)} />
            {i.rotulo}
          </label>
        ))}
      </fieldset>

      {erro && <Alerta tipo="erro" titulo="Indicadores indisponíveis" mensagem={erro} />}
      {!erro && !dados && <p role="status">Carregando…</p>}

      {dados && (
        <>
          <div className="indicadores__numeros">
            {ve('atendimentos') && (
              <div className="indicadores__numero">
                <span>Atendimentos realizados</span>
                <strong>{dados.atendimentos}</strong>
              </div>
            )}
            {ve('faturamento') && (
              <div className="indicadores__numero">
                <span>Faturamento</span>
                <strong>{reais(dados.faturamento)}</strong>
              </div>
            )}
            {ve('taxaAceite') && (
              <div className="indicadores__numero">
                <span>Taxa de aceite</span>
                <strong>{dados.taxaAceite.toLocaleString('pt-BR')}%</strong>
                <small>{dados.solicitacoes} solicitações no período</small>
              </div>
            )}
          </div>

          {ve('servicos') && (
            <Cartao titulo="Serviços mais pedidos">
              {dados.servicosMaisSolicitados.length === 0 ? (
                <p>Nenhuma solicitação no período.</p>
              ) : (
                <ul className="indicadores__barras">
                  {dados.servicosMaisSolicitados.map((s) => (
                    <li key={s.servico}>
                      <span className="indicadores__rotulo">{s.servico}</span>
                      <span className="indicadores__trilho" aria-hidden="true">
                        <span style={{ width: `${(s.quantidade / maiorServico) * 100}%` }} />
                      </span>
                      <span className="indicadores__valor">{s.quantidade}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          )}

          {ve('porDia') && (
            <Cartao titulo="Atendimentos por dia">
              <div className="indicadores__colunas" aria-hidden="true">
                {dados.atendimentosPorDia.map((d) => (
                  <span
                    key={d.data}
                    title={`${diaMes(d.data)}: ${d.quantidade}`}
                    style={{ height: `${(d.quantidade / maiorDia) * 100}%` }}
                  />
                ))}
              </div>
              <table className="visualmente-oculto">
                <caption>Atendimentos por dia</caption>
                <tbody>
                  {dados.atendimentosPorDia.map((d) => (
                    <tr key={d.data}>
                      <th scope="row">{diaMes(d.data)}</th>
                      <td>{d.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Cartao>
          )}
        </>
      )}
    </div>
  );
}
