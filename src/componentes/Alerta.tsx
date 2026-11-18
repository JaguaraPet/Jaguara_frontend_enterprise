type Tipo = 'sucesso' | 'alerta' | 'erro' | 'info';

interface Props {
  tipo: Tipo;
  titulo: string;
  mensagem?: string;
}

const visual: Record<Tipo, { icone: string; rotulo: string }> = {
  sucesso: { icone: '✓', rotulo: 'Sucesso' },
  alerta: { icone: '!', rotulo: 'Atenção' },
  erro: { icone: '✕', rotulo: 'Erro' },
  info: { icone: 'i', rotulo: 'Informação' },
};

/**
 * Alerta com cor, ícone e texto: a cor nunca é o único indicador (UX-02, seção 6).
 * Erros e alertas usam role="alert"; os demais, role="status".
 */
export function Alerta({ tipo, titulo, mensagem }: Props) {
  const v = visual[tipo];
  return (
    <div className={`alerta alerta--${tipo}`} role={tipo === 'erro' || tipo === 'alerta' ? 'alert' : 'status'}>
      <span className="alerta__icone" aria-hidden="true">
        {v.icone}
      </span>
      <div>
        <p className="alerta__titulo">
          <span className="visualmente-oculto">{v.rotulo}: </span>
          {titulo}
        </p>
        {mensagem && <p className="alerta__mensagem">{mensagem}</p>}
      </div>
    </div>
  );
}
