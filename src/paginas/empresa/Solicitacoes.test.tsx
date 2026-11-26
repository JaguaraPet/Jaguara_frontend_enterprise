import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Solicitacoes } from './Solicitacoes';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const pendente = {
  id: 's1',
  servico: 'Banho',
  pet: 'Thor',
  tutor: 'Ana',
  observacoes: 'Ele tem medo de secador.',
  dataHoraDesejada: '2026-11-27T13:00:00Z',
  status: 'PENDENTE',
};

function api(responder?: (caminho: string) => Promise<Response>) {
  const chamadas: { caminho: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const url = new URL(entrada.url);
      if (entrada.method === 'POST') {
        chamadas.push({ caminho: url.pathname, corpo: JSON.parse(await entrada.text()) });
        return responder?.(url.pathname) ?? json({ id: 'a1', status: 'AGENDADO' });
      }
      if (url.pathname.endsWith('/funcionarios')) return json([{ id: 'f1', nome: 'Dra. Bia', ativo: true }]);
      if (url.pathname.endsWith('/recursos')) return json([]);
      const status = url.searchParams.get('status');
      if (status === 'RECUSADA') return json([{ ...pendente, id: 's9', status, motivoRecusa: 'Agenda cheia' }]);
      return json(status === 'PENDENTE' && chamadas.length === 0 ? [pendente] : []);
    }),
  );
  return chamadas;
}

describe('UC-41 · Solicitações pendentes na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function logado() {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['agenda:editar'],
    });
  }

  it('CT-41-01: deve aceitar o pedido com o profissional escolhido', async () => {
    logado();
    const chamadas = api();
    render(<Solicitacoes />);
    expect(await screen.findByText('Banho · Thor')).toBeInTheDocument();
    expect(screen.getByText('“Ele tem medo de secador.”')).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Profissional'), 'Dra. Bia');
    await userEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(await screen.findByText('Banho · Thor aceito')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({ caminho: '/v1/solicitacoes/s1/aceite', corpo: { profissionalId: 'f1' } });
    expect(await screen.findByText('Nenhum pedido esperando resposta')).toBeInTheDocument();
  });

  it('CT-41-02: deve exigir o motivo para recusar', async () => {
    logado();
    const chamadas = api(() => json(null, 204));
    render(<Solicitacoes />);
    await userEvent.click(await screen.findByRole('button', { name: 'Recusar' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar recusa' });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Motivo da recusa (vai para o tutor)'), 'Agenda cheia na data');
    await userEvent.click(confirmar);
    expect(await screen.findByText('Banho · Thor recusado')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({ caminho: '/v1/solicitacoes/s1/recusa', corpo: { motivo: 'Agenda cheia na data' } });
  });

  it('deve mostrar o conflito de agenda devolvido pela API', async () => {
    logado();
    api(() => json({ title: 'Conflito', detail: 'A profissional já tem atendimento nesse horário.' }, 409));
    render(<Solicitacoes />);
    await userEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));
    expect(await screen.findByText('A profissional já tem atendimento nesse horário.')).toBeInTheDocument();
  });

  it('deve listar as recusadas com o motivo', async () => {
    logado();
    api();
    render(<Solicitacoes />);
    await screen.findByText('Banho · Thor');
    await userEvent.click(screen.getByRole('button', { name: 'Recusadas' }));
    expect(await screen.findByRole('cell', { name: 'Agenda cheia' })).toBeInTheDocument();
  });
});
