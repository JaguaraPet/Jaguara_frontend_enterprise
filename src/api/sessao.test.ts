import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerToken, sessao } from './sessao';

function tokenFalso(dados: object) {
  const base64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${base64({ alg: 'HS256' })}.${base64(dados)}.assinatura`;
}

describe('sessão da web', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('deve ler tipo, empresa e permissões do access token', () => {
    const usuario = lerToken(
      tokenFalso({ sub: 'u1', tipo: 'FUNCIONARIO', perfil: 'Atendente', empresaId: 'e1', permissoes: ['agenda:ler'] }),
    );
    expect(usuario).toEqual({ id: 'u1', tipo: 'FUNCIONARIO', perfil: 'Atendente', empresaId: 'e1', permissoes: ['agenda:ler'] });
  });

  it('deve renovar uma vez só quando várias requisições pedem renovação ao mesmo tempo', async () => {
    localStorage.setItem('jaguara.refreshToken', 'r1');
    const token = tokenFalso({ sub: 'u1', tipo: 'EMPRESA', perfil: 'Empresa', empresaId: 'u1', permissoes: [] });
    const fetchFalso = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: token, refreshToken: 'r2', expiraEm: '' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchFalso);

    const resultados = await Promise.all([sessao.renovar(), sessao.renovar(), sessao.renovar()]);

    expect(resultados).toEqual([true, true, true]);
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jaguara.refreshToken')).toBe('r2');
    expect(sessao.usuario?.tipo).toBe('EMPRESA');
  });

  it('deve encerrar a sessão quando a renovação é recusada', async () => {
    localStorage.setItem('jaguara.refreshToken', 'velho');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    expect(await sessao.renovar()).toBe(false);
    expect(localStorage.getItem('jaguara.refreshToken')).toBeNull();
    expect(sessao.usuario).toBeNull();
  });
});
