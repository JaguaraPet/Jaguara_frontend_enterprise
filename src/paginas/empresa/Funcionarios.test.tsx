import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Funcionarios } from './Funcionarios';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const perfis = [
  { id: 'p1', nome: 'Atendente', descricao: 'Recepção', permissoes: ['agenda:ler'] },
  { id: 'p2', nome: 'Profissional', permissoes: ['atendimento:editar'] },
];

describe('UC-19 · Funcionários na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function entrar(permissoes = ['funcionario:ler', 'funcionario:editar']) {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes,
    });
  }

  it('CT-19-01: deve convidar o funcionário com o perfil escolhido', async () => {
    entrar();
    const equipe: unknown[] = [];
    let enviado: unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/perfis')) return json(perfis);
        if (entrada.method === 'POST') {
          enviado = JSON.parse(await entrada.text());
          const novo = { id: 'f1', nome: 'Rafa', email: 'rafa@exemplo.com', perfil: 'Atendente', perfilId: 'p1', ativo: true, pendente: true };
          equipe.push(novo);
          return json(novo, 201);
        }
        return json(equipe);
      }),
    );
    render(<Funcionarios />);
    expect(await screen.findByText('Nenhum funcionário cadastrado')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Nome'), 'Rafa');
    await userEvent.type(screen.getByLabelText('CPF'), '529.982.247-25');
    await userEvent.type(screen.getByLabelText('E-mail'), 'rafa@exemplo.com');
    await userEvent.selectOptions(screen.getByLabelText('Perfil de acesso'), 'p1');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('Convite enviado para rafa@exemplo.com')).toBeInTheDocument();
    expect(enviado).toEqual({ nome: 'Rafa', cpf: '52998224725', email: 'rafa@exemplo.com', perfilId: 'p1' });
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByText('Convite enviado')).toBeInTheDocument();
  });

  it('CT-19-02: deve trocar o perfil e desligar com confirmação', async () => {
    entrar();
    const rafa = { id: 'f1', nome: 'Rafa', email: 'rafa@exemplo.com', perfil: 'Atendente', perfilId: 'p1', ativo: true, pendente: false };
    const pedidos: { metodo: string; corpo?: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/perfis')) return json(perfis);
        if (entrada.method === 'PATCH') {
          pedidos.push({ metodo: 'PATCH', corpo: JSON.parse(await entrada.text()) });
          rafa.perfilId = 'p2';
          rafa.perfil = 'Profissional';
          return json(rafa);
        }
        if (entrada.method === 'DELETE') {
          pedidos.push({ metodo: 'DELETE' });
          rafa.ativo = false;
          return json(null, 204);
        }
        return json([rafa]);
      }),
    );
    render(<Funcionarios />);
    await userEvent.selectOptions(await screen.findByLabelText('Perfil de Rafa'), 'p2');
    expect(await screen.findByText('Perfil de Rafa alterado')).toBeInTheDocument();
    expect(pedidos[0]).toEqual({ metodo: 'PATCH', corpo: { perfilId: 'p2' } });

    await userEvent.click(screen.getByRole('button', { name: 'Desligar Rafa' }));
    expect(screen.getByText('Desligar Rafa?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar desligamento' }));
    expect(await screen.findByText('Rafa foi desligado')).toBeInTheDocument();
    expect(await screen.findByText('Desligado')).toBeInTheDocument();
  });

  it('deve só listar a equipe para quem não pode editar', async () => {
    entrar(['funcionario:ler']);
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) =>
        new URL(entrada.url).pathname.endsWith('/perfis')
          ? json(perfis)
          : json([{ id: 'f1', nome: 'Rafa', email: 'rafa@exemplo.com', perfil: 'Atendente', perfilId: 'p1', ativo: true, pendente: false }]),
      ),
    );
    render(<Funcionarios />);
    expect(await screen.findByText('Atendente')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar convite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desligar Rafa' })).not.toBeInTheDocument();
  });
});
