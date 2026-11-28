/**
 * Um build só serve o site e a Enterprise; o domínio decide o que aparece:
 * jaguarapet.com.br mostra o site e app.jaguarapet.com.br, a Enterprise. Na prévia vale o
 * mesmo com previa.jaguarapet.com.br e app.previa.jaguarapet.com.br. Em desenvolvimento
 * (localhost) a Enterprise fica na raiz e o site em /site.
 */
const host = () => window.location.hostname;
const local = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host());

export function ehSite(): boolean {
  if (local()) return false;
  return !host().startsWith('app.') && !host().startsWith('tutor.');
}

/** Raiz do site sem o prefixo app./tutor. (ex.: previa.jaguarapet.com.br). */
function base(): string {
  return host().replace(/^(app|tutor)\./, '');
}

const origem = (prefixo: string) =>
  `${window.location.protocol}//${prefixo}${base()}${window.location.port ? `:${window.location.port}` : ''}`;

/** Onde fica a Enterprise (login, cadastro e demonstração). */
export function urlEnterprise(): string {
  if (local()) return window.location.origin;
  return origem('app.');
}

/** Onde fica o site (homepage e páginas públicas das empresas). */
export function urlSite(): string {
  if (local()) return `${window.location.origin}/site`;
  return origem('');
}

/** Versão web do app do tutor; em desenvolvimento, o Expo web. */
export function urlTutor(): string {
  if (local()) return 'http://localhost:8081';
  return origem('tutor.');
}

/** Link do APK do Android, quando o build tiver um (VITE_URL_APK). */
export const URL_APK: string | undefined = import.meta.env.VITE_URL_APK || undefined;

/** Caminho interno de uma página do site, com o /site na frente em desenvolvimento. */
export function caminhoSite(caminho: string): string {
  return local() ? `/site${caminho === '/' ? '' : caminho}` : caminho;
}
