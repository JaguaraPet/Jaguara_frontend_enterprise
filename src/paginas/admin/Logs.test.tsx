import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Logs } from './Logs';

function respostas(logs: unknown[]) {
  return vi.fn((entrada: RequestInfo | URL) => {
    const url = entrada instanceof Request ? entrada.url : String(entrada);
    if (url.endsWith('/health')) return Promise.resolve(new Response('{"status":"ok"}', { status: 200 }));
    return Promise.resolve(
      new Response(JSON.stringify(logs), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
  });
}

describe('Monitoramento e logs (UC-25)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CT-25-01: deve listar os registros com o nível escrito, não só a cor', async () => {
    vi.stubGlobal(
      'fetch',
      respostas([
        { dataHora: '2026-11-19T22:00:00Z', acao: 'FUNCIONARIO_DESLIGADO', entidade: 'FuncionarioEnterprise', entidadeId: 'abcdef123', nivel: 'CRITICO', autorId: '12345678-0000' },
      ]),
    );
    render(<Logs />);
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByText('FUNCIONARIO_DESLIGADO')).toBeInTheDocument();
    expect(within(tabela).getByText('Crítico')).toBeInTheDocument();
    expect(await screen.findByText('No ar')).toBeInTheDocument();
  });

  it('CT-25-02: deve avisar quando não há registros para o filtro', async () => {
    const fetchFalso = respostas([]);
    vi.stubGlobal('fetch', fetchFalso);
    render(<Logs />);
    expect(await screen.findByText('Não há registros para este filtro')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Nível'), 'CRITICO');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    const urls = fetchFalso.mock.calls.map(([entrada]) => (entrada instanceof Request ? entrada.url : String(entrada)));
    expect(urls.some((u) => u.includes('/admin/logs?nivel=CRITICO'))).toBe(true);
  });
});
