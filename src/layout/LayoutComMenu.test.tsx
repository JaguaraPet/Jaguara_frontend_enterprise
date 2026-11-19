import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../api/sessao';
import type { Usuario } from '../api/sessao';
import { RotaProtegida } from '../sessao/RotaProtegida';
import { LayoutComMenu } from './LayoutComMenu';

const itens = [
  { rotulo: 'Painel', caminho: '/admin' },
  { rotulo: 'Monitoramento e logs', caminho: '/admin/logs', permissao: 'admin:auditoria' },
  { rotulo: 'Webhooks', caminho: '/admin/webhooks', permissao: 'admin:integracoes' },
];

function logado(usuario: Usuario | null) {
  vi.spyOn(sessao, 'usuario', 'get').mockReturnValue(usuario);
}

function abrir() {
  const roteador = createMemoryRouter(
    [
      { path: '/admin/entrar', element: <p>Tela de login</p> },
      {
        path: '/admin',
        element: (
          <RotaProtegida tipos={['ADMINISTRADOR']} entrar="/admin/entrar">
            <LayoutComMenu area="Administração" itens={itens} sairPara="/admin/entrar" />
          </RotaProtegida>
        ),
        children: [{ index: true, element: <p>Conteúdo do painel</p> }],
      },
    ],
    { initialEntries: ['/admin'] },
  );
  render(<RouterProvider router={roteador} />);
}

describe('Área de administração', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve mandar para o login quando não há sessão', () => {
    logado(null);
    abrir();
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('deve negar a área para quem não é administrador', () => {
    logado({ id: 'u1', tipo: 'EMPRESA', perfil: 'Empresa', empresaId: 'u1', permissoes: ['admin:auditoria'] });
    abrir();
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('deve mostrar só os itens do menu liberados pelas permissões', () => {
    logado({ id: 'a1', tipo: 'ADMINISTRADOR', perfil: 'Administrador', empresaId: null, permissoes: ['admin:auditoria'] });
    abrir();
    const menu = screen.getByRole('navigation', { name: 'Menu principal' });
    expect(menu).toHaveTextContent('Painel');
    expect(menu).toHaveTextContent('Monitoramento e logs');
    expect(menu).not.toHaveTextContent('Webhooks');
    expect(screen.getByText('Conteúdo do painel')).toBeInTheDocument();
  });
});
