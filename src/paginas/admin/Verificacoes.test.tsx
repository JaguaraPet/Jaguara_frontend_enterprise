import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Verificacoes } from './Verificacoes';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(corpo === null ? null : JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Verificação de empresas na administração', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve listar as pendências, exigir o motivo da recusa e aprovar', async () => {
    const decisoes: unknown[] = [];
    let pendentes = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        if (entrada.method === 'POST') {
          decisoes.push(await entrada.json());
          pendentes = false;
          return json(null, 204);
        }
        return json({
          empresas: pendentes
            ? [
                {
                  id: 'e1',
                  cnpj: '11222333000181',
                  razaoSocial: 'Pet Feliz Ltda.',
                  nomeFantasia: 'Pet Feliz',
                  responsavelNome: 'Gerente',
                  email: 'gerente@petfeliz.com',
                  enderecoCidade: 'São Paulo',
                  enderecoUf: 'SP',
                  verificacaoMotivo: 'Aguardando a análise do documento da empresa.',
                  cadastradaEm: '2026-11-22T10:00:00Z',
                },
              ]
            : [],
          contestacoes: [],
        });
      }),
    );
    render(<Verificacoes />);
    expect(await screen.findByText('Pet Feliz')).toBeInTheDocument();
    expect(screen.getByText(/CNPJ 11\.222\.333\/0001-81/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(screen.getByRole('button', { name: 'Confirmar recusa' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar Pet Feliz' }));
    expect(await screen.findByText('Pet Feliz verificada')).toBeInTheDocument();
    expect(decisoes).toEqual([{ aprovada: true }]);
    expect(screen.getByText('Nenhuma empresa esperando.')).toBeInTheDocument();
  });
});
