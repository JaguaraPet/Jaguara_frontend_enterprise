import { createBrowserRouter } from 'react-router';
import type { RouteObject } from 'react-router';
import { Empresas } from './Empresas';
import { Inicio } from './Inicio';
import { LayoutSite } from './LayoutSite';
import { Vitrine } from './Vitrine';

/** Páginas públicas, com o caminho base: '' no domínio do site e '/site' na Enterprise. */
export function rotasDoSite(base: '' | '/site'): RouteObject[] {
  return [
    {
      path: base || '/',
      element: <LayoutSite />,
      children: [
        { index: true, element: <Inicio /> },
        { path: 'empresas', element: <Empresas /> },
        ...(base ? [] : [{ path: 'e/:slug', element: <Vitrine /> }, { path: '*', element: <Inicio /> }]),
      ],
    },
    // A página de cada empresa vale nos dois domínios.
    ...(base ? [{ path: '/e/:slug', element: <LayoutSite />, children: [{ index: true, element: <Vitrine /> }] }] : []),
  ];
}

export const roteadorSite = createBrowserRouter(rotasDoSite(''));
