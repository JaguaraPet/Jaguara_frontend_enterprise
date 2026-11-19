/** Endereço da API; em produção vem de VITE_API_URL no build. */
export const URL_API: string =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
