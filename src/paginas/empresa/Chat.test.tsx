import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Chat } from './Chat';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

/** Socket falso: guarda os ouvintes para o teste disparar eventos. */
function socketFalso() {
  const ouvintes: Record<string, (dados: unknown) => void> = {};
  const socket = {
    on: (evento: string, f: (dados: unknown) => void) => {
      ouvintes[evento] = f;
      return socket;
    },
    disconnect: vi.fn(),
  };
  return { conectar: () => socket as unknown as Socket, emitir: (e: string, d: unknown) => ouvintes[e]?.(d) };
}

const conversa = {
  id: 'c1',
  tipo: 'EMPRESA',
  tutorId: 't1',
  status: 'ABERTA',
  tutor: 'Ana',
  pet: 'Thor',
  naoLidas: 1,
  ultimaMensagem: { conteudo: 'O Thor pode tomar banho amanhã?', dataHoraEnvio: '2026-11-25T12:00:00Z', minha: false },
};

describe('UC-43 · Chat da empresa na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CT-43-01: deve abrir a conversa, responder e receber a mensagem nova em tempo real', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['chat:usar'],
    });
    const enviados: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (entrada.method === 'POST') {
          enviados.push(JSON.parse(await entrada.text()));
          return json({ id: 'm2', conversaId: 'c1', conteudo: 'Pode sim, às 9h.', remetenteId: 'e1', dataHoraEnvio: '2026-11-25T12:05:00Z' }, 201);
        }
        if (caminho.endsWith('/mensagens')) {
          return json([{ id: 'm1', conversaId: 'c1', conteudo: 'O Thor pode tomar banho amanhã?', remetenteId: 't1', dataHoraEnvio: '2026-11-25T12:00:00Z' }]);
        }
        return json([conversa]);
      }),
    );
    const { conectar, emitir } = socketFalso();
    render(<Chat conectar={conectar} />);
    expect(await screen.findByRole('button', { name: /Ana · Thor/ })).toBeInTheDocument();
    expect(await screen.findByText('O Thor pode tomar banho amanhã?', { selector: 'li' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Mensagem'), 'Pode sim, às 9h.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Pode sim, às 9h.', { selector: 'li' })).toBeInTheDocument();
    expect(enviados[0]).toEqual({ conteudo: 'Pode sim, às 9h.' });

    act(() => {
      emitir('mensagem:nova', { id: 'm3', conversaId: 'c1', conteudo: 'Obrigada!', remetenteId: 't1', dataHoraEnvio: '2026-11-25T12:06:00Z' });
    });
    expect(await screen.findByText('Obrigada!', { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByText('Obrigada!', { selector: 'li' })).toHaveClass('chat__dele');
  });

  it('deve explicar quando ainda não há conversas', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({ id: 'e1', tipo: 'EMPRESA', perfil: 'Proprietário', empresaId: 'e1', permissoes: [] });
    vi.stubGlobal('fetch', vi.fn(() => json([])));
    render(<Chat conectar={socketFalso().conectar} />);
    expect(await screen.findByText('Nenhuma conversa ainda')).toBeInTheDocument();
  });
});
