import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessao } from '../../api/sessao';
import { PerfilPet } from './PerfilPet';
import { PetsVinculados } from './PetsVinculados';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const thor = {
  id: 'p1',
  nome: 'Thor',
  especie: 'Cachorro',
  raca: 'SRD',
  sexo: 'MACHO',
  idade: 3,
  status: 'ATIVO',
  motivos: ['COMPARTILHAMENTO'],
  secoes: ['vacinas', 'alergias'],
};

function entrar(permissoes = ['cliente:ler', 'atendimento:ler', 'atendimento:editar']) {
  vi.spyOn(sessao, 'usuario', 'get').mockReturnValue({
    id: 'f1',
    tipo: 'FUNCIONARIO',
    perfil: 'Profissional',
    empresaId: 'e1',
    permissoes,
  });
}

function abrirPerfil() {
  render(
    <MemoryRouter initialEntries={['/pets/p1']}>
      <Routes>
        <Route path="/pets/:petId" element={<PerfilPet />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UC-20, UC-22, UC-35 a UC-37 · Pets vinculados na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('CT-20-01: deve listar os pets com o motivo e as seções liberadas', async () => {
    entrar();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json([thor, { ...thor, id: 'p2', nome: 'Mia', motivos: ['AGENDAMENTO'], secoes: [] }])),
    );
    render(
      <MemoryRouter>
        <PetsVinculados />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Thor')).toBeInTheDocument();
    expect(screen.getByText('Compartilhado pelo tutor')).toBeInTheDocument();
    expect(screen.getByText('Liberado: Vacinas, Alergias')).toBeInTheDocument();
    expect(screen.getByText('Só o perfil básico')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Buscar por nome ou raça'), 'mia');
    expect(screen.queryByText('Thor')).not.toBeInTheDocument();
  });

  it('CT-22-01: deve mostrar só as seções liberadas e a alergia grave em destaque', async () => {
    entrar();
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) =>
        new URL(entrada.url).pathname.endsWith('/linha-do-tempo')
          ? json({ title: 'Acesso negado' }, 403)
          : json({
              ...thor,
              vacinas: [{ nomeVacina: 'V10', dataAplicacao: '2026-10-01' }],
              alergias: [{ tipo: 'RESTRICAO_MEDICAMENTOSA', descricao: 'Dipirona', gravidade: 'GRAVE' }],
            }),
      ),
    );
    abrirPerfil();
    expect(await screen.findByRole('heading', { name: 'Thor' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Dipirona');
    expect(screen.getByText('V10 · 01/10/2026')).toBeInTheDocument();
    expect(screen.queryByText('Exames')).not.toBeInTheDocument();
    // CT-35-02: sem o escopo da linha do tempo, a seção não aparece.
    expect(screen.queryByText('Linha do tempo')).not.toBeInTheDocument();
  });

  it('CT-37-02: deve mostrar a recusa ao registrar alergia sem edição clínica', async () => {
    entrar();
    vi.stubGlobal(
      'fetch',
      vi.fn((entrada: Request) => {
        if (entrada.method === 'POST') return json({ title: 'Acesso negado', detail: 'Peça ao tutor a edição clínica.' }, 403);
        if (new URL(entrada.url).pathname.endsWith('/linha-do-tempo')) {
          return json([{ tipo: 'VACINACAO', titulo: 'Vacina V10', data: '2026-10-01T12:00:00Z', referenciaId: 'v1' }]);
        }
        return json({ ...thor, vacinas: [], alergias: [] });
      }),
    );
    abrirPerfil();
    expect(await screen.findByText('Linha do tempo')).toBeInTheDocument();
    expect(screen.getByText(/Vacina V10/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Descrição'), 'Frango');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar alergia' }));
    expect(await screen.findByText('Alergia não registrada')).toBeInTheDocument();
    expect(screen.getByText('Peça ao tutor a edição clínica.')).toBeInTheDocument();
  });

  it('CT-22-02: deve mostrar que o pet não está liberado', async () => {
    entrar(['cliente:ler']);
    vi.stubGlobal('fetch', vi.fn(() => json({ title: 'Acesso negado', detail: 'O tutor não liberou este pet para a sua empresa.' }, 403)));
    abrirPerfil();
    expect(await screen.findByText('Perfil indisponível')).toBeInTheDocument();
    expect(screen.getByText('O tutor não liberou este pet para a sua empresa.')).toBeInTheDocument();
  });
});
