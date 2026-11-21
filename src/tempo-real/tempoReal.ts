import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { URL_API } from '../api/config';
import { sessao } from '../api/sessao';

/** Endereço do namespace de tempo real da API (ADR-011): mesmo servidor, sem o /v1. */
export function enderecoTempoReal(urlApi: string = URL_API): string {
  return `${new URL(urlApi).origin}/tempo-real`;
}

export type ConectarTempoReal = () => Socket;

/**
 * Abre a conexão com o access token atual. O token é lido de novo a cada reconexão, para
 * a conexão continuar depois da renovação automática da sessão.
 */
export const conectarTempoReal: ConectarTempoReal = () =>
  io(enderecoTempoReal(), {
    transports: ['websocket'],
    auth: (enviar) => enviar({ token: sessao.accessToken }),
  });
