import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportarClientes } from './ImportarClientes';

describe('Importação de clientes na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve mostrar a prévia, exigir a declaração e importar', async () => {
    const corpos: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        corpos.push(await entrada.json());
        return new Response(
          JSON.stringify({ criados: 1, petsCriados: 1, ignorados: [{ linha: 3, nome: 'Bia', motivo: 'Já é cliente da empresa.' }] }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    const aoTerminar = vi.fn();
    render(<ImportarClientes empresaId="e1" aoTerminar={aoTerminar} />);
    const csv = 'Nome;Telefone;Nome do pet;Espécie\nAna;1199;Rex;Cão\nBia;1188;;\n';
    await userEvent.upload(screen.getByLabelText('Escolha o arquivo CSV'), new File([csv], 'clientes.csv', { type: 'text/csv' }));
    expect(await screen.findByText('2 clientes encontrados. Confira os primeiros:')).toBeInTheDocument();
    expect(screen.getByText('Rex (Cão)')).toBeInTheDocument();
    const botao = screen.getByRole('button', { name: 'Importar 2 clientes' });
    expect(botao).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(botao);
    expect(await screen.findByText('1 cliente importado, com 1 pet')).toBeInTheDocument();
    expect(corpos[0]).toEqual({
      declaracaoConsentimento: true,
      linhas: [
        { nome: 'Ana', telefone: '1199', petNome: 'Rex', petEspecie: 'Cão' },
        { nome: 'Bia', telefone: '1188' },
      ],
    });
    expect(aoTerminar).toHaveBeenCalled();
  });

  it('deve avisar quando a planilha não tem a coluna Nome', async () => {
    render(<ImportarClientes empresaId="e1" aoTerminar={vi.fn()} />);
    await userEvent.upload(screen.getByLabelText('Escolha o arquivo CSV'), new File(['Telefone\n1199\n'], 'x.csv', { type: 'text/csv' }));
    expect(await screen.findByText(/Não achamos a coluna "Nome"/)).toBeInTheDocument();
  });
});
