import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Plano } from './Plano';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

const planos = [
  { plano: 'ESSENCIAL', nome: 'Essencial', precoMensal: 59, usuarios: 3, descricao: 'Pequena equipe.' },
  { plano: 'EQUIPE', nome: 'Equipe', precoMensal: 119, usuarios: 10, descricao: 'Vários profissionais.' },
  { plano: 'CLINICA', nome: 'Clínica', precoMensal: 229, usuarios: 30, descricao: 'Equipe grande.' },
];

describe('Plano da empresa na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve mostrar o teste grátis, o uso da equipe e assinar um plano', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['empresa:editar'],
    });
    let status = 'TESTE';
    const enviados: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        if (entrada.method === 'POST') {
          enviados.push(await entrada.json());
          status = 'ATIVA';
          return json({ ativa: true }, 201);
        }
        return json({
          plano: status === 'ATIVA' ? 'ESSENCIAL' : 'EQUIPE',
          status,
          emDia: true,
          testeAte: '2026-12-06T12:00:00Z',
          diasDeTeste: status === 'TESTE' ? 2 : 0,
          periodoAte: status === 'ATIVA' ? '2026-12-22T12:00:00Z' : undefined,
          limites: { usuarios: status === 'ATIVA' ? 3 : 10 },
          uso: { usuarios: 2 },
          planos,
        });
      }),
    );
    render(
      <MemoryRouter>
        <Plano />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Faltam 2 dias de teste grátis')).toBeInTheDocument();
    expect(screen.getByText('2 de 10 usuários')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Assinar Essencial' }));
    expect(await screen.findByText('Assinatura ativa')).toBeInTheDocument();
    expect(screen.getByText('Seu plano')).toBeInTheDocument();
    expect(enviados).toEqual([{ plano: 'ESSENCIAL' }]);
  });
});
