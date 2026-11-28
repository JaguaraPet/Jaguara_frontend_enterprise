import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Avaliacoes } from './Avaliacoes';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

const avaliacao = {
  id: 'a1',
  agendamentoId: 'g1',
  nota: 4,
  comentario: 'Atendimento rápido',
  criadoEm: '2026-11-20T15:00:00Z',
  autor: 'Ana Ribeiro',
  servico: 'Banho',
  pet: 'Thor',
};

describe('Avaliações na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve mostrar a média e publicar a resposta da empresa', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['atendimento:ler', 'empresa:editar'],
    });
    const corpos: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        if (entrada.method === 'PUT') {
          const corpo = (await entrada.json()) as { resposta: string };
          corpos.push(corpo);
          return json({ ...avaliacao, resposta: corpo.resposta });
        }
        return json({
          resumo: { media: 4, total: 1, distribuicao: [0, 0, 0, 1, 0] },
          itens: [avaliacao],
          pagina: 1,
          tamanho: 20,
        });
      }),
    );
    render(<Avaliacoes />);
    expect(await screen.findByText('Atendimento rápido')).toBeInTheDocument();
    expect(screen.getByText('1 avaliação')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Responder' }));
    await userEvent.type(screen.getByLabelText('Resposta pública'), 'Obrigado!');
    await userEvent.click(screen.getByRole('button', { name: 'Publicar resposta' }));
    expect(await screen.findByText('Obrigado!')).toBeInTheDocument();
    expect(corpos).toEqual([{ resposta: 'Obrigado!' }]);
  });
});
