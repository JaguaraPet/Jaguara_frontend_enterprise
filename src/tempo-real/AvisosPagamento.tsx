import { useEffect, useState } from 'react';
import type { components } from '../api/esquema';
import { Alerta } from '../componentes';
import { useUsuario } from '../sessao/useUsuario';
import { conectarTempoReal } from './tempoReal';
import type { ConectarTempoReal } from './tempoReal';

type Pagamento = components['schemas']['Pagamento'];

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Quantos avisos ficam na tela ao mesmo tempo. */
const MAXIMO_AVISOS = 3;

interface Props {
  conectar?: ConectarTempoReal;
}

/**
 * Avisa a empresa, em tempo real, quando o gateway confirma o pagamento de um serviço
 * (UC-44, DS-05). Os avisos ficam até a pessoa fechar.
 */
export function AvisosPagamento({ conectar = conectarTempoReal }: Props) {
  const usuario = useUsuario();
  const usuarioId = usuario?.id;
  const [avisos, setAvisos] = useState<Pagamento[]>([]);

  useEffect(() => {
    if (!usuarioId) return;
    const socket = conectar();
    socket.on('pagamento:atualizado', (pagamento: Pagamento) => {
      if (pagamento.status !== 'ACEITO') return;
      setAvisos((atuais) =>
        [...atuais.filter((a) => a.id !== pagamento.id), pagamento].slice(-MAXIMO_AVISOS),
      );
    });
    return () => {
      socket.disconnect();
    };
  }, [usuarioId, conectar]);

  if (avisos.length === 0) return null;
  return (
    <section className="avisos-tempo-real" aria-label="Avisos de pagamento">
      {avisos.map((aviso) => (
        <div key={aviso.id} className="avisos-tempo-real__item">
          <Alerta
            tipo="sucesso"
            titulo="Pagamento confirmado"
            mensagem={`${moeda.format(aviso.valor ?? 0)} pagos pelo tutor e confirmados pelo meio de pagamento.`}
          />
          <button
            type="button"
            className="avisos-tempo-real__fechar"
            aria-label="Fechar aviso de pagamento"
            onClick={() => setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id))}
          >
            Fechar
          </button>
        </div>
      ))}
    </section>
  );
}
