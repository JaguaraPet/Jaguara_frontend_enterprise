import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api, URL_API } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Cartao } from '../../componentes';
import './logs.css';

type Log = components['schemas']['LogAuditoria'];
type Nivel = NonNullable<Log['nivel']>;

const ROTULO_NIVEL: Record<Nivel, string> = {
  INFO: 'Informação',
  ALERTA: 'Alerta',
  CRITICO: 'Crítico',
};

/** Data do campo `date` (dia inteiro no fuso do navegador) para ISO 8601. */
function inicioDoDia(data: string) {
  return data ? new Date(`${data}T00:00:00`).toISOString() : undefined;
}
function fimDoDia(data: string) {
  return data ? new Date(`${data}T23:59:59.999`).toISOString() : undefined;
}

/** Situação da API pelo health check, com o tempo de resposta. */
function useStatusApi() {
  const [status, setStatus] = useState<{ ok: boolean; ms: number } | null>(null);
  useEffect(() => {
    const inicio = performance.now();
    fetch(`${URL_API}/health`)
      .then((r) => setStatus({ ok: r.ok, ms: Math.round(performance.now() - inicio) }))
      .catch(() => setStatus({ ok: false, ms: 0 }));
  }, []);
  return status;
}

/** Monitoramento e logs da plataforma (UC-25, RN31): filtro por nível e período. */
export function Logs() {
  const [nivel, setNivel] = useState<Nivel | ''>('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [erro, setErro] = useState(false);
  const statusApi = useStatusApi();

  const buscar = useCallback(async () => {
    setErro(false);
    const { data, error } = await api.GET('/admin/logs', {
      params: { query: { nivel: nivel || undefined, de: inicioDoDia(de), ate: fimDoDia(ate) } },
    });
    if (error) {
      setErro(true);
      setLogs([]);
      return;
    }
    setLogs(data ?? []);
  }, [nivel, de, ate]);

  useEffect(() => {
    void buscar();
    // Só na abertura; depois a busca é pelo botão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function filtrar(evento: FormEvent) {
    evento.preventDefault();
    void buscar();
  }

  return (
    <div className="pagina">
      <h1>Monitoramento e logs</h1>
      <div className="pagina__grade">
        <Cartao titulo="API" subtitulo="Situação agora">
          {statusApi === null ? (
            <p role="status">Verificando…</p>
          ) : statusApi.ok ? (
            <Alerta tipo="sucesso" titulo="No ar" mensagem={`Respondeu em ${statusApi.ms} ms.`} />
          ) : (
            <Alerta tipo="erro" titulo="Fora do ar" mensagem="O health check não respondeu." />
          )}
        </Cartao>
      </div>

      <form className="logs__filtros" onSubmit={filtrar} aria-label="Filtros dos logs">
        <label>
          Nível
          <select value={nivel} onChange={(e) => setNivel(e.target.value as Nivel | '')}>
            <option value="">Todos</option>
            <option value="CRITICO">Crítico</option>
            <option value="ALERTA">Alerta</option>
            <option value="INFO">Informação</option>
          </select>
        </label>
        <label>
          De
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label>
          Até
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
        <Botao type="submit">Filtrar</Botao>
      </form>

      {erro && <Alerta tipo="erro" titulo="Não foi possível carregar os logs" />}
      {logs === null ? (
        <p role="status">Carregando…</p>
      ) : logs.length === 0 ? (
        <Alerta tipo="info" titulo="Não há registros para este filtro" />
      ) : (
        <div className="logs__tabela" role="region" aria-label="Registros de auditoria" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Data e hora</th>
                <th scope="col">Nível</th>
                <th scope="col">Ação</th>
                <th scope="col">Registro</th>
                <th scope="col">Autor</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={`${log.dataHora}-${i}`}>
                  <td>{log.dataHora ? new Date(log.dataHora).toLocaleString('pt-BR') : '-'}</td>
                  <td>
                    {log.nivel && (
                      <span className={`logs__nivel logs__nivel--${log.nivel.toLowerCase()}`}>
                        {ROTULO_NIVEL[log.nivel]}
                      </span>
                    )}
                  </td>
                  <td>{log.acao}</td>
                  <td>
                    {log.entidade} {log.entidadeId && <code>{log.entidadeId.slice(0, 8)}</code>}
                  </td>
                  <td>{log.autorId ? <code>{log.autorId.slice(0, 8)}</code> : 'Sistema'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
