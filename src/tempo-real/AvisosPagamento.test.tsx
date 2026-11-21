import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../api/sessao';
import { AvisosPagamento } from './AvisosPagamento';
import { enderecoTempoReal } from './tempoReal';

/** Socket falso: guarda os ouvintes para o teste disparar os eventos do servidor. */
function socketFalso() {
  const ouvintes = new Map<string, (dados: unknown) => void>();
  const socket = {
    on: vi.fn((evento: string, ouvinte: (dados: unknown) => void) => {
      ouvintes.set(evento, ouvinte);
      return socket;
    }),
    disconnect: vi.fn(),
  };
  const emitir = (evento: string, dados: unknown) => act(() => ouvintes.get(evento)?.(dados));
  return { socket, emitir, conectar: () => socket as unknown as Socket };
}

describe('Avisos de pagamento em tempo real (UC-44)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve usar o mesmo servidor da API, sem o /v1', () => {
    expect(enderecoTempoReal('https://api.jaguarapet.com.br/v1')).toBe(
      'https://api.jaguarapet.com.br/tempo-real',
    );
  });

  it('deve avisar só os pagamentos confirmados e deixar fechar', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Empresa',
      empresaId: 'e1',
      permissoes: [],
    });
    const { socket, emitir, conectar } = socketFalso();
    const { unmount } = render(<AvisosPagamento conectar={conectar} />);

    emitir('pagamento:atualizado', { id: 'p0', status: 'RECUSADO', valor: 10 });
    expect(screen.queryByText('Pagamento confirmado')).not.toBeInTheDocument();

    emitir('pagamento:atualizado', { id: 'p1', status: 'ACEITO', valor: 60 });
    emitir('pagamento:atualizado', { id: 'p1', status: 'ACEITO', valor: 60 });
    expect(screen.getAllByText('Pagamento confirmado')).toHaveLength(1);
    expect(screen.getByText(/R\$\s60,00 pagos pelo tutor/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar aviso de pagamento' }));
    expect(screen.queryByText('Pagamento confirmado')).not.toBeInTheDocument();

    unmount();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('não deve conectar sem sessão', () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue(null);
    const conectar = vi.fn();
    render(<AvisosPagamento conectar={conectar} />);
    expect(conectar).not.toHaveBeenCalled();
  });
});
