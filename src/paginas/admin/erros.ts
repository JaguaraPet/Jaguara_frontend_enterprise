/** Texto para o usuário a partir do problem+json da API (campos inválidos ou detalhe). */
export function mensagemDoErro(erro: unknown): string {
  const problema = erro as {
    detail?: string;
    title?: string;
    campos?: { mensagem: string }[];
  };
  if (problema?.campos?.length) return problema.campos.map((c) => c.mensagem).join(' ');
  return problema?.detail ?? problema?.title ?? 'Tente de novo em instantes.';
}
