import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { sessao } from '../api/sessao';

/**
 * Restaura a sessão ao abrir a página: se houver refresh token guardado, renova antes de
 * mostrar as rotas protegidas.
 */
export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    void sessao.renovar().finally(() => setPronto(true));
  }, []);
  if (!pronto) {
    return (
      <p className="carregando" role="status">
        Carregando…
      </p>
    );
  }
  return children;
}
