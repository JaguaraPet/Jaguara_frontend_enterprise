import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErroApi, sessao } from '../api/sessao';
import type { Usuario } from '../api/sessao';
import { Entrar } from './Entrar';

function abrir() {
  const roteador = createMemoryRouter(
    [
      { path: '/entrar', element: <Entrar tipos={['EMPRESA', 'FUNCIONARIO']} titulo="Entrar" destino="/" /> },
      { path: '/', element: <p>Painel aberto</p> },
    ],
    { initialEntries: ['/entrar'] },
  );
  render(<RouterProvider router={roteador} />);
}

async function preencherEEntrar() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'clinica@exemplo.com');
  await userEvent.type(screen.getByLabelText('Senha'), 'Senha@123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

const usuario = (tipo: Usuario['tipo']): Usuario => ({
  id: 'u1',
  tipo,
  perfil: 'Empresa',
  empresaId: tipo === 'TUTOR' ? null : 'e1',
  permissoes: [],
});

describe('Tela de login da web (UC-02)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve abrir o painel quando a empresa entra', async () => {
    vi.spyOn(sessao, 'entrar').mockResolvedValue(usuario('EMPRESA'));
    abrir();
    await preencherEEntrar();
    expect(await screen.findByText('Painel aberto')).toBeInTheDocument();
  });

  it('deve avisar o bloqueio de 5 minutos quando a conta foi bloqueada (RN03)', async () => {
    vi.spyOn(sessao, 'entrar').mockRejectedValue(new ErroApi({ codigo: 'RN03_CONTA_BLOQUEADA' }));
    abrir();
    await preencherEEntrar();
    expect(await screen.findByRole('alert')).toHaveTextContent('bloqueada por 5 minutos');
  });

  it('deve recusar com mensagem genérica quando a senha está errada', async () => {
    vi.spyOn(sessao, 'entrar').mockRejectedValue(new ErroApi({ codigo: 'CREDENCIAIS_INVALIDAS' }));
    abrir();
    await preencherEEntrar();
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('deve mandar o tutor para o app e encerrar a sessão quando ele tenta entrar na web', async () => {
    vi.spyOn(sessao, 'entrar').mockResolvedValue(usuario('TUTOR'));
    const sair = vi.spyOn(sessao, 'sair').mockResolvedValue();
    abrir();
    await preencherEEntrar();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tutores usam o app');
    expect(sair).toHaveBeenCalled();
  });

  it('deve pedir o código do aplicativo quando a conta tem a verificação em duas etapas', async () => {
    const entrar = vi
      .spyOn(sessao, 'entrar')
      .mockRejectedValueOnce(new ErroApi({ codigo: 'DOIS_FATORES_NECESSARIO' }))
      .mockResolvedValueOnce(usuario('FUNCIONARIO'));
    abrir();
    await preencherEEntrar();
    await userEvent.type(await screen.findByLabelText('Código do aplicativo'), '123456');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar código' }));
    expect(await screen.findByText('Painel aberto')).toBeInTheDocument();
    expect(entrar).toHaveBeenLastCalledWith('clinica@exemplo.com', 'Senha@123', '123456');
  });
});
