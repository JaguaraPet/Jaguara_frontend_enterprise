import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo } from '../../componentes';
import { useUsuario } from '../../sessao/useUsuario';
import { urlSite } from '../../site/enderecos';
import { mensagemDoErro } from '../admin/erros';
import '../admin/admin.css';
import './perfil-empresa.css';

type Perfil = components['schemas']['PerfilPublico'];
type Forma = components['schemas']['FormaPagamento'];

const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'PIX', rotulo: 'PIX' },
  { valor: 'CARTAO_CREDITO', rotulo: 'Cartão de crédito' },
  { valor: 'CARTAO_DEBITO', rotulo: 'Cartão de débito' },
  { valor: 'DINHEIRO', rotulo: 'Dinheiro' },
  { valor: 'BOLETO', rotulo: 'Boleto' },
];

/**
 * Perfil público da empresa: o que o tutor vê no app ao escolher onde agendar e na página
 * /e/{endereço}, que a empresa divulga no Instagram e no WhatsApp.
 */
export function PerfilEmpresa() {
  const usuario = useUsuario();
  const empresaId = usuario?.empresaId ?? '';
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; titulo: string; mensagem?: string } | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    let ativo = true;
    void api
      .GET('/empresas/{empresaId}/perfil-publico', { params: { path: { empresaId } } })
      .then(({ data, error }) => {
        if (!ativo) return;
        if (error) setAviso({ tipo: 'erro', titulo: 'Não foi possível abrir o perfil', mensagem: mensagemDoErro(error) });
        else setPerfil(data);
      });
    return () => {
      ativo = false;
    };
  }, [empresaId]);

  function mudar<K extends keyof Perfil>(campo: K, valor: Perfil[K]) {
    setPerfil((p) => (p ? { ...p, [campo]: valor } : p));
  }

  async function salvar(evento: FormEvent) {
    evento.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    const { data, error } = await api.PATCH('/empresas/{empresaId}/perfil-publico', {
      params: { path: { empresaId } },
      body: {
        slug: perfil.slug ?? undefined,
        descricao: perfil.descricao,
        telefonePublico: perfil.telefonePublico,
        whatsapp: perfil.whatsapp,
        instagram: perfil.instagram,
        horarioFuncionamento: perfil.horarioFuncionamento,
        formasPagamento: perfil.formasPagamento as Forma[],
        politicaCancelamento: perfil.politicaCancelamento,
      },
    });
    setSalvando(false);
    if (error) {
      setAviso({ tipo: 'erro', titulo: 'Perfil não salvo', mensagem: mensagemDoErro(error) });
      return;
    }
    setPerfil(data);
    setAviso({ tipo: 'sucesso', titulo: 'Perfil salvo', mensagem: 'Os tutores já veem as mudanças no app e na sua página.' });
  }

  if (!perfil) {
    return aviso ? (
      <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />
    ) : (
      <p className="carregando" role="status">
        Carregando…
      </p>
    );
  }

  const linkPagina = `${urlSite().replace(/\/site$/, '')}/e/${perfil.slug ?? ''}`;

  return (
    <div className="pagina perfil-empresa">
      <header className="perfil-empresa__topo">
        <div>
          <h1>Perfil da empresa</h1>
          <p className="pagina__descricao">
            É o que o tutor vê no app ao escolher onde agendar, e a sua página para divulgar.
          </p>
        </div>
        {perfil.slug && (
          <a className="perfil-empresa__ver" href={linkPagina} target="_blank" rel="noreferrer">
            Ver minha página
          </a>
        )}
      </header>

      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      <form className="perfil-empresa__form" onSubmit={(e) => void salvar(e)}>
        <section className="perfil-empresa__bloco" aria-labelledby="titulo-pagina">
          <h2 id="titulo-pagina">Sua página</h2>
          <Campo
            rotulo="Endereço da página"
            ajuda={`Fica assim: ${linkPagina}. Use letras minúsculas, números e hífens.`}
            value={perfil.slug ?? ''}
            onChange={(e) => mudar('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          />
          <label className="admin__selecao">
            Sobre a empresa
            <textarea
              rows={4}
              maxLength={1500}
              placeholder="Conte o que vocês fazem, a equipe e o que diferencia o atendimento."
              value={perfil.descricao ?? ''}
              onChange={(e) => mudar('descricao', e.target.value)}
            />
          </label>
        </section>

        <section className="perfil-empresa__bloco" aria-labelledby="titulo-contato">
          <h2 id="titulo-contato">Contato e horário</h2>
          <div className="perfil-empresa__grade">
            <Campo
              rotulo="Telefone"
              value={perfil.telefonePublico ?? ''}
              onChange={(e) => mudar('telefonePublico', e.target.value)}
            />
            <Campo rotulo="WhatsApp" value={perfil.whatsapp ?? ''} onChange={(e) => mudar('whatsapp', e.target.value)} />
            <Campo
              rotulo="Instagram"
              placeholder="@suaclinica"
              value={perfil.instagram ?? ''}
              onChange={(e) => mudar('instagram', e.target.value)}
            />
          </div>
          <Campo
            rotulo="Horário de funcionamento"
            placeholder="Segunda a sexta, das 8h às 18h · Sábado, das 8h às 12h"
            value={perfil.horarioFuncionamento ?? ''}
            onChange={(e) => mudar('horarioFuncionamento', e.target.value)}
          />
          <p className="perfil-empresa__endereco">
            Endereço: {perfil.enderecoLogradouro}, {perfil.enderecoNumero} · {perfil.enderecoBairro},{' '}
            {perfil.enderecoCidade} - {perfil.enderecoUf}
          </p>
        </section>

        <section className="perfil-empresa__bloco" aria-labelledby="titulo-regras">
          <h2 id="titulo-regras">Pagamento e cancelamento</h2>
          <fieldset className="perfil-empresa__formas">
            <legend>Formas de pagamento aceitas</legend>
            {FORMAS.map((f) => (
              <label key={f.valor}>
                <input
                  type="checkbox"
                  checked={perfil.formasPagamento.includes(f.valor)}
                  onChange={(e) =>
                    mudar(
                      'formasPagamento',
                      e.target.checked
                        ? [...perfil.formasPagamento, f.valor]
                        : perfil.formasPagamento.filter((x) => x !== f.valor),
                    )
                  }
                />
                {f.rotulo}
              </label>
            ))}
          </fieldset>
          <label className="admin__selecao">
            Política de cancelamento
            <textarea
              rows={3}
              maxLength={1500}
              placeholder="Ex.: cancele ou remarque pelo app até 2 horas antes, sem custo."
              value={perfil.politicaCancelamento ?? ''}
              onChange={(e) => mudar('politicaCancelamento', e.target.value)}
            />
          </label>
        </section>

        <div>
          <Botao type="submit" carregando={salvando}>
            Salvar perfil
          </Botao>
        </div>
      </form>
    </div>
  );
}
