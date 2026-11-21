import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Integracoes } from './Integracoes';
import { Webhooks } from './Webhooks';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

/** Roteia o fetch falso por método e caminho e guarda os corpos enviados. */
function servidor(rotas: Record<string, (corpo: unknown) => Promise<Response>>) {
  const enviados: { rota: string; corpo: unknown }[] = [];
  const fetch = vi.fn(async (entrada: RequestInfo | URL) => {
    const req = entrada as Request;
    const caminho = new URL(req.url).pathname.replace('/v1', '');
    const rota = `${req.method} ${caminho}`;
    const texto = req.method === 'GET' ? '' : await req.text();
    const corpo = texto ? (JSON.parse(texto) as unknown) : undefined;
    enviados.push({ rota, corpo });
    const resposta = Object.entries(rotas).find(([r]) => rota.startsWith(r));
    return resposta ? resposta[1](corpo) : json({}, 404);
  });
  vi.stubGlobal('fetch', fetch);
  return enviados;
}

describe('Integrações e webhooks na administração (UC-27, UC-30)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('CT-27-01: deve salvar a integração e testar o serviço sem mostrar as credenciais', async () => {
    const lista = [
      {
        id: 'i1',
        nome: 'Google Agenda',
        tipo: 'CALENDARIO',
        endpointUrl: 'https://www.googleapis.com/calendar/v3',
        ativa: true,
        temCredenciais: true,
      },
    ];
    const enviados = servidor({
      'GET /admin/integracoes': () => json(lista),
      'POST /admin/integracoes/i1/teste': () => json({ ok: true, status: 200, detalhe: 'O serviço respondeu.' }),
      'POST /admin/integracoes': () => json(lista[0], 201),
    });
    render(<Integracoes />);
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByText('Google Agenda')).toBeInTheDocument();
    expect(within(tabela).getByText('Calendário')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Nome'), 'Mercado Pago');
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'PAGAMENTO');
    await userEvent.type(screen.getByLabelText('Endereço do serviço'), 'https://api.mercadopago.com');
    await userEvent.type(screen.getByLabelText('Credenciais'), 'TEST-123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar integração' }));
    expect(await screen.findByText('Integração salva')).toBeInTheDocument();
    expect(enviados.find((e) => e.rota === 'POST /admin/integracoes')?.corpo).toEqual({
      nome: 'Mercado Pago',
      tipo: 'PAGAMENTO',
      endpointUrl: 'https://api.mercadopago.com',
      credenciais: 'TEST-123',
    });
    expect(screen.getByLabelText('Credenciais')).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Testar' }));
    expect(await screen.findByText('Google Agenda: serviço no ar')).toBeInTheDocument();
  });

  it('CT-30-01: deve salvar o webhook e mostrar o segredo uma única vez', async () => {
    servidor({
      'GET /admin/webhooks': () => json([]),
      'POST /admin/webhooks': () =>
        json(
          {
            id: 'w1',
            url: 'https://parceiro.exemplo.com/hook',
            eventos: ['agendamento.criado'],
            ativo: true,
            segredo: 'segredo-gerado-pela-api',
          },
          201,
        ),
    });
    render(<Webhooks />);
    expect(await screen.findByText('Nenhum webhook cadastrado')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('URL HTTPS do parceiro'), 'https://parceiro.exemplo.com/hook');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar webhook' }));
    expect(await screen.findByText('Escolha pelo menos um evento.')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Agendamento criado'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar webhook' }));
    expect(await screen.findByText(/segredo-gerado-pela-api/)).toBeInTheDocument();
  });

  it('CT-30-02: deve explicar por que a URL foi recusada', async () => {
    servidor({
      'GET /admin/webhooks': () => json([]),
      'POST /admin/webhooks': () =>
        json(
          {
            title: 'Dados inválidos',
            campos: [{ campo: 'url', mensagem: 'Use uma URL HTTPS: os eventos só são enviados por conexão segura (RN36).' }],
          },
          422,
        ),
    });
    render(<Webhooks />);
    await screen.findByText('Nenhum webhook cadastrado');
    await userEvent.type(screen.getByLabelText('URL HTTPS do parceiro'), 'http://parceiro.exemplo.com');
    await userEvent.click(screen.getByLabelText('Pagamento confirmado'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar webhook' }));
    expect(await screen.findByText(/Use uma URL HTTPS/)).toBeInTheDocument();
  });
});
