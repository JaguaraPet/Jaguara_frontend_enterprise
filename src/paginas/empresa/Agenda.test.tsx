import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Agenda } from './Agenda';
import { diasDaSemana, inicioDaSemana, rotuloSemana, somarDias } from './semana';

const json = (corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { headers: { 'Content-Type': 'application/json' } }));

describe('UC-24 · Agenda semanal na web', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve calcular a semana de segunda a domingo', () => {
    // 19/11/2026 é uma quinta-feira.
    expect(inicioDaSemana(new Date(2026, 10, 19, 15))).toBe('2026-11-16');
    expect(inicioDaSemana(new Date(2026, 10, 22, 9))).toBe('2026-11-16');
    expect(diasDaSemana('2026-11-16')).toHaveLength(7);
    expect(diasDaSemana('2026-11-30').at(-1)).toBe('2026-12-06');
    expect(somarDias('2026-11-16', -7)).toBe('2026-11-09');
    expect(rotuloSemana('2026-11-16')).toMatch(/^16 a 22 de nov/);
  });

  it('deve mostrar os agendamentos no dia certo, filtrar e trocar de semana', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['agenda:ler'],
    });
    const consultas: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        const url = new URL(entrada.url);
        if (url.pathname.endsWith('/funcionarios')) return json([{ id: 'f1', nome: 'Dra. Júlia', ativo: true }]);
        if (url.pathname.endsWith('/recursos')) return json([{ id: 'r1', nome: 'Sala 1', ativo: true }]);
        consultas.push(url.search);
        return json({
          agendamentos: [
            {
              id: 'a1',
              dataHoraInicio: new Date(2026, 10, 18, 9).toISOString(),
              dataHoraFim: new Date(2026, 10, 18, 10).toISOString(),
              status: 'AGENDADO',
              servicoNome: 'Banho',
              petNome: 'Thor',
              profissionalNome: 'Dra. Júlia',
            },
          ],
          solicitacoesPendentes: [{ id: 's1' }],
        });
      }),
    );
    render(
      <MemoryRouter>
        <Agenda hoje={new Date(2026, 10, 19, 15)} />
      </MemoryRouter>,
    );
    const quarta = await screen.findByRole('region', { name: /qua/i });
    expect(within(quarta).getByText('Banho')).toBeInTheDocument();
    expect(within(quarta).getByText('Thor')).toBeInTheDocument();
    expect(screen.getByText('1 pedido de agendamento espera resposta')).toBeInTheDocument();
    expect(consultas[0]).toContain('semana=2026-11-16');

    await userEvent.selectOptions(await screen.findByLabelText('Profissional'), 'f1');
    expect(consultas.at(-1)).toContain('profissionalId=f1');
    await userEvent.click(screen.getByRole('button', { name: 'Próxima semana' }));
    expect(consultas.at(-1)).toContain('semana=2026-11-23');
  });
});
