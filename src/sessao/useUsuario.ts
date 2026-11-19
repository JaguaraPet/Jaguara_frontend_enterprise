import { useSyncExternalStore } from 'react';
import { sessao } from '../api/sessao';

/** Usuário logado; atualiza a tela quando a sessão muda. */
export function useUsuario() {
  return useSyncExternalStore(
    (ouvinte) => {
      const parar = sessao.ouvir(ouvinte);
      return () => {
        parar();
      };
    },
    () => sessao.usuario,
  );
}
