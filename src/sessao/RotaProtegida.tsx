import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import type { TipoUsuario } from '../api/sessao';
import { useUsuario } from './useUsuario';

interface Props {
  tipos: TipoUsuario[];
  entrar: string;
  children: ReactNode;
}

/** Só mostra a rota para os tipos de conta indicados; os demais vão para o login. */
export function RotaProtegida({ tipos, entrar, children }: Props) {
  const usuario = useUsuario();
  const local = useLocation();
  if (!usuario || !tipos.includes(usuario.tipo)) {
    return <Navigate to={entrar} replace state={{ voltarPara: local.pathname }} />;
  }
  return children;
}
