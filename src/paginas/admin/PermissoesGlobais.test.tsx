import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PermissoesGlobais } from './PermissoesGlobais';

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json' },
    }),
  );

const catalogo = [
  { codigo: 'pet:ler', modulo: 'pet', descricao: 'Ver os próprios pets', categoria: 'TUTOR' },
  { codigo: 'privacidade:solicitar', modulo: 'privacidade', descricao: 'Pedir exportação e exclusão', categoria: 'TUTOR' },
  { codigo: 'chat:usar', modulo: 'comunicacao', descricao: 'Usar o chat' },
  { codigo: 'admin:usuarios', modulo: 'administracao', descricao: 'Gerenciar contas', categoria: 'ADMINISTRADOR' },
];

describe('UC-29 · Permissões globais na web', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function servidor(resposta: (corpo: { permissoes: string[] }) => Promise<Response>) {
    const tutor = { id: 'pt', nome: 'Tutor', categoria: 'TUTOR', permissoes: ['pet:ler'], usuarios: 12 };
    const enviados: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: Request) => {
        const caminho = new URL(entrada.url).pathname;
        if (entrada.method === 'PUT') {
          const corpo = JSON.parse(await entrada.text()) as { permissoes: string[] };
          enviados.push(corpo);
          return resposta(corpo).then((r) => {
            if (r.ok) tutor.permissoes = corpo.permissoes;
            return r;
          });
        }
        return json(caminho.endsWith('/permissoes') ? catalogo : [tutor]);
      }),
    );
    return enviados;
  }

  it('CT-29-01: deve conceder a permissão de exportar ao perfil Tutor', async () => {
    const enviados = servidor((corpo) => json({ id: 'pt', nome: 'Tutor', categoria: 'TUTOR', permissoes: corpo.permissoes, usuarios: 12 }));
    render(<PermissoesGlobais />);
    expect(await screen.findByLabelText(/Ver os próprios pets/)).toBeChecked();
    // Só aparecem as permissões que cabem no perfil Tutor.
    expect(screen.queryByLabelText(/Gerenciar contas/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Usar o chat/)).not.toBeChecked();
    await userEvent.click(screen.getByLabelText(/Pedir exportação e exclusão/));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    expect(await screen.findByText('Permissões de Tutor alteradas')).toBeInTheDocument();
    expect(screen.getByText(/12 contas com este perfil/)).toBeInTheDocument();
    expect(enviados[0]).toEqual({ permissoes: ['pet:ler', 'privacidade:solicitar'] });
  });

  it('CT-29-02: deve avisar e mostrar a recusa ao deixar o perfil sem permissão', async () => {
    servidor(() => json({ title: 'Dados inválidos', detail: 'O perfil precisa de ao menos uma permissão.' }, 422));
    render(<PermissoesGlobais />);
    await userEvent.click(await screen.findByLabelText(/Ver os próprios pets/));
    expect(screen.getByText('Marque ao menos uma permissão')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar permissões' }));
    expect(await screen.findByText('Permissões não alteradas')).toBeInTheDocument();
    expect(screen.getByText('O perfil precisa de ao menos uma permissão.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }));
    expect(screen.getByLabelText(/Ver os próprios pets/)).toBeChecked();
  });
});
