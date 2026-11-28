import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Seguranca } from './Seguranca';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Segurança da conta na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve mostrar o QR Code, ativar com o código e exibir os códigos de recuperação', async () => {
    let ativo = false;
    const corpos: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/configuracao')) {
          return json({ segredo: 'JBSWY3DPEHPK3PXP', urlOtpauth: 'otpauth://totp/Jaguara:x?secret=JBSWY3DPEHPK3PXP' }, 201);
        }
        if (caminho.endsWith('/ativacao')) {
          corpos.push(await entrada.json());
          ativo = true;
          return json({ codigosRecuperacao: ['abcd-efgh', 'ijkl-mnop'] }, 201);
        }
        return json({ ativo, codigosRestantes: ativo ? 2 : 0, exigido: true, ativadoEm: ativo ? '2026-11-22T12:00:00Z' : undefined });
      }),
    );
    render(
      <MemoryRouter initialEntries={['/seguranca?obrigatorio=1']}>
        <Seguranca />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Ative a verificação em duas etapas para continuar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ativar a verificação em duas etapas' }));
    expect(await screen.findByAltText('QR Code para o aplicativo autenticador')).toBeInTheDocument();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    const confirmar = screen.getByRole('button', { name: 'Confirmar e ativar' });
    expect(confirmar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Código de 6 números'), '123456');
    await userEvent.click(confirmar);
    expect(await screen.findByText('abcd-efgh')).toBeInTheDocument();
    expect(await screen.findByText('Verificação em duas etapas ligada')).toBeInTheDocument();
    expect(screen.getByText('Na conta da empresa, a segunda etapa fica sempre ligada.')).toBeInTheDocument();
    expect(corpos).toEqual([{ codigo: '123456' }]);
  });
});
