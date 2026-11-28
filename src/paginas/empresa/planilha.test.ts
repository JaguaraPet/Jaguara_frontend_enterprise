import { describe, expect, it } from 'vitest';
import { lerCsv, linhasDaPlanilha, MODELO_CSV } from './planilha';

describe('planilha de clientes', () => {
  it('deve ler o modelo com ponto e vírgula e reconhecer as colunas', () => {
    const { linhas, reconhecidas } = linhasDaPlanilha(lerCsv(MODELO_CSV));
    expect(reconhecidas).toContain('petEspecie');
    expect(linhas).toEqual([
      {
        nome: 'Maria Souza',
        telefone: '(11) 98888-0000',
        email: 'maria@exemplo.com',
        observacoes: 'Prefere atendimento de manhã',
        petNome: 'Thor',
        petEspecie: 'Cachorro',
        petRaca: 'Labrador',
        petSexo: 'M',
        petNascimento: '10/03/2021',
      },
    ]);
  });

  it('deve aceitar vírgula, aspas e cabeçalhos com outros nomes', () => {
    const csv = '﻿Cliente,Celular,Animal,Tipo\r\n"Souza, Ana",11999990000,Mimi,Gata\r\n\r\n';
    expect(linhasDaPlanilha(lerCsv(csv)).linhas).toEqual([
      { nome: 'Souza, Ana', telefone: '11999990000', petNome: 'Mimi', petEspecie: 'Gata' },
    ]);
  });
});
