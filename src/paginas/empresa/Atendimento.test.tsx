import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { RegistrarAtendimento } from './Atendimento';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const servicos = [
  { id: 's1', nome: 'Consulta', descricao: '', categoria: 'CONSULTA', preco: 150, duracaoMinutos: 30, ativo: true },
  { id: 's2', nome: 'Vacina V10', descricao: '', categoria: 'VACINACAO', preco: 90, duracaoMinutos: 15, ativo: true },
];

function abrir() {
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/agenda/a1/atendimento', state: { servicoId: 's1', servicoNome: 'Consulta', petNome: 'Thor' } }]}
    >
      <Routes>
        <Route path="/agenda/:agendamentoId/atendimento" element={<RegistrarAtendimento />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Banho de pet sem a carteira liberada para a clínica: o atendimento vale só a cobrança. */
const detalhe = {
  id: 'ag1',
  dataHoraInicio: '2026-11-20T12:00:00Z',
  dataHoraFim: '2026-11-20T13:00:00Z',
  status: 'AGENDADO',
  servicoId: 's1',
  servicoNome: 'Banho',
  categoria: 'BANHO_TOSA',
  petId: 'p1',
  petNome: 'Thor',
  alergias: [],
  tutorNome: 'Ana',
  profissionalNome: null,
  empresaNome: 'Pet Shop',
  podeRegistrarSaude: false,
};

describe('UC-23 · Registrar atendimento na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function entrar() {
    vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
      id: 'f1',
      tipo: 'FUNCIONARIO',
      perfil: 'Profissional',
      empresaId: 'e1',
      permissoes: ['atendimento:ler', 'atendimento:editar'],
    });
  }

  it('CT-23-01: deve registrar o atendimento com o serviço agendado e um extra', async () => {
    entrar();
    let enviado: unknown;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/servicos')) return json(servicos);
        if (/\/agendamentos\/[^/]+$/.test(caminho)) return json(detalhe);
        if (entrada.method === 'POST') {
          enviado = JSON.parse(await entrada.text());
          return json(
            {
              id: 'at1',
              status: 'FINALIZADO',
              procedimentosRealizados: 'Exame físico e vacina',
              total: 240,
              finalizadoEm: '2026-11-22T14:00:00Z',
              itens: [
                { servicoId: 's1', quantidade: 1, valorUnitario: 150 },
                { servicoId: 's2', quantidade: 1, valorUnitario: 90 },
              ],
            },
            201,
          );
        }
        return json({ title: 'Não encontrado' }, 404);
      }),
    );
    abrir();
    expect(await screen.findByText('Thor · Consulta')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Procedimentos realizados'), 'Exame físico e vacina');
    await screen.findByRole('option', { name: /Vacina V10/ });
    await userEvent.selectOptions(screen.getByLabelText('Serviço extra'), 's2');
    await userEvent.click(screen.getByRole('button', { name: 'Incluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar atendimento' }));
    expect(await screen.findByText('Atendimento registrado')).toBeInTheDocument();
    expect(enviado).toEqual({
      procedimentosRealizados: 'Exame físico e vacina',
      itens: [
        { servicoId: 's1', quantidade: 1 },
        { servicoId: 's2', quantidade: 1 },
      ],
    });
    expect(screen.getByText(/240,00/)).toBeInTheDocument();
  });

  it('CT-23-02: deve alterar o registro finalizado com justificativa', async () => {
    entrar();
    let enviado: unknown;
    const atendimento = {
      id: 'at1',
      status: 'FINALIZADO',
      procedimentosRealizados: 'Banho',
      total: 60,
      itens: [{ servicoId: 's1', quantidade: 1, valorUnitario: 60 }],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (caminho.endsWith('/servicos')) return json(servicos);
        if (/\/agendamentos\/[^/]+$/.test(caminho)) return json(detalhe);
        if (entrada.method === 'PATCH') {
          enviado = JSON.parse(await entrada.text());
          return json({ ...atendimento, procedimentosRealizados: 'Banho e tosa' });
        }
        return json(atendimento);
      }),
    );
    abrir();
    await userEvent.click(await screen.findByRole('button', { name: 'Alterar registro' }));
    await userEvent.clear(screen.getByLabelText('Procedimentos realizados'));
    await userEvent.type(screen.getByLabelText('Procedimentos realizados'), 'Banho e tosa');
    await userEvent.type(screen.getByLabelText('Justificativa'), 'Tosa feita e esquecida no registro');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alteração' }));
    expect(await screen.findByText('Atendimento alterado')).toBeInTheDocument();
    expect(enviado).toMatchObject({ procedimentosRealizados: 'Banho e tosa', justificativa: 'Tosa feita e esquecida no registro' });
    expect(screen.getByText('Banho e tosa')).toBeInTheDocument();
  });
});
