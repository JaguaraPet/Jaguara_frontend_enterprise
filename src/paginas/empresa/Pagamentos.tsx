import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo } from '../../componentes';
import '../admin/admin.css';
import '../admin/logs.css';
import './indicadores.css';
import { RecebimentoDireto } from './RecebimentoDireto';

type Pagamento = components['schemas']['PagamentoDetalhado'];
type Status = '' | 'ACEITO' | 'PENDENTE' | 'RECUSADO' | 'CANCELADO';

const STATUS: Record<string, string> = {
  ACEITO: 'Confirmado',
  PENDENTE: 'Aguardando',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
};
const REEMBOLSO: Record<string, string> = {
  EM_ANALISE: 'Reembolso pedido',
  APROVADO: 'Reembolso aprovado',
  NEGADO: 'Reembolso negado',
};
const METODO: Record<string, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Crédito',
  CARTAO_DEBITO: 'Débito',
  BOLETO: 'Boleto',
};

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Pagamentos recebidos pela empresa (UC-45), com pedidos de reembolso dos tutores. */
export function Pagamentos() {
  const [status, setStatus] = useState<Status>('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [filtro, setFiltro] = useState<{ status: Status; de: string; ate: string }>({ status: '', de: '', ate: '' });
  const [lista, setLista] = useState<Pagamento[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    void api
      .GET('/pagamentos', {
        params: {
          query: {
            ...(filtro.status ? { status: filtro.status } : {}),
            ...(filtro.de ? { de: filtro.de } : {}),
            ...(filtro.ate ? { ate: filtro.ate } : {}),
          },
        },
      })
      .then(({ data, error }) => {
        if (!ativo) return;
        setErro(!!error);
        setLista(data ?? []);
      });
    return () => {
      ativo = false;
    };
  }, [filtro]);

  function aplicar(evento: FormEvent) {
    evento.preventDefault();
    setLista(null);
    setFiltro({ status, de, ate });
  }

  function limpar() {
    setStatus('');
    setDe('');
    setAte('');
    setLista(null);
    setFiltro({ status: '', de: '', ate: '' });
  }

  const confirmados = (lista ?? []).filter((p) => p.status === 'ACEITO');
  const total = confirmados.reduce((t, p) => t + p.valor, 0);
  const pedidos = (lista ?? []).filter((p) => p.reembolso?.status === 'EM_ANALISE').length;

  return (
    <div className="pagina">
      <h1>Pagamentos</h1>
      <RecebimentoDireto />
      <form className="indicadores__filtros" onSubmit={aplicar} aria-label="Filtrar pagamentos">
        <label className="admin__selecao">
          Situação
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="">Todas</option>
            {Object.entries(STATUS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <Campo rotulo="De" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        <Campo rotulo="Até" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        <Botao type="submit" variante="secundaria">
          Filtrar
        </Botao>
      </form>

      {erro && <Alerta tipo="erro" titulo="Não foi possível carregar os pagamentos" />}
      {pedidos > 0 && (
        <Alerta
          tipo="alerta"
          titulo={pedidos === 1 ? '1 pedido de reembolso para analisar' : `${pedidos} pedidos de reembolso para analisar`}
          mensagem="O tutor recebe a resposta pelo Jaguara; o estorno é feito no painel do meio de pagamento."
        />
      )}

      {lista === null ? (
        <p role="status">Carregando…</p>
      ) : lista.length === 0 ? (
        <>
          <Alerta tipo="info" titulo="Nenhum pagamento encontrado para o filtro selecionado" />
          <Botao variante="texto" onClick={limpar}>
            Limpar filtros
          </Botao>
        </>
      ) : (
        <>
          <div className="indicadores__numeros">
            <div className="indicadores__numero">
              <span>Recebido no filtro</span>
              <strong>{reais(total)}</strong>
              <small>{confirmados.length} pagamentos confirmados</small>
            </div>
          </div>
          <div className="logs__tabela" role="region" aria-label="Pagamentos recebidos" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tutor</th>
                  <th scope="col">Serviço</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Meio</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td>{dataHora(p.dataHora)}</td>
                    <td>{p.contraparte}</td>
                    <td>
                      {p.descricao}
                      {p.pet ? ` · ${p.pet}` : ''}
                    </td>
                    <td>{reais(p.valor)}</td>
                    <td>{METODO[p.metodo] ?? p.metodo}</td>
                    <td>
                      {STATUS[p.status] ?? p.status}
                      {p.reembolso && (
                        <>
                          {' · '}
                          <span title={p.reembolso.motivo}>{REEMBOLSO[p.reembolso.status ?? ''] ?? p.reembolso.status}</span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
