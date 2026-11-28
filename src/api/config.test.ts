import { describe, expect, it } from 'vitest';
import { urlDaApi } from './config';

describe('Endereço da API', () => {
  it('deve sair do domínio da página em homologação, prévia e produção', () => {
    expect(urlDaApi({ protocol: 'https:', hostname: 'app.homologacao.jaguarapet.com.br' })).toBe(
      'https://api.homologacao.jaguarapet.com.br/v1',
    );
    expect(urlDaApi({ protocol: 'https:', hostname: 'previa.jaguarapet.com.br' })).toBe(
      'https://api.previa.jaguarapet.com.br/v1',
    );
    expect(urlDaApi({ protocol: 'https:', hostname: 'app.jaguarapet.com.br' }, 'https://outra/v1')).toBe(
      'https://api.jaguarapet.com.br/v1',
    );
  });

  it('deve usar a configurada ou a API local em desenvolvimento', () => {
    expect(urlDaApi({ protocol: 'http:', hostname: 'localhost' }, 'http://192.168.0.31:3000/v1')).toBe(
      'http://192.168.0.31:3000/v1',
    );
    expect(urlDaApi({ protocol: 'http:', hostname: 'localhost' })).toBe('http://localhost:3000/v1');
  });
});
