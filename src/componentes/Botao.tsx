import type { ButtonHTMLAttributes } from 'react';

type Variante = 'primaria' | 'secundaria' | 'perigo' | 'texto';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  carregando?: boolean;
  larguraTotal?: boolean;
}

/** Botão do UX-02 com estados padrão, hover, foco visível, desabilitado e carregando. */
export function Botao({
  variante = 'primaria',
  carregando = false,
  larguraTotal = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  const classes = [
    'botao',
    `botao--${variante}`,
    larguraTotal && 'botao--largura-total',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && <span className="botao__spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
