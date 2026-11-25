import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pagamentos } from './Pagamentos';

const json = (corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { headers: { 'Content-Type': 'application/json' } }));

const pagamento = (extra: object) => ({
  id: 'pg1',
  codigoTransacao: '1',
  valor: 60,
  dataHora: '2026-11-20T15:00:00Z',
  metodo: 'PIX',
  status: 'ACEITO',
  descricao: 'Banho',
  contraparte: 'Ana',
  pet: 'Thor',
  podeReembolsar: false,
  ...extra,
});

describe('UC-45 · Pagamentos recebidos na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('CT-45-01: deve listar os recebidos com o total e filtrar', async () => {
    const consultas: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        const url = new URL(entrada.url);
        consultas.push(url.search);
        return url.searchParams.get('status') === 'CANCELADO'
          ? json([])
          : json([
              pagamento({}),
              pagamento({ id: 'pg2', valor: 90, reembolso: { status: 'EM_ANALISE', motivo: 'Cancelado', dataSolicitacao: '' } }),
              pagamento({ id: 'pg3', status: 'PENDENTE', valor: 40 }),
            ]);
      }),
    );
    render(<Pagamentos />);
    expect(await screen.findByText(/150,00/)).toBeInTheDocument();
    expect(screen.getByText('2 pagamentos confirmados')).toBeInTheDocument();
    expect(screen.getByText('1 pedido de reembolso para analisar')).toBeInTheDocument();
    expect(screen.getByText('Reembolso pedido')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Situação'), 'CANCELADO');
    await userEvent.type(screen.getByLabelText('De'), '2026-11-01');
    await userEvent.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(await screen.findByText('Nenhum pagamento encontrado para o filtro selecionado')).toBeInTheDocument();
    expect(consultas.at(-1)).toBe('?status=CANCELADO&de=2026-11-01');
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(await screen.findByText(/150,00/)).toBeInTheDocument();
  });
});
