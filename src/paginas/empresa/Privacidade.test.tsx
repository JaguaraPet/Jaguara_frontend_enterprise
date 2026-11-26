import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Privacidade } from './Privacidade';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const termos = [
  { termoId: 'te', titulo: 'Termos da Enterprise', versao: '1.0', obrigatorio: true, aceito: true },
  { termoId: 'mk', titulo: 'Comunicação de marketing', versao: '1.0', obrigatorio: false, aceito: true },
];

function api(put = () => json(null, 204), post = () => json({ id: 's1', tipo: 'EXCLUSAO_DADOS', status: 'ABERTA' }, 202)) {
  const chamadas: { metodo: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const caminho = new URL(entrada.url).pathname;
      if (entrada.method !== 'GET') {
        chamadas.push({ metodo: entrada.method, corpo: JSON.parse(await entrada.text()) });
        return entrada.method === 'PUT' ? put() : post();
      }
      if (caminho.endsWith('/exportacao')) return json({ empresa: { nome: 'Pet Feliz' } });
      return json(termos);
    }),
  );
  return chamadas;
}

describe('UC-46 · Privacidade da empresa na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CT-46-01: deve revogar o consentimento opcional', async () => {
    const chamadas = api();
    render(<Privacidade />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /Comunicação de marketing/ }));
    expect(await screen.findByText('Consentimento revogado')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({ metodo: 'PUT', corpo: [{ termoId: 'mk', aceito: false }] });
  });

  it('CT-46-02: deve avisar que o termo obrigatório não sai sem excluir a conta', async () => {
    api(() => json({ title: 'Termo obrigatório', detail: 'Para revogar, exclua a conta.' }, 409));
    render(<Privacidade />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /Termos da Enterprise/ }));
    expect(await screen.findByText('Este termo é necessário para usar o Jaguara')).toBeInTheDocument();
  });

  it('deve baixar a exportação em JSON', async () => {
    api();
    const criar = vi.fn(() => 'blob:dados');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: criar, revokeObjectURL: vi.fn() }));
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<Privacidade />);
    await userEvent.click(await screen.findByRole('button', { name: 'Exportar dados' }));
    await vi.waitFor(() => expect(clicar).toHaveBeenCalled());
    expect(criar).toHaveBeenCalled();
  });

  it('deve registrar o pedido de exclusão da conta da empresa para o suporte', async () => {
    const chamadas = api();
    render(<Privacidade />);
    await userEvent.type(await screen.findByLabelText('Senha para confirmar'), 'Senha@123');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir exclusão' }));
    expect(await screen.findByText('Pedido de exclusão registrado')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({ metodo: 'POST', corpo: { tipo: 'EXCLUSAO_DADOS', senha: 'Senha@123' } });
  });

  it('deve mostrar o erro quando a senha está errada', async () => {
    api(undefined, () => json({ title: 'Senha incorreta' }, 422));
    render(<Privacidade />);
    await userEvent.type(await screen.findByLabelText('Senha para confirmar'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir exclusão' }));
    expect(await screen.findByText('Pedido de exclusão não registrado')).toBeInTheDocument();
  });
});
