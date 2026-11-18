import { useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  titulo?: string;
  subtitulo?: string;
  children?: ReactNode;
}

/** Cartão sobre a cor de superfície do UX-02, para agrupar informações. */
export function Cartao({ titulo, subtitulo, children, className, ...props }: Props) {
  const idTitulo = useId();
  return (
    <section
      className={['cartao', className].filter(Boolean).join(' ')}
      aria-labelledby={titulo ? idTitulo : undefined}
      {...props}
    >
      {titulo && (
        <h2 id={idTitulo} className="cartao__titulo">
          {titulo}
        </h2>
      )}
      {subtitulo && <p className="cartao__subtitulo">{subtitulo}</p>}
      {children}
    </section>
  );
}
