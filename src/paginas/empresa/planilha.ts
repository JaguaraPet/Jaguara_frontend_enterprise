import type { components } from '../../api/esquema';

export type LinhaImportacao = components['schemas']['LinhaImportacaoCliente'];

/** Cabeçalho do modelo de planilha que a empresa baixa e preenche. */
export const CABECALHO_MODELO = [
  'Nome',
  'Telefone',
  'E-mail',
  'CPF',
  'Observações',
  'Nome do pet',
  'Espécie',
  'Raça',
  'Sexo',
  'Nascimento',
];

export const MODELO_CSV = `${CABECALHO_MODELO.join(';')}\nMaria Souza;(11) 98888-0000;maria@exemplo.com;;Prefere atendimento de manhã;Thor;Cachorro;Labrador;M;10/03/2021\n`;

const normal = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Nomes de coluna aceitos para cada campo (sem acento, caixa e espaços). */
const COLUNAS: Record<keyof LinhaImportacao, string[]> = {
  nome: ['nome', 'cliente', 'nomedocliente', 'tutor', 'nomedotutor'],
  telefone: ['telefone', 'celular', 'whatsapp', 'fone', 'tel'],
  email: ['email', 'mail'],
  cpf: ['cpf'],
  observacoes: ['observacoes', 'observacao', 'obs', 'notas'],
  petNome: ['nomedopet', 'pet', 'animal', 'nomedoanimal'],
  petEspecie: ['especie', 'tipo', 'tipodeanimal'],
  petRaca: ['raca'],
  petSexo: ['sexo', 'sexodopet'],
  petNascimento: ['nascimento', 'datadenascimento', 'nascimentodopet'],
};

/** Lê um CSV com ";" ou ",", com aspas e quebras de linha dentro de aspas. */
export function lerCsv(texto: string): string[][] {
  const conteudo = texto.replace(/^﻿/, '');
  const primeira = conteudo.split(/\r?\n/, 1)[0] ?? '';
  const separador = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const c = conteudo[i];
    if (aspas) {
      if (c === '"' && conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && conteudo[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.some((v) => v.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((v) => v.trim())) linhas.push(linha);
  return linhas;
}

/** Converte as linhas do CSV nos campos da importação; a primeira linha é o cabeçalho. */
export function linhasDaPlanilha(tabela: string[][]): { linhas: LinhaImportacao[]; reconhecidas: string[] } {
  const [cabecalho = [], ...dados] = tabela;
  const indice: Partial<Record<keyof LinhaImportacao, number>> = {};
  cabecalho.forEach((titulo, i) => {
    const t = normal(titulo);
    for (const [campo, nomes] of Object.entries(COLUNAS) as [keyof LinhaImportacao, string[]][]) {
      if (indice[campo] === undefined && nomes.includes(t)) indice[campo] = i;
    }
  });
  const linhas = dados.map((valores) => {
    const linha: LinhaImportacao = { nome: '' };
    for (const [campo, i] of Object.entries(indice) as [keyof LinhaImportacao, number][]) {
      const valor = valores[i]?.trim();
      if (valor) linha[campo] = valor;
    }
    return linha;
  });
  return { linhas, reconhecidas: Object.keys(indice) };
}
