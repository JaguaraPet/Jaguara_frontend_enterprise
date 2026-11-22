import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { NovoAgendamento } from './NovoAgendamento';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const nove = '2026-11-25T12:00:00.000Z';
const dez = '2026-11-25T13:00:00.000Z';

function servidor(resposta: () => Promise<Response>) {
  const enviados: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: Request) => {
      const url = new URL(entrada.url);
      const caminho = url.pathname;
      if (entrada.method === 'POST') {
        enviados.push(JSON.parse(await entrada.text()));
        return resposta();
      }
      if (caminho.endsWith('/pets-vinculados')) {
        return json([{ id: 'p1', nome: 'Thor', especie: 'Cachorro', raca: 'SRD', sexo: 'MACHO', status: 'ATIVO', motivos: ['CLIENTE'], secoes: [] }]);
      }
      if (caminho.endsWith('/servicos')) {
        return json([{ id: 's1', nome: 'Banho', descricao: '', categoria: 'BANHO_TOSA', preco: 60, duracaoMinutos: 60, ativo: true }]);
      }
      if (caminho.endsWith('/funcionarios')) return json([{ id: 'f1', nome: 'Dra. Júlia', ativo: true }]);
      if (caminho.endsWith('/recursos')) return json([{ id: 'r1', nome: 'Sala de banho', tipo: 'SALA', ativo: true }]);
      if (caminho.endsWith('/horarios-disponiveis')) return json(url.searchParams.get('data') === '2026-11-25' ? [nove, dez] : []);
      return json([]);
    }),
  );
  return enviados;
}

async function preencher() {
  await userEvent.selectOptions(await screen.findByLabelText('Pet'), 'p1');
  await screen.findByRole('option', { name: /Banho/ });
  await userEvent.selectOptions(screen.getByLabelText('Serviço'), 's1');
  await userEvent.type(screen.getByLabelText('Data'), '2026-11-25');
  await userEvent.selectOptions(screen.getByLabelText('Recurso (opcional)'), 'r1');
  await userEvent.click(await screen.findByLabelText(new Date(nove).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })));
}

const abrir = () =>
  render(
    <MemoryRouter>
      <NovoAgendamento />
    </MemoryRouter>,
  );

describe('UC-39 · Novo agendamento na web', () => {
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
      permissoes: ['agenda:ler', 'agenda:editar'],
    });
  }

  it('CT-39-01: deve agendar no horário livre e avisar que o tutor foi notificado', async () => {
    entrar();
    const enviados = servidor(() => json({ id: 'a1', status: 'AGENDADO' }, 201));
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(await screen.findByText('Agendamento criado')).toBeInTheDocument();
    expect(screen.getByText(/O tutor foi avisado/)).toBeInTheDocument();
    expect(enviados[0]).toEqual({ petId: 'p1', servicoId: 's1', dataHoraInicio: nove, recursoId: 'r1' });
  });

  it('CT-39-02: deve mostrar a recusa por conflito de recurso', async () => {
    entrar();
    servidor(() => json({ title: 'Recurso ocupado neste horário', codigo: 'RN29_CONFLITO_RECURSO' }, 409));
    abrir();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }));
    expect(await screen.findByText('Agendamento não criado')).toBeInTheDocument();
    expect(screen.getByText('Recurso ocupado neste horário')).toBeInTheDocument();
  });

  it('deve avisar quando a data não tem horário livre', async () => {
    entrar();
    servidor(() => json({}, 201));
    abrir();
    await userEvent.selectOptions(await screen.findByLabelText('Pet'), 'p1');
    await screen.findByRole('option', { name: /Banho/ });
    await userEvent.selectOptions(screen.getByLabelText('Serviço'), 's1');
    await userEvent.type(screen.getByLabelText('Data'), '2026-11-26');
    expect(await screen.findByText('Nenhum horário livre nesta data.')).toBeInTheDocument();
  });
});
