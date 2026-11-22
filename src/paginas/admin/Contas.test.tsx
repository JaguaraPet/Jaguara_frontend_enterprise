import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Contas } from './Contas';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

function servidor(rotas: Record<string, (corpo: unknown) => Promise<Response>>) {
  const enviados: { rota: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: RequestInfo | URL) => {
      const req = entrada as Request;
      const url = new URL(req.url);
      const rota = `${req.method} ${url.pathname.replace('/v1', '')}${url.search}`;
      const texto = req.method === 'GET' ? '' : await req.text();
      const corpo = texto ? (JSON.parse(texto) as unknown) : undefined;
      enviados.push({ rota, corpo });
      const resposta = Object.entries(rotas).find(([r]) => rota === r || rota.startsWith(`${r}?`));
      return resposta ? resposta[1](corpo) : json({}, 404);
    }),
  );
  return enviados;
}

const ana = {
  id: 'u1',
  email: 'ana@exemplo.com',
  nome: 'Ana Souza',
  tipo: 'TUTOR',
  status: 'ATIVA',
  dataCadastro: '2026-11-01T13:00:00Z',
};

describe('Gestão de contas na administração (UC-28)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('CT-28-01: deve suspender a conta com motivo e mostrar o histórico', async () => {
    let status = 'ATIVA';
    const historico: unknown[] = [];
    const enviados = servidor({
      'GET /admin/usuarios': () => json([{ ...ana, status }]),
      'GET /admin/usuarios/u1': () =>
        json({ ...ana, status, emailConfirmado: true, sessoesAtivas: status === 'ATIVA' ? 1 : 0, historico }),
      'PUT /admin/usuarios/u1/status': (corpo) => {
        status = 'SUSPENSA';
        historico.push({
          dataHora: '2026-11-22T13:00:00Z',
          acao: 'CONTA_SUSPENSA',
          motivo: (corpo as { motivo: string }).motivo,
        });
        return json(null, 204);
      },
    });
    render(<Contas />);
    const tabela = await screen.findByRole('table');
    await userEvent.click(within(tabela).getByRole('button', { name: 'Abrir a conta de Ana Souza' }));
    await screen.findByText('Sessões ativas');
    await userEvent.selectOptions(screen.getByLabelText('Ação'), 'SUSPENSA');
    await userEvent.type(screen.getByLabelText('Motivo'), 'Denúncia de spam');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Conta suspensa')).toBeInTheDocument();
    expect(enviados.find((e) => e.rota === 'PUT /admin/usuarios/u1/status')?.corpo).toEqual({
      status: 'SUSPENSA',
      motivo: 'Denúncia de spam',
    });
    expect(await screen.findByText(/Denúncia de spam/, { selector: 'li' })).toBeInTheDocument();
  });

  it('CT-28-02: deve avisar a falha e manter o status quando a auditoria não responde', async () => {
    servidor({
      'GET /admin/usuarios': () => json([ana]),
      'GET /admin/usuarios/u1': () => json({ ...ana, emailConfirmado: true, sessoesAtivas: 1, historico: [] }),
      'PUT /admin/usuarios/u1/status': () =>
        json(
          {
            title: 'Não foi possível concluir a alteração',
            detail: 'A auditoria não respondeu e o status da conta não mudou. Tente de novo.',
            codigo: 'RN34_AUDITORIA_INDISPONIVEL',
          },
          503,
        ),
    });
    render(<Contas />);
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir a conta de Ana Souza' }));
    await screen.findByText('Sessões ativas');
    await userEvent.selectOptions(screen.getByLabelText('Ação'), 'BLOQUEADA');
    await userEvent.type(screen.getByLabelText('Motivo'), 'Fraude no pagamento');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('Status não alterado')).toBeInTheDocument();
    expect(screen.getByText(/status da conta não mudou/)).toBeInTheDocument();
  });

  it('deve filtrar pelo status e não oferecer ação para conta excluída', async () => {
    const enviados = servidor({
      'GET /admin/usuarios': () => json([{ ...ana, status: 'INATIVA' }]),
      'GET /admin/usuarios/u1': () =>
        json({ ...ana, status: 'INATIVA', emailConfirmado: true, sessoesAtivas: 0, historico: [] }),
    });
    render(<Contas />);
    await screen.findByRole('table');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'INATIVA');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(enviados.some((e) => e.rota === 'GET /admin/usuarios?status=INATIVA')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir a conta de Ana Souza' }));
    expect(await screen.findByText('Esta conta não pode ser alterada pela administração')).toBeInTheDocument();
  });
});
