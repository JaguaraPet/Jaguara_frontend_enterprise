/**
 * Endereço da API. Num domínio de verdade ele sai do próprio endereço da página: a Enterprise em
 * app.X, o site em X e o app do tutor em tutor.X falam com api.X (ex.: app.homologacao.jaguarapet
 * .com.br usa api.homologacao.jaguarapet.com.br). Assim a mesma imagem serve em homologação,
 * prévia e produção. Em desenvolvimento vale VITE_API_URL ou a API local.
 */
export function urlDaApi(endereco: { protocol: string; hostname: string }, configurada?: string): string {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(endereco.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(endereco.hostname);
  if (!local) {
    const base = endereco.hostname.replace(/^(app|tutor|www)\./, '');
    return `${endereco.protocol}//api.${base}/v1`;
  }
  return configurada || 'http://localhost:3000/v1';
}

export const URL_API: string = urlDaApi(
  typeof window === 'undefined' ? { protocol: 'http:', hostname: 'localhost' } : window.location,
  import.meta.env.VITE_API_URL,
);
