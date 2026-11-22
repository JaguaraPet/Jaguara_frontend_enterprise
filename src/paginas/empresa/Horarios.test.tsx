import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Horarios } from './Horarios';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

describe('UC-24 · Horários de atuação na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CT-24-01: deve cadastrar o horário do profissional e recusar sobreposição', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['agenda:ler', 'recurso:editar'],
    });
    const horarios = [{ id: 'h1', diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '12:00', funcionarioId: 'f1' }];
    const enviados: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/funcionarios')) return json([{ id: 'f1', nome: 'Dra. Júlia', ativo: true }]);
        if (caminho.endsWith('/recursos')) return json([{ id: 'r1', nome: 'Sala 1', tipo: 'SALA', ativo: true }]);
        if (entrada.method === 'POST') {
          const corpo = JSON.parse(await entrada.text()) as { horaInicio: string };
          enviados.push(corpo);
          if (corpo.horaInicio === '09:00') {
            return json({ title: 'Horário sobreposto', detail: 'Já existe um horário nesse intervalo.' }, 409);
          }
          horarios.push({ id: 'h2', diaSemana: 'TERCA', horaInicio: '13:00', horaFim: '18:00', funcionarioId: 'f1' });
          return json(horarios[1], 201);
        }
        return json(horarios);
      }),
    );
    render(<Horarios />);
    expect(await screen.findByText('08:00 às 12:00')).toBeInTheDocument();
    expect(screen.getByLabelText('Profissional ou recurso')).toHaveValue('f:f1');

    await userEvent.selectOptions(screen.getByLabelText('Dia'), 'TERCA');
    await userEvent.clear(screen.getByLabelText('Início'));
    await userEvent.type(screen.getByLabelText('Início'), '13:00');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('13:00 às 18:00')).toBeInTheDocument();
    expect(enviados[0]).toEqual({ diaSemana: 'TERCA', horaInicio: '13:00', horaFim: '18:00', funcionarioId: 'f1' });

    await userEvent.selectOptions(screen.getByLabelText('Dia'), 'SEGUNDA');
    await userEvent.clear(screen.getByLabelText('Início'));
    await userEvent.type(screen.getByLabelText('Início'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText('Horário não salvo')).toBeInTheDocument();
    expect(screen.getByText('Já existe um horário nesse intervalo.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Profissional ou recurso'), 'r:r1');
    expect(screen.queryByText('08:00 às 12:00')).not.toBeInTheDocument();
  });

  it('deve só mostrar os horários para quem não pode editar', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'f2',
      tipo: 'FUNCIONARIO',
      perfil: 'Atendente',
      empresaId: 'e1',
      permissoes: ['agenda:ler'],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/funcionarios')) return json([{ id: 'f1', nome: 'Dra. Júlia', ativo: true }]);
        if (caminho.endsWith('/recursos')) return json([]);
        return json([{ id: 'h1', diaSemana: 'SEGUNDA', horaInicio: '08:00', horaFim: '12:00', funcionarioId: 'f1' }]);
      }),
    );
    render(<Horarios />);
    expect(await screen.findByText('08:00 às 12:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
  });
});
