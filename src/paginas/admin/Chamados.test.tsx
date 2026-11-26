import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Chamados } from './Chamados';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const chamado = {
  id: 'c1',
  protocolo: 'SUP-20261126-AB12C',
  titulo: 'Vacina não anexa',
  descricao: 'O app fecha ao escolher a foto.',
  status: 'ABERTO',
  dataAbertura: '2026-11-26T12:00:00Z',
  solicitante: { id: 'u1', nome: 'Ana', email: 'ana@exemplo.com', tipo: 'TUTOR' },
};

function api(responder?: () => Promise<Response>) {
  const chamadas: { caminho: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const caminho = new URL(entrada.url).pathname;
      if (entrada.method === 'POST') {
        chamadas.push({ caminho, corpo: JSON.parse(await entrada.text()) });
        return responder?.() ?? json({ ...chamado, status: 'RESOLVIDO', intervencoes: [] }, 201);
      }
      if (caminho.endsWith('/c1')) return json({ ...chamado, intervencoes: [] });
      return json([chamado]);
    }),
  );
  return chamadas;
}

describe('UC-26 · Central de suporte na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('CT-26-01: deve registrar a intervenção e avisar que ficou na auditoria', async () => {
    const chamadas = api();
    render(<Chamados />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir o chamado SUP-20261126-AB12C' }));
    expect(await screen.findByText('O app fecha ao escolher a foto.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar intervenção' }));
    await userEvent.type(screen.getByLabelText('Ação executada'), 'Liberei o tipo de arquivo');
    await userEvent.type(screen.getByLabelText('O que foi feito'), 'Ajustei o limite de envio.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Intervenção registrada')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({
      caminho: '/v1/admin/chamados/c1/intervencoes',
      corpo: { acaoExecutada: 'Liberei o tipo de arquivo', descricao: 'Ajustei o limite de envio.', status: 'RESOLVIDO' },
    });
  });

  it('CT-26-02: deve pedir informação ao solicitante', async () => {
    const chamadas = api();
    render(<Chamados />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir o chamado SUP-20261126-AB12C' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir informação' }));
    const enviar = screen.getByRole('button', { name: 'Enviar pedido' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('O que falta para resolver'), 'Qual é o modelo do celular?');
    await userEvent.click(enviar);
    expect(await screen.findByText('Pedido de informação enviado')).toBeInTheDocument();
    expect(chamadas[0]?.caminho).toBe('/v1/admin/chamados/c1/pedido-informacao');
  });

  it('deve mostrar a recusa da API sem mudar o chamado', async () => {
    api(() => json({ title: 'Não foi possível registrar a intervenção', detail: 'A auditoria não respondeu.' }, 503));
    render(<Chamados />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir o chamado SUP-20261126-AB12C' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pedir informação' }));
    await userEvent.type(screen.getByLabelText('O que falta para resolver'), 'Mande um print, por favor.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Nada foi registrado')).toBeInTheDocument();
  });
});
