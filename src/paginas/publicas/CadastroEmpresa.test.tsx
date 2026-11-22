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

function servidor(resposta: () => Promise<Response>) {
  const enviados: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const url = new URL(entrada.url);
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

async function preencher(senha = 'senhaForte1') {
  await userEvent.type(screen.getByLabelText('Razão social'), 'Patas Clínica Veterinária Ltda');
  await userEvent.type(screen.getByLabelText('Nome fantasia'), 'Patas');
  await userEvent.type(screen.getByLabelText('CNPJ'), '11.222.333/0001-81');
  await userEvent.type(screen.getByLabelText('CEP'), '01310-100');
  await userEvent.type(screen.getByLabelText('Logradouro'), 'Av. Paulista');
  await userEvent.type(screen.getByLabelText('Número'), '1000');
  await userEvent.type(screen.getByLabelText('Bairro'), 'Bela Vista');
  await userEvent.type(screen.getByLabelText('Cidade'), 'São Paulo');
  await userEvent.type(screen.getByLabelText('E-mail'), 'contato@patas.com.br');
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.type(screen.getByLabelText('Repita a senha'), senha);
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

  it('CT-32-01: deve cadastrar e pedir a confirmação do e-mail', async () => {
    const enviados = servidor(() => json({ id: 'u1', email: 'contato@patas.com.br', status: 'PENDENTE_CONFIRMACAO' }, 201));
    abrir();
    expect(await screen.findByText('Termos da Enterprise (versão 1.0)')).toBeInTheDocument();
    await preencher();
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
  });

  it('CT-32-02: deve avisar que o CNPJ já está em uso', async () => {
    servidor(() => json({ title: 'Este CNPJ já tem cadastro no Jaguara.', codigo: 'RN01_CNPJ_EM_USO' }, 409));
    abrir();
    await preencher();
    await userEvent.click(screen.getByLabelText(/Li e aceito/));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar empresa' }));
    expect(await screen.findByText('Este CNPJ já tem cadastro no Jaguara.')).toBeInTheDocument();
  });

  it('deve barrar senha fraca antes de enviar', async () => {
    const enviados = servidor(() => json({}, 201));
    abrir();
    await preencher('fraca');
    await userEvent.click(screen.getByLabelText(/Li e aceito/));
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar empresa' }));
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres.')).toBeInTheDocument();
    expect(enviados).toHaveLength(0);
  });
});
