import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/cliente';
import { Alerta } from '../../componentes';

interface Aviso {
  tipo: 'info' | 'alerta' | 'erro';
  titulo: string;
  mensagem: string;
  link?: { para: string; texto: string };
}

/**
 * Avisos da conta na tela Hoje, só para quem administra a empresa: verificação do cadastro
 * e situação do plano (teste acabando, pagamento atrasado).
 */
export function AvisosDaConta({ empresaId, podeVer }: { empresaId: string; podeVer: boolean }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    if (!podeVer || !empresaId) return;
    let ativo = true;
    const caminho = { params: { path: { empresaId } } };
    void Promise.all([
      api.GET('/empresas/{empresaId}/perfil-publico', caminho),
      api.GET('/empresas/{empresaId}/plano', caminho),
    ]).then(([perfil, plano]) => {
      if (!ativo) return;
      const lista: Aviso[] = [];
      if (perfil.data?.verificacao === 'EM_VERIFICACAO') {
        lista.push({
          tipo: 'info',
          titulo: 'Sua empresa está em verificação',
          mensagem:
            'Você já pode montar serviços, horários e equipe. Ela aparece para os tutores assim que a equipe Jaguara conferir o CNPJ.',
        });
      }
      if (perfil.data?.verificacao === 'RECUSADA') {
        lista.push({
          tipo: 'erro',
          titulo: 'Não conseguimos verificar sua empresa',
          mensagem: `${perfil.data.verificacaoMotivo ?? ''} Responda o e-mail que enviamos com o cartão CNPJ ou o contrato social.`.trim(),
        });
      }
      const p = plano.data;
      if (p?.status === 'TESTE' && p.diasDeTeste <= 3) {
        lista.push({
          tipo: p.diasDeTeste === 0 ? 'alerta' : 'info',
          titulo: p.diasDeTeste === 0 ? 'O teste grátis acabou' : `Faltam ${p.diasDeTeste} dias de teste grátis`,
          mensagem: 'Assine um plano para continuar convidando a equipe.',
          link: { para: '/plano', texto: 'Ver planos' },
        });
      }
      if (p?.status === 'ATRASADA') {
        lista.push({
          tipo: 'alerta',
          titulo: 'O pagamento da assinatura não passou',
          mensagem: 'Confira o cartão no Mercado Pago para não perder o acesso aos convites da equipe.',
          link: { para: '/plano', texto: 'Ver plano' },
        });
      }
      setAvisos(lista);
    });
    return () => {
      ativo = false;
    };
  }, [empresaId, podeVer]);

  return (
    <>
      {avisos.map((a) => (
        <div key={a.titulo}>
          <Alerta tipo={a.tipo} titulo={a.titulo} mensagem={a.mensagem} />
          {a.link && <Link to={a.link.para}>{a.link.texto}</Link>}
        </div>
      ))}
    </>
  );
}
