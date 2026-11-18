import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
  ajuda?: string;
}

/**
 * Campo com rótulo sempre visível (UX-02, seção 6). Erro e ajuda ficam ligados ao campo
 * por aria-describedby; o erro é anunciado pelo leitor de tela.
 */
export function Campo({ rotulo, erro, ajuda, id, ...props }: Props) {
  const gerado = useId();
  const idCampo = id ?? gerado;
  const idDescricao = erro || ajuda ? `${idCampo}-descricao` : undefined;
  return (
    <div className="campo">
      <label className="campo__rotulo" htmlFor={idCampo}>
        {rotulo}
      </label>
      <input
        id={idCampo}
        className="campo__entrada"
        aria-invalid={erro ? true : undefined}
        aria-describedby={idDescricao}
        {...props}
      />
      {erro ? (
        <p id={idDescricao} className="campo__erro" role="alert">
          {erro}
        </p>
      ) : ajuda ? (
        <p id={idDescricao} className="campo__ajuda">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}
