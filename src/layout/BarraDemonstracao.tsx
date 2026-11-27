import { useState } from 'react';
import { sessao } from '../api/sessao';

/** Abre o app do tutor (versão web) já com a tutora da mesma demonstração. */
function linkDoTutor(urlTutor: string, codigo: string): string {
  return `${urlTutor.replace(/\/$/, '')}/demonstracao?codigo=${encodeURIComponent(codigo)}`;
}

function horasRestantes(expiraEm: string): number {
  return Math.max(0, Math.round((new Date(expiraEm).getTime() - Date.now()) / 3_600_000));
}

/** Faixa fixa no topo enquanto a sessão for de uma demonstração. */
export function BarraDemonstracao() {
  const [demonstracao] = useState(() => sessao.demonstracao);
  if (!demonstracao) return null;
  const horas = horasRestantes(demonstracao.expiraEm);
  return (
    <div className="barra-demonstracao" role="note">
      <p>
        <strong>Clínica de demonstração.</strong> Os dados são fictícios e somem em{' '}
        {horas > 1 ? `${horas} horas` : 'menos de uma hora'}.
      </p>
      <div className="barra-demonstracao__acoes">
        {demonstracao.urlTutor && (
          <a
            href={linkDoTutor(demonstracao.urlTutor, demonstracao.codigoTutor)}
            target="_blank"
            rel="noreferrer"
          >
            Ver como tutor
          </a>
        )}
        {demonstracao.formularioOpiniao && (
          <a
            className="barra-demonstracao__opiniao"
            href={demonstracao.formularioOpiniao}
            target="_blank"
            rel="noreferrer"
          >
            Dar minha opinião
          </a>
        )}
      </div>
    </div>
  );
}
