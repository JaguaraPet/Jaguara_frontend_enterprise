import createClient from 'openapi-fetch';
import type { paths } from './esquema';

/** Endereço da API; em produção vem de VITE_API_URL no build. */
export const URL_API: string =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

/**
 * Cliente tipado gerado do contrato OpenAPI (JAG-95): rotas, parâmetros e respostas
 * vêm de src/api/esquema.ts, sem tipos escritos à mão.
 */
export const api = createClient<paths>({ baseUrl: URL_API });
