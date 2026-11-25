/** Textos dos pets vinculados e do perfil do pet na web (UC-20, UC-22). */

export const MOTIVO: Record<string, string> = {
  COMPARTILHAMENTO: 'Compartilhado pelo tutor',
  AGENDAMENTO: 'Tem agendamento',
  CLIENTE: 'Cliente da empresa',
};

export const SECAO: Record<string, string> = {
  vacinas: 'Vacinas',
  exames: 'Exames',
  medicamentos: 'Medicamentos',
  alergias: 'Alergias',
};

export const TIPO_ITEM: Record<string, string> = {
  VACINACAO: 'Vacina',
  EXAME: 'Exame',
  TRATAMENTO: 'Medicamento',
  EVENTO: 'Compromisso',
  ATENDIMENTO: 'Atendimento',
};

export const dataBr = (iso?: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');
