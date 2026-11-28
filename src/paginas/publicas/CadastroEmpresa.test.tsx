import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CadastroEmpresa } from './CadastroEmpresa';
import { problemaNaSenha } from './senha';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

function servidor(resposta: () => Promise<Response>, cnpj: Record<string, unknown> = { elegivel: true, baseIndisponivel: true }) {
  const enviados: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const url = new URL(entrada.url);
      if (url.pathname.includes('/publico/cnpj/') && entrada.method === 'GET') {
        return json({ cnpj: '11222333000181', encontrado: false, jaCadastrado: false, ...cnpj });
      }
      if (url.pathname.endsWith('/termos/vigentes')) {
        const tipo = url.searchParams.get('tipo');
        return json([{ id: tipo, tipo, versao: '1.0', titulo: tipo === 'TERMOS_ENTERPRISE' ? 'Termos da Enterprise' : 'Política de privacidade', conteudo: 'Texto' }]);
      }
      enviados.push(JSON.parse(await entrada.text()));
      return resposta();
    }),
  );
  return enviados;
}

const continuar = () => userEvent.click(screen.getByRole('button', { name: 'Continuar' }));

async function preencher(senha = 'senhaForte1') {
  await userEvent.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81');
  await userEvent.type(screen.getByLabelText('Razão social'), 'Patas Clínica Veterinária Ltda');
  await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Patas');
  await continuar();
  await userEvent.type(screen.getByLabelText('CEP'), '01310-100');
  await userEvent.type(screen.getByLabelText('Logradouro'), 'Av. Paulista');
  await userEvent.type(screen.getByLabelText('Número'), '1000');
  await userEvent.type(screen.getByLabelText('Bairro'), 'Bela Vista');
  await userEvent.type(screen.getByLabelText('Cidade'), 'São Paulo');
  await continuar();
  await userEvent.type(screen.getByLabelText('Seu nome completo'), 'Ana Lima');
  await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.com.br');
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.type(screen.getByLabelText('Repita a senha'), senha);
  await continuar();
}

const abrir = () =>
  render(
    <MemoryRouter>
      <CadastroEmpresa />
    </MemoryRouter>,
  );

describe('UC-32 · Cadastro da empresa na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve conferir a política de senha', () => {
    expect(problemaNaSenha('curta1')).toMatch(/8 caracteres/);
    expect(problemaNaSenha('somenteletras')).toMatch(/letras e números/);
    expect(problemaNaSenha('senhaForte1')).toBeNull();
  });

  // Percorre as quatro etapas do cadastro: com a máquina carregada passa dos 5 s padrão.
  it('CT-32-01: deve cadastrar e pedir a confirmação do e-mail', async () => {
    const enviados = servidor(() => json({ id: 'u1', email: 'contato@patas.com.br', status: 'PENDENTE_CONFIRMACAO' }, 201));
    abrir();
    await preencher();
    expect(await screen.findByText('Termos da Enterprise (versão 1.0)')).toBeInTheDocument();
    expect(screen.getByText(/Av\. Paulista, 1000/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar empresa' }));
    expect(screen.getByText(/aceite os termos/)).toBeInTheDocument();
    expect(enviados).toHaveLength(0);

    await userEvent.click(screen.getByLabelText(/Li e aceito/));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar empresa' }));
    expect(await screen.findByText('Confirme seu e-mail')).toBeInTheDocument();
    expect(enviados[0]).toMatchObject({
      cnpj: '11222333000181',
      tipo: 'CLINICA_VETERINARIA',
      endereco: { cep: '01310100', uf: 'SP', numero: '1000' },
      aceiteTermos: true,
    });
  }, 15_000);

  it('CT-32-02: deve avisar que o CNPJ já está em uso', async () => {
    servidor(() => json({ title: 'Este CNPJ já tem cadastro no Jaguara.', codigo: 'RN01_CNPJ_EM_USO' }, 409));
    abrir();
    await preencher();
    await userEvent.click(screen.getByLabelText(/Li e aceito/));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar empresa' }));
    expect(await screen.findByText('Este CNPJ já tem cadastro no Jaguara.')).toBeInTheDocument();
  }, 15000);

  it('deve barrar senha fraca antes de enviar', async () => {
    const enviados = servidor(() => json({}, 201));
    abrir();
    await preencher('fraca');
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cadastrar empresa' })).not.toBeInTheDocument();
    expect(enviados).toHaveLength(0);
  });

  it('deve preencher pela Receita e oferecer a contestação do CNPJ já cadastrado', async () => {
    const enviados = servidor(() => json({ protocolo: 'p1' }, 201), {
      encontrado: true,
      jaCadastrado: false,
      elegivel: true,
      situacao: 'ATIVA',
      atividade: 'Atividades veterinárias',
      razaoSocial: 'Patas Clínica Veterinária Ltda',
      endereco: { cep: '01310100', logradouro: 'Avenida Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' },
    });
    abrir();
    await userEvent.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81');
    await userEvent.tab();
    expect(await screen.findByText('Atividade: Atividades veterinárias.')).toBeInTheDocument();
    expect(screen.getByLabelText('Razão social')).toHaveValue('Patas Clínica Veterinária Ltda');
    await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Patas');
    await continuar();
    expect(screen.getByText(/Trouxemos o endereço do CNPJ/)).toBeInTheDocument();
    expect(screen.getByLabelText('Logradouro')).toHaveValue('Avenida Paulista');
    expect(enviados).toHaveLength(0);
  });

  it('deve receber a contestação quando o CNPJ já tem dono', async () => {
    const enviados = servidor(() => json({ protocolo: 'p1' }, 201), { encontrado: true, jaCadastrado: true, elegivel: false });
    abrir();
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    await userEvent.tab();
    expect(await screen.findByText('Este CNPJ já está cadastrado. É seu?')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Seu nome'), 'Ana Lima');
    await userEvent.type(screen.getByLabelText('Seu e-mail'), 'ana@patas.com.br');
    await userEvent.type(screen.getByLabelText('Como você se liga à empresa?'), 'Sou a sócia.');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(await screen.findByText('Pedido recebido')).toBeInTheDocument();
    expect(enviados[0]).toEqual({ nome: 'Ana Lima', email: 'ana@patas.com.br', mensagem: 'Sou a sócia.' });
  });

  it('deve segurar cada etapa até ela estar completa e voltar sem perder o que foi digitado', async () => {
    servidor(() => json({}, 201));
    abrir();
    await continuar();
    expect(screen.getByText('Informe o CNPJ com os 14 números.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1. Empresa' })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    await userEvent.type(screen.getByLabelText('Razão social'), 'Patas Ltda');
    await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Patas');
    await continuar();
    expect(screen.getByRole('heading', { name: '2. Endereço' })).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('Nome fantasia')).toHaveValue('Patas');
  });

  it('deve bloquear o avanço quando o CNPJ não pode se cadastrar', async () => {
    servidor(() => json({}, 201), { encontrado: true, jaCadastrado: false, elegivel: false, motivo: 'CNPJ baixado.' });
    abrir();
    await userEvent.type(screen.getByLabelText('CNPJ'), '11222333000181');
    await userEvent.tab();
    expect(await screen.findByText('CNPJ baixado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });
});
