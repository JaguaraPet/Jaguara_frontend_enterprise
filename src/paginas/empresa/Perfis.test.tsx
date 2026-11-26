import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Perfis } from './Perfis';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const perfis = [
  { id: 'p0', nome: 'Proprietário', permissoes: ['agenda:ler', 'agenda:editar', 'perfil:editar'] },
  { id: 'p1', nome: 'Atendente', descricao: 'Recepção', permissoes: ['agenda:ler'] },
];
const permissoes = [
  { codigo: 'agenda:ler', modulo: 'Agenda', descricao: 'Ver a agenda' },
  { codigo: 'agenda:editar', modulo: 'Agenda', descricao: 'Marcar e remarcar' },
  { codigo: 'cliente:ler', modulo: 'Clientes', descricao: 'Ver os clientes' },
];

function logado(lista: string[] = ['funcionario:ler', 'perfil:editar']) {
  vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
    id: 'e1',
    tipo: 'EMPRESA',
    perfil: 'Proprietário',
    empresaId: 'e1',
    permissoes: lista,
  });
}

function api(responder?: (metodo: string, caminho: string, corpo: unknown) => Promise<Response> | undefined) {
  const chamadas: { metodo: string; caminho: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const caminho = new URL(entrada.url).pathname;
      if (entrada.method !== 'GET') {
        const texto = await entrada.text();
        const corpo: unknown = texto ? JSON.parse(texto) : undefined;
        chamadas.push({ metodo: entrada.method, caminho, corpo });
        return responder?.(entrada.method, caminho, corpo) ?? json({ id: 'p2', nome: 'Gerente', permissoes: ['agenda:ler'] }, 201);
      }
      return caminho.endsWith('/permissoes') ? json(permissoes) : json(perfis);
    }),
  );
  return chamadas;
}

describe('UC-16 · Perfis de acesso da empresa na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve abrir no primeiro perfil editável com as permissões marcadas', async () => {
    logado();
    api();
    render(<Perfis />);
    expect(await screen.findByLabelText('Nome do perfil')).toHaveValue('Atendente');
    expect(screen.getByRole('checkbox', { name: /Ver a agenda/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Marcar e remarcar/ })).not.toBeChecked();
  });

  it('CT-16-01: deve criar o perfil Gerente com as permissões escolhidas', async () => {
    logado();
    const chamadas = api();
    render(<Perfis />);
    await userEvent.selectOptions(await screen.findByLabelText('Perfil'), '+ Novo perfil');
    await userEvent.type(screen.getByLabelText('Nome do perfil'), 'Gerente');
    await userEvent.click(screen.getByRole('checkbox', { name: /Ver a agenda/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Criar perfil' }));
    expect(await screen.findByText('Perfil Gerente criado')).toBeInTheDocument();
    expect(chamadas[0]).toEqual({
      metodo: 'POST',
      caminho: '/v1/empresas/e1/perfis',
      corpo: { nome: 'Gerente', permissoes: ['agenda:ler'] },
    });
  });

  it('deve alterar as permissões do perfil existente', async () => {
    logado();
    const chamadas = api((metodo) =>
      metodo === 'PUT' ? json({ id: 'p1', nome: 'Atendente', permissoes: ['agenda:ler', 'agenda:editar'] }) : undefined,
    );
    render(<Perfis />);
    await userEvent.click(await screen.findByRole('checkbox', { name: /Marcar e remarcar/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar perfil' }));
    expect(await screen.findByText('Perfil Atendente alterado')).toBeInTheDocument();
    expect(chamadas[0]?.corpo).toEqual({ nome: 'Atendente', descricao: 'Recepção', permissoes: ['agenda:ler', 'agenda:editar'] });
  });

  it('deve mostrar a recusa da API ao excluir perfil em uso', async () => {
    logado();
    api(() => json({ title: 'Perfil em uso', detail: 'Há funcionários com este perfil.' }, 409));
    render(<Perfis />);
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir perfil' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    expect(await screen.findByText('Há funcionários com este perfil.')).toBeInTheDocument();
  });

  it('deve travar o perfil Proprietário', async () => {
    logado();
    api();
    render(<Perfis />);
    await userEvent.selectOptions(await screen.findByLabelText('Perfil'), 'p0');
    expect(screen.getByText('Perfil da conta da empresa')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do perfil')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar perfil' })).not.toBeInTheDocument();
  });

  it('deve mostrar os perfis só para leitura sem perfil:editar', async () => {
    logado(['funcionario:ler']);
    api();
    render(<Perfis />);
    expect(await screen.findByText('Somente leitura')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '+ Novo perfil' })).not.toBeInTheDocument();
  });
});
