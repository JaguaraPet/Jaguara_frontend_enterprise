import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../api/sessao';
import type { Usuario } from '../api/sessao';
import { LayoutComMenu } from '../layout/LayoutComMenu';
import { itensEmpresa } from './empresa/itensEmpresa';
import { Painel } from './Painel';
import { ConfirmarEmail } from './publicas/ConfirmarEmail';

function abrirPainel(usuario: Usuario) {
  vi.spyOn(sessao, 'usuario', 'get').mockReturnValue(usuario);
  const roteador = createMemoryRouter(
    [
      {
        path: '/',
        element: <LayoutComMenu area="Enterprise" itens={itensEmpresa} sairPara="/entrar" />,
        children: [{ index: true, element: <Painel /> }],
      },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={roteador} />);
}

describe('Web Enterprise: painel e menu por perfil (RN20)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('deve mostrar ao atendente só a agenda, as solicitações e os clientes', () => {
    abrirPainel({
      id: 'f1',
      tipo: 'FUNCIONARIO',
      perfil: 'Atendente',
      empresaId: 'e1',
      permissoes: ['agenda:ler', 'agenda:editar', 'cliente:ler', 'servico:ler'],
    });
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(menu).toHaveTextContent('Agenda');
    expect(menu).toHaveTextContent('Clientes');
    expect(menu).not.toHaveTextContent('Funcionários');
    expect(menu).not.toHaveTextContent('Relatórios');
    expect(screen.getByText('Você entrou com o perfil Atendente.')).toBeInTheDocument();
  });

  it('deve mostrar tudo à conta da empresa', () => {
    abrirPainel({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Empresa',
      empresaId: 'e1',
      permissoes: ['agenda:ler', 'agenda:editar', 'servico:ler', 'cliente:ler', 'chat:usar', 'funcionario:ler', 'relatorio:ler', 'financeiro:ler', 'empresa:editar', 'atendimento:ler'],
    });
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    for (const item of itensEmpresa) expect(menu).toHaveTextContent(item.rotulo);
  });
});

describe('Confirmação de e-mail (RN02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function abrir(url: string) {
    const roteador = createMemoryRouter([{ path: '/confirmar-email', element: <ConfirmarEmail /> }], {
      initialEntries: [url],
    });
    render(<RouterProvider router={roteador} />);
  }

  it('deve confirmar uma vez só e avisar que a conta está ativa', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchFalso);
    abrir('/confirmar-email?token=abc');
    expect(await screen.findByText('E-mail confirmado')).toBeInTheDocument();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('deve explicar quando o link venceu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 410 })));
    abrir('/confirmar-email?token=velho');
    expect(await screen.findByText('Link inválido ou expirado')).toBeInTheDocument();
  });
});
