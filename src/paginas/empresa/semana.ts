/** Datas da agenda semanal (UC-24), sempre como AAAA-MM-DD no fuso do navegador. */

const DIA_MS = 86_400_000;

function local(data: string): Date {
  return new Date(`${data}T12:00:00`);
}

function texto(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Segunda-feira da semana que contém a data. */
export function inicioDaSemana(data: Date): string {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12);
  const desdeSegunda = (d.getDay() + 6) % 7;
  return texto(new Date(d.getTime() - desdeSegunda * DIA_MS));
}

export function somarDias(data: string, dias: number): string {
  return texto(new Date(local(data).getTime() + dias * DIA_MS));
}

/** Os sete dias da semana, de segunda a domingo. */
export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

/** Dia (AAAA-MM-DD) em que um instante ISO cai, no fuso do navegador. */
export function diaDoInstante(iso: string): string {
  return texto(new Date(iso));
}

const formatoDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const formatoMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const formatoHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const rotuloDia = (data: string) => formatoDia.format(local(data)).replace('.', '');
export const hora = (iso: string) => formatoHora.format(new Date(iso));

/** "17 a 23 de nov." para o cabeçalho da semana. */
export function rotuloSemana(segunda: string): string {
  const fim = local(somarDias(segunda, 6));
  return `${local(segunda).getDate()} a ${formatoMes.format(fim)}`;
}
