import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { RecebimentoDireto } from './RecebimentoDireto';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('Recebimento direto pelo Mercado Pago na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve levar a empresa à autorização do Mercado Pago', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['financeiro:ler', 'empresa:editar'],
    });
    const ir = vi.fn();
    vi.stubGlobal('location', { ...window.location, search: '', assign: ir });
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) =>
        entrada.method === 'POST'
          ? json({ urlAutorizacao: 'https://auth.mercadopago.com/authorization?state=x' }, 201)
          : json({ disponivel: true, conectada: false, taxaPercentual: 2.5 }),
      ),
    );
    render(<RecebimentoDireto />);
    expect(await screen.findByText(/Taxa do Jaguara: 2,5% por pagamento/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Conectar o Mercado Pago' }));
    await vi.waitFor(() => expect(ir).toHaveBeenCalledWith('https://auth.mercadopago.com/authorization?state=x'));
  });

  it('não deve aparecer quando o recebimento direto não está configurado', async () => {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['financeiro:ler'],
    });
    vi.stubGlobal('fetch', vi.fn(() => json({ disponivel: false, conectada: false, taxaPercentual: 0 })));
    const { container } = render(<RecebimentoDireto />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
