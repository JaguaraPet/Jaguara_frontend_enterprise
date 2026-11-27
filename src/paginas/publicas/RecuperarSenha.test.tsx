import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecuperarSenha, RedefinirSenha } from './RecuperarSenha';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 || status === 202 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

function abrir(caminho: string) {
  const roteador = createMemoryRouter(
    [
      { path: '/recuperar-senha', element: <RecuperarSenha /> },
      { path: '/redefinir-senha', element: <RedefinirSenha /> },
      { path: '/entrar', element: <p>Login</p> },
    ],
    { initialEntries: [caminho] },
  );
  render(<RouterProvider router={roteador} />);
}

function api(status: number, corpo: unknown = null) {
  const enviados: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      enviados.push(JSON.parse(await entrada.text()));
      return json(corpo, status);
    }),
  );
  return enviados;
}

describe('UC-03 · Recuperação de senha na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve pedir o link sem dizer se a conta existe', async () => {
    const enviados = api(202);
    abrir('/recuperar-senha');
    await userEvent.type(screen.getByLabelText('E-mail'), ' clinica@exemplo.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(await screen.findByText('Confira seu e-mail')).toBeInTheDocument();
    expect(enviados[0]).toEqual({ email: 'clinica@exemplo.com' });
  });

  it('deve recusar e-mail inválido antes de chamar a API', async () => {
    const enviados = api(202);
    abrir('/recuperar-senha');
    await userEvent.type(screen.getByLabelText('E-mail'), 'clinica');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }));
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(enviados).toHaveLength(0);
  });

  it('deve salvar a senha nova pelo link do e-mail', async () => {
    const enviados = api(204);
    abrir('/redefinir-senha?token=abc');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'NovaSenha1');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'NovaSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(await screen.findByText('Senha alterada')).toBeInTheDocument();
    expect(enviados[0]).toEqual({ token: 'abc', novaSenha: 'NovaSenha1' });
  });

  it('deve conferir a política e a repetição da senha', async () => {
    const enviados = api(204);
    abrir('/redefinir-senha?token=abc');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'curta');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nova senha'));
    await userEvent.type(screen.getByLabelText('Nova senha'), 'NovaSenha1');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'OutraSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(screen.getByText('As senhas não são iguais.')).toBeInTheDocument();
    expect(enviados).toHaveLength(0);
  });

  it('deve avisar quando o link expirou e oferecer outro', async () => {
    api(410, { title: 'Link inválido ou expirado' });
    abrir('/redefinir-senha?token=velho');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'NovaSenha1');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'NovaSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(await screen.findByText('Link inválido ou expirado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir outro link' })).toBeInTheDocument();
  });

  it('deve mostrar a recusa de senha repetida', async () => {
    api(422, { title: 'Senha não aceita', detail: 'Escolha uma senha diferente das três últimas.' });
    abrir('/redefinir-senha?token=abc');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'NovaSenha1');
    await userEvent.type(screen.getByLabelText('Repita a senha'), 'NovaSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar senha' }));
    expect(await screen.findByText('Escolha uma senha diferente das três últimas.')).toBeInTheDocument();
  });
});
