import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Catalogo } from './Catalogo';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

describe('UC-38 · Catálogo na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function entrar(permissoes = ['servico:ler', 'servico:editar', 'recurso:editar']) {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes,
    });
  }

  function servidor() {
    const servicos: Record<string, unknown>[] = [];
    const recursos: Record<string, unknown>[] = [];
    const pedidos: { rota: string; corpo: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname.replace('/v1', '');
        const corpo =
          entrada.method === 'GET' ? undefined : (JSON.parse(await entrada.text()) as Record<string, unknown>);
        pedidos.push({ rota: `${entrada.method} ${caminho}`, corpo });
        if (entrada.method === 'GET') return json(caminho.endsWith('/recursos') ? recursos : servicos);
        if (caminho.endsWith('/servicos')) {
          servicos.push({ id: 's1', ...corpo });
          return json(servicos[0], 201);
        }
        if (caminho.startsWith('/servicos/')) {
          Object.assign(servicos[0], corpo);
          return json(servicos[0]);
        }
        recursos.push({ id: 'r1', ...corpo });
        return json(recursos[0], 201);
      }),
    );
    return pedidos;
  }

  it('CT-38-01: deve cadastrar o banho com preço e duração e deixá-lo ativo', async () => {
    entrar();
    const pedidos = servidor();
    render(<Catalogo />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo serviço' }));
    expect(await screen.findByText('Nenhum serviço no catálogo')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome'), 'Banho');
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'BANHO_TOSA');
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '60,00');
    await userEvent.clear(screen.getByLabelText('Duração (minutos)'));
    await userEvent.type(screen.getByLabelText('Duração (minutos)'), '60');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Banho com secagem');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar serviço' }));
    expect(await screen.findByText('Serviço cadastrado')).toBeInTheDocument();
    expect(pedidos.find((p) => p.rota === 'POST /empresas/e1/servicos')?.corpo).toEqual({
      nome: 'Banho',
      descricao: 'Banho com secagem',
      categoria: 'BANHO_TOSA',
      preco: 60,
      duracaoMinutos: 60,
      ativo: true,
    });
    const linha = (await screen.findByText('Banho e tosa', { selector: 'td' })).closest('tr')!;
    expect(within(linha).getByText('Ativo')).toBeInTheDocument();
    expect(within(linha).getByText('60 min')).toBeInTheDocument();
  });

  it('CT-38-02: deve avisar que o preço novo não muda os agendamentos já marcados', async () => {
    entrar();
    servidor();
    render(<Catalogo />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo serviço' }));
    await screen.findByText('Nenhum serviço no catálogo');
    await userEvent.type(screen.getByLabelText('Nome'), 'Banho');
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '60');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Banho');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar serviço' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Alterar Banho' }));
    await userEvent.clear(screen.getByLabelText('Preço (R$)'));
    await userEvent.type(screen.getByLabelText('Preço (R$)'), '70');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }));
    expect(await screen.findByText(/mantêm o preço contratado/)).toBeInTheDocument();
  });

  it('deve cadastrar recurso e esconder a edição de quem só vê o catálogo', async () => {
    entrar();
    const pedidos = servidor();
    render(<Catalogo />);
    await userEvent.type(await screen.findByLabelText('Nome do recurso'), 'Sala de banho');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar recurso' }));
    expect(await screen.findByText('Sala de banho')).toBeInTheDocument();
    expect(pedidos.find((p) => p.rota === 'POST /empresas/e1/recursos')?.corpo).toEqual({
      nome: 'Sala de banho',
      tipo: 'SALA',
      ativo: true,
    });
    cleanup();
    vi.restoreAllMocks();
    entrar(['servico:ler']);
    render(<Catalogo />);
    await screen.findByText('Sala de banho');
    expect(screen.queryByRole('button', { name: 'Cadastrar serviço' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar recurso' })).not.toBeInTheDocument();
  });
});
