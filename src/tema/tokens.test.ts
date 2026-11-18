import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cores, coresSuaves, espaco, raio } from './tokens';

const css = readFileSync(join(__dirname, 'variaveis.css'), 'utf8');

function variavel(nome: string): string | undefined {
  return new RegExp(`--${nome}:\\s*([^;]+);`).exec(css)?.[1].trim().toLowerCase();
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (l) => `-${l.toLowerCase()}`);

describe('variaveis.css', () => {
  it('deve ter as mesmas cores de tokens.ts', () => {
    for (const [nome, valor] of Object.entries(cores)) {
      expect(variavel(`cor-${kebab(nome)}`)).toBe(valor.toLowerCase());
    }
    for (const [nome, valor] of Object.entries(coresSuaves)) {
      expect(variavel(`cor-suave-${nome}`)).toBe(valor.toLowerCase());
    }
  });

  it('deve ter o mesmo espaçamento e raio de tokens.ts', () => {
    for (const nome of ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const) {
      expect(variavel(`espaco-${nome}`)).toBe(`${espaco[nome]}px`);
    }
    expect(variavel('raio-padrao')).toBe(`${raio.padrao}px`);
  });
});
