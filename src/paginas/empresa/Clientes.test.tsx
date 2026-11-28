import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { Clientes } from './Clientes';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(status === 204 ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const especies = [{ id: 'c', nome: 'Cachorro', racas: [{ id: 'srd', nome: 'SRD' }] }];

function servidor(clientes: Record<string, unknown>[], post: (corpo: Record<string, unknown>, caminho: string) => Promise<Response>) {
  const enviados: { caminho: string; corpo: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request | string) => {
      // Envio do arquivo direto ao armazenamento (URL assinada).
      if (typeof entrada === 'string') {
        enviados.push({ caminho: `PUT ${entrada}`, corpo: null });
        return new Response(null, { status: 200 });
      }
      const caminho = new URL(entrada.url).pathname.replace('/v1', '');
      if (entrada.method === 'GET') return json(caminho === '/especies' ? especies : clientes);
      const texto = await entrada.text();
      const corpo = (texto ? JSON.parse(texto) : {}) as Record<string, unknown>;
      enviados.push({ caminho, corpo });
      return post(corpo, caminho);
    }),
  );
  return enviados;
}

describe('UC-21 · Clientes na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function entrar() {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'e1',
      tipo: 'EMPRESA',
      perfil: 'Proprietário',
      empresaId: 'e1',
      permissoes: ['cliente:ler', 'cliente:editar'],
    });
  }

  it('CT-21-01: deve cadastrar com o termo assinado no balcão e cadastrar o pet', async () => {
    entrar();
    const clientes: Record<string, unknown>[] = [];
    const enviados = servidor(clientes, (corpo, caminho) => {
      if (caminho.endsWith('/pets')) return json({ id: 'p1', nome: corpo.nome }, 201);
      const novo = { id: 'c1', codigo: 'CLI-001', nome: corpo.nome, email: corpo.email, possuiConta: false, ativo: true, consentimento: 'VIGENTE', possuiTermoAnexado: true };
      clientes.push(novo);
      return json({ ...novo, urlEnvioTermo: 'https://s3/termo' }, 201);
    });
    render(<Clientes />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo cliente' }));
    await screen.findByText('Nenhum cliente cadastrado');
    await userEvent.type(screen.getByLabelText('Nome'), 'Carla Souza');
    await userEvent.type(screen.getByLabelText('E-mail'), 'carla@exemplo.com');
    await userEvent.click(screen.getByLabelText('O cliente assinou o termo no balcão'));
    await userEvent.upload(
      screen.getByLabelText('Termo assinado (PDF ou foto, até 10 MB)'),
      new File(['%PDF'], 'termo.pdf', { type: 'application/pdf' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
    expect(await screen.findByText('Carla Souza cadastrado')).toBeInTheDocument();
    expect(enviados[0].corpo).toEqual({
      nome: 'Carla Souza',
      email: 'carla@exemplo.com',
      meioConsentimento: 'ASSINATURA_PRESENCIAL',
      evidenciaArquivo: { nomeArquivo: 'termo.pdf', tamanhoBytes: 4 },
    });
    expect(enviados[1].caminho).toBe('PUT https://s3/termo');
    expect(await screen.findByRole('button', { name: 'Ver o termo assinado de Carla Souza' })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar pet de Carla Souza' }));
    await userEvent.type(screen.getByLabelText('Nome do pet'), 'Bolt');
    await userEvent.selectOptions(screen.getByLabelText('Raça'), 'srd');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar pet' }));
    expect(await screen.findByText('Bolt cadastrado para Carla Souza')).toBeInTheDocument();
    expect(enviados[2]).toEqual({
      caminho: '/empresas/e1/clientes/c1/pets',
      corpo: { nome: 'Bolt', racaId: 'srd', sexo: 'MACHO', castrado: false },
    });
  });

  it('CT-21-02: deve deixar o pré-cadastro sem pet até o aceite do termo', async () => {
    entrar();
    const clientes = [
      { id: 'c2', codigo: 'CLI-002', nome: 'Davi', possuiConta: false, ativo: true, consentimento: 'PENDENTE', linkTermo: 'https://web/termo/abc' },
    ];
    servidor(clientes, () => json({ ...clientes[0], id: 'c3', nome: 'Eva' }, 201));
    render(<Clientes />);
    await userEvent.click(await screen.findByRole('button', { name: '+ Novo cliente' }));
    const linha = (await screen.findByText('Davi')).closest('tr')!;
    expect(within(linha).getByText('Aguardando o aceite')).toBeInTheDocument();
    expect(within(linha).getByRole('button', { name: 'Cadastrar pet de Davi' })).toBeDisabled();
    expect(within(linha).getByRole('link', { name: 'link do termo' })).toHaveAttribute('href', 'https://web/termo/abc');

    await userEvent.type(screen.getByLabelText('Nome'), 'Eva');
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar cliente' }));
    expect(await screen.findByText('Pré-cadastro aguardando o aceite')).toBeInTheDocument();
  });

  it('CT-21-06: deve registrar a revogação pedida pelo cliente', async () => {
    entrar();
    const clientes = [{ id: 'c1', codigo: 'CLI-001', nome: 'Carla', possuiConta: true, ativo: true, consentimento: 'VIGENTE' }];
    const enviados = servidor(clientes, () => json(null, 204));
    render(<Clientes />);
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar revogação de Carla' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar revogação' }));
    expect(await screen.findByText('Revogação registrada')).toBeInTheDocument();
    expect(enviados[0].caminho).toBe('/empresas/e1/clientes/c1/consentimento/revogacao');
  });
});
