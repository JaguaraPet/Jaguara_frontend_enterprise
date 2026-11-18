import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Alerta, Botao, Campo } from '.';

describe('Botao', () => {
  it('deve chamar a ação quando é clicado', async () => {
    const aoClicar = vi.fn();
    render(<Botao onClick={aoClicar}>Salvar</Botao>);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoClicar).toHaveBeenCalledTimes(1);
  });

  it('não deve chamar a ação quando está desabilitado', async () => {
    const aoClicar = vi.fn();
    render(
      <Botao disabled onClick={aoClicar}>
        Salvar
      </Botao>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it('deve ficar ocupado e desabilitado quando está carregando', () => {
    render(<Botao carregando>Enviar</Botao>);
    const botao = screen.getByRole('button', { name: 'Enviar' });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Campo', () => {
  it('deve ligar o rótulo ao campo', () => {
    render(<Campo rotulo="CNPJ" />);
    expect(screen.getByLabelText('CNPJ')).toBeInTheDocument();
  });

  it('deve marcar o campo como inválido e descrever o erro quando há erro', () => {
    render(<Campo rotulo="CNPJ" erro="CNPJ inválido." />);
    const campo = screen.getByLabelText('CNPJ');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('CNPJ inválido.');
    expect(screen.getByRole('alert')).toHaveTextContent('CNPJ inválido.');
  });
});

describe('Alerta', () => {
  it('deve trazer texto além da cor quando mostra uma alergia grave', () => {
    render(<Alerta tipo="erro" titulo="Alergia grave" mensagem="Dipirona" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Erro: Alergia grave');
  });
});
