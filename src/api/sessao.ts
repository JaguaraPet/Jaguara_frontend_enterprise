/**
 * Sessão da web (ADR-009, ADR-012): o access token fica só em memória e o refresh token no
 * localStorage, para a sessão sobreviver a um recarregamento da página. A renovação é automática:
 * o cliente da API renova e repete a requisição quando recebe 401.
 */
import { URL_API } from './config';

export type TipoUsuario = 'TUTOR' | 'EMPRESA' | 'FUNCIONARIO' | 'ADMINISTRADOR';

export interface Usuario {
  id: string;
  tipo: TipoUsuario;
  perfil: string;
  empresaId: string | null;
  permissoes: string[];
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiraEm: string;
}

export interface Problema {
  title?: string;
  detail?: string;
  codigo?: string;
  status?: number;
}

const CHAVE_REFRESH = 'jaguara.refreshToken';
const CHAVE_DEMONSTRACAO = 'jaguara.demonstracao';

/** Dados da demonstração em uso, para a barra "Você está numa demonstração". */
export interface Demonstracao {
  codigoTutor: string;
  expiraEm: string;
  formularioOpiniao: string | null;
  urlTutor: string | null;
}

let accessToken: string | null = null;
let usuario: Usuario | null = null;
let renovando: Promise<boolean> | null = null;
const ouvintes = new Set<() => void>();

function avisar() {
  for (const ouvinte of ouvintes) ouvinte();
}

/** Lê o conteúdo do JWT (sem validar: quem valida é a API). */
export function lerToken(token: string): Usuario {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    [...atob(base64)].map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
  );
  const dados = JSON.parse(json) as Omit<Usuario, 'id'> & { sub: string };
  return {
    id: dados.sub,
    tipo: dados.tipo,
    perfil: dados.perfil,
    empresaId: dados.empresaId,
    permissoes: dados.permissoes,
  };
}

function guardar(tokens: Tokens) {
  accessToken = tokens.accessToken;
  usuario = lerToken(tokens.accessToken);
  try {
    localStorage.setItem(CHAVE_REFRESH, tokens.refreshToken);
  } catch {
    // Sem localStorage (navegação privada), a sessão vale só enquanto a página estiver aberta.
  }
  avisar();
}

function limpar() {
  accessToken = null;
  usuario = null;
  try {
    localStorage.removeItem(CHAVE_REFRESH);
    localStorage.removeItem(CHAVE_DEMONSTRACAO);
  } catch {
    // ignora
  }
  avisar();
}

function refreshGuardado(): string | null {
  try {
    return localStorage.getItem(CHAVE_REFRESH);
  } catch {
    return null;
  }
}

async function postar(caminho: string, corpo: unknown, token?: string) {
  return fetch(`${URL_API}${caminho}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
}

export class ErroApi extends Error {
  readonly problema: Problema;

  constructor(problema: Problema) {
    super(problema.detail ?? problema.title ?? 'Erro na API');
    this.problema = problema;
  }
}

export const sessao = {
  get accessToken() {
    return accessToken;
  },
  get usuario() {
    return usuario;
  },
  ouvir(ouvinte: () => void) {
    ouvintes.add(ouvinte);
    return () => ouvintes.delete(ouvinte);
  },

  /** UC-02: entra com e-mail e senha. */
  async entrar(email: string, senha: string): Promise<Usuario> {
    const resposta = await postar('/auth/login', { email, senha });
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    guardar((await resposta.json()) as Tokens);
    return usuario!;
  },

  /** Cria uma clínica de demonstração e entra nela. */
  async entrarNaDemonstracao(): Promise<Usuario> {
    const resposta = await postar('/demonstracao', undefined);
    if (!resposta.ok) throw new ErroApi((await resposta.json()) as Problema);
    const { sessao: tokens, ...demonstracao } = (await resposta.json()) as Demonstracao & {
      sessao: Tokens;
    };
    try {
      localStorage.setItem(CHAVE_DEMONSTRACAO, JSON.stringify(demonstracao));
    } catch {
      // sem localStorage, a barra da demonstração não aparece
    }
    guardar(tokens);
    return usuario!;
  },

  /** A demonstração em uso, se a sessão for de uma. */
  get demonstracao(): Demonstracao | null {
    try {
      const guardada = localStorage.getItem(CHAVE_DEMONSTRACAO);
      return guardada ? (JSON.parse(guardada) as Demonstracao) : null;
    } catch {
      return null;
    }
  },

  /**
   * Troca o refresh token por tokens novos. Várias chamadas ao mesmo tempo esperam a mesma
   * renovação, porque o refresh token muda a cada uso.
   */
  renovar(): Promise<boolean> {
    renovando ??= (async () => {
      const refreshToken = refreshGuardado();
      if (!refreshToken) return false;
      const resposta = await postar('/auth/renovacao', { refreshToken }).catch(() => null);
      if (!resposta?.ok) {
        limpar();
        return false;
      }
      guardar((await resposta.json()) as Tokens);
      return true;
    })().finally(() => {
      renovando = null;
    });
    return renovando;
  },

  async sair(): Promise<void> {
    if (accessToken) await postar('/auth/logout', undefined, accessToken).catch(() => undefined);
    limpar();
  },
};
