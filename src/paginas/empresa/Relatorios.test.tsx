import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Relatorios } from './Relatorios';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const atendimentos = {
  tipo: 'atendimentos',
  de: '2026-11-01',
  ate: '2026-11-30',
  total: 3,
  taxaComparecimento: 66.7,
  porStatus: [
    { chave: 'REALIZADO', quantidade: 2 },
    { chave: 'NAO_COMPARECEU', quantidade: 1 },
  ],
  porServico: [{ chave: 'Banho', quantidade: 3 }],
  porProfissional: [{ chave: 'Dra. Júlia', quantidade: 3 }],
  agendamentos: [
    {
      dataHora: '2026-11-05T13:00:00Z',
      pet: 'Thor',
      servico: 'Banho',
      profissional: 'Dra. Júlia',
      status: 'REALIZADO',
      atendimentoFinalizado: true,
    },
  ],
};

function entrarComo(permissoes: string[]) {
  vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
    id: 'f1',
    tipo: 'FUNCIONARIO',
    perfil: 'Gerente',
    empresaId: 'e1',
    permissoes,
  });
}

async function preencherPeriodo() {
  await userEvent.type(screen.getByLabelText('De'), '2026-11-01');
  await userEvent.type(screen.getByLabelText('Até'), '2026-11-30');
}

describe('UC-18 · Relatórios na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CT-18-01: deve gerar o relatório de atendimentos do mês e baixar o PDF', async () => {
    entrarComo(['relatorio:ler']);
    const pedidos: { url: string; aceita: string | null }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        pedidos.push({ url: entrada.url, aceita: entrada.headers.get('Accept') });
        if (entrada.headers.get('Accept') === 'application/pdf') {
          return Promise.resolve(
            new Response(new Blob(['%PDF-1.4']), { headers: { 'Content-Type': 'application/pdf' } }),
          );
        }
        return json(atendimentos);
      }),
    );
    const criarUrl = vi.fn(() => 'blob:relatorio');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: criarUrl, revokeObjectURL: vi.fn() }));
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<Relatorios />);
    expect(screen.queryByRole('option', { name: 'Financeiro (gerencial)' })).not.toBeInTheDocument();
    await preencherPeriodo();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    expect(await screen.findByText('66,7%')).toBeInTheDocument();
    expect(screen.getAllByRole('table').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Não compareceu').length).toBeGreaterThan(0);
    expect(new URL(pedidos[0].url).pathname).toBe('/v1/empresas/e1/relatorios/atendimentos');

    await userEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(pedidos.at(-1)?.aceita).toBe('application/pdf');
    expect(criarUrl).toHaveBeenCalled();
    expect(clique).toHaveBeenCalled();
  });

  it('CT-18-02: deve mostrar o bloqueio quando falta permissão', async () => {
    entrarComo(['relatorio:ler', 'financeiro:ler']);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        json({ title: 'Acesso negado', detail: 'Seu perfil não permite este relatório (falta financeiro:ler).' }, 403),
      ),
    );
    render(<Relatorios />);
    await userEvent.selectOptions(screen.getByLabelText('Relatório'), 'financeiro');
    await preencherPeriodo();
    await userEvent.click(screen.getByRole('button', { name: 'Gerar' }));
    const alerta = await screen.findByText('Relatório não gerado');
    expect(within(alerta.closest('[role]') ?? document.body).getByText(/falta financeiro:ler/)).toBeInTheDocument();
  });
});
