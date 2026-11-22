import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Indicadores } from './Indicadores';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const dados = {
  de: '2026-11-01',
  ate: '2026-11-30',
  atendimentos: 42,
  faturamento: 3150.5,
  taxaAceite: 87.5,
  solicitacoes: 48,
  servicosMaisSolicitados: [
    { servico: 'Banho', quantidade: 30 },
    { servico: 'Consulta', quantidade: 12 },
  ],
  atendimentosPorDia: [
    { data: '2026-11-01', quantidade: 0 },
    { data: '2026-11-02', quantidade: 3 },
  ],
};

describe('UC-17 · Indicadores na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function entrarComo(empresaId: string) {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: empresaId,
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId,
      permissoes: ['relatorio:ler'],
    });
  }

  it('CT-17-01: deve mostrar os indicadores escolhidos no período', async () => {
    entrarComo('e1');
    const consultas: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        const url = new URL(entrada.url);
        consultas.push(`${url.pathname}${url.search}`);
        return json(dados);
      }),
    );
    render(<Indicadores hoje={new Date(2026, 10, 22)} />);
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('87,5%')).toBeInTheDocument();
    expect(screen.getByText(/3\.150,50/)).toBeInTheDocument();
    expect(screen.getByText('Banho')).toBeInTheDocument();
    expect(consultas[0]).toBe('/v1/empresas/e1/indicadores?de=2026-11-01&ate=2026-11-30');

    await userEvent.click(screen.getByLabelText('Faturamento'));
    expect(screen.queryByText(/3\.150,50/)).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('De'));
    await userEvent.type(screen.getByLabelText('De'), '2026-10-01');
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await screen.findByText('42');
    expect(consultas.at(-1)).toBe('/v1/empresas/e1/indicadores?de=2026-10-01&ate=2026-11-30');
  });

  it('CT-17-02: deve mostrar o acesso negado sem dados de outra empresa', async () => {
    entrarComo('e1');
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        json({ title: 'Acesso negado', detail: 'Os indicadores mostram só os dados da sua empresa.' }, 403),
      ),
    );
    render(<Indicadores hoje={new Date(2026, 10, 22)} />);
    expect(await screen.findByText('Indicadores indisponíveis')).toBeInTheDocument();
    expect(screen.getByText('Os indicadores mostram só os dados da sua empresa.')).toBeInTheDocument();
    expect(screen.queryByText('Atendimentos realizados', { selector: 'span' })).not.toBeInTheDocument();
  });
});
