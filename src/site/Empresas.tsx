import { urlEnterprise } from './enderecos';

const RECURSOS = [
  ['Tela Hoje', 'Agenda do dia, pedidos para responder, cobranças em aberto e vacinas de clientes vencendo.'],
  ['Lembrete com confirmação', 'O tutor recebe o lembrete um dia e duas horas antes e confirma no app. Menos faltas.'],
  ['Pedidos pelo app', 'O tutor vê os horários livres de verdade e pede; você aceita ou recusa num clique.'],
  ['Atendimento que vira carteira', 'Vacina, exame e receita registrados no atendimento chegam ao app do tutor.'],
  ['Clientes e pets', 'Cadastro com ou sem conta, consentimento registrado e histórico de cada pet.'],
  ['Pagamentos', 'PIX, cartão e boleto pelo app, com aviso na hora em que o pagamento entra.'],
  ['Equipe e perfis', 'Cada funcionário vê só o que o perfil dele permite.'],
  ['Página da clínica', 'Um endereço jaguarapet.com.br/e/sua-clinica para pôr na bio do Instagram.'],
];

const PLANOS = [
  { nome: 'Essencial', usuarios: 'até 3 usuários', preco: '59', destaque: false },
  { nome: 'Equipe', usuarios: 'até 10 usuários', preco: '119', destaque: true },
  { nome: 'Clínica', usuarios: 'até 30 usuários', preco: '229', destaque: false },
];

const PERGUNTAS = [
  ['Preciso instalar alguma coisa?', 'Não. O Enterprise roda no navegador, no computador da recepção ou no tablet.'],
  [
    'Meus clientes precisam ter o app?',
    'Não. Você pode atender clientes sem conta; quem tem o app ganha lembretes, carteira e agendamento online.',
  ],
  ['Posso testar antes?', 'Sim. A demonstração cria uma clínica de exemplo só para você, sem cadastro.'],
  ['E acima de 30 usuários?', 'Fale com a gente: o plano é sob consulta.'],
];

/** Página de venda do Jaguara Enterprise (jaguarapet.com.br/empresas). */
export function Empresas() {
  return (
    <>
      <section className="site-heroi site-heroi--empresas">
        <div className="site-heroi__conteudo site-heroi__conteudo--estreito">
          <p className="site-sobretitulo">Jaguara Enterprise</p>
          <h1>A agenda que enche sozinha e o cliente que não falta.</h1>
          <p className="site-heroi__texto">
            Sistema para clínicas veterinárias e pet shops, ligado ao app que o seu cliente usa.
          </p>
          <div className="site-heroi__acoes">
            <a className="site-botao site-botao--grande" href={`${urlEnterprise()}/demonstracao`}>
              Experimentar a demonstração
            </a>
            <a className="site-botao site-botao--contorno site-botao--grande" href={`${urlEnterprise()}/cadastro`}>
              Cadastrar minha empresa
            </a>
          </div>
          <p className="site-heroi__nota">A demonstração cria uma clínica de exemplo, sem cadastro e sem cartão.</p>
        </div>
      </section>

      <section className="site-secao" aria-labelledby="titulo-recursos">
        <div className="site-secao__conteudo">
          <p className="site-sobretitulo">O que vem no Enterprise</p>
          <h2 id="titulo-recursos">Feito para o dia de uma clínica de verdade</h2>
          <div className="site-grade">
            {RECURSOS.map(([titulo, texto]) => (
              <article key={titulo} className="site-cartao">
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-secao site-secao--suave" aria-labelledby="titulo-planos">
        <div className="site-secao__conteudo">
          <p className="site-sobretitulo">Planos</p>
          <h2 id="titulo-planos">Pague pelo tamanho da sua equipe</h2>
          <div className="site-planos">
            {PLANOS.map((p) => (
              <article key={p.nome} className={`site-plano${p.destaque ? ' site-plano--destaque' : ''}`}>
                {p.destaque && <span className="site-plano__selo">Mais escolhido</span>}
                <h3>{p.nome}</h3>
                <p className="site-plano__usuarios">{p.usuarios}</p>
                <p className="site-plano__preco">
                  <span>R$</span> {p.preco}
                  <small>/mês</small>
                </p>
                <ul>
                  <li>Todos os recursos</li>
                  <li>App gratuito para os seus clientes</li>
                  <li>Suporte por e-mail</li>
                </ul>
                <a className="site-botao site-botao--largo" href={`${urlEnterprise()}/cadastro`}>
                  Começar
                </a>
              </article>
            ))}
          </div>
          <p className="site-planos__nota">Acima de 30 usuários, sob consulta.</p>
        </div>
      </section>

      <section className="site-secao" aria-labelledby="titulo-duvidas">
        <div className="site-secao__conteudo site-duas-colunas">
          <div>
            <p className="site-sobretitulo">Dúvidas</p>
            <h2 id="titulo-duvidas">Perguntas frequentes</h2>
            <p>
              Ficou alguma? Escreva para <a href="mailto:contato@jaguarapet.com.br">contato@jaguarapet.com.br</a>.
            </p>
          </div>
          <dl className="site-perguntas">
            {PERGUNTAS.map(([pergunta, resposta]) => (
              <div key={pergunta}>
                <dt>{pergunta}</dt>
                <dd>{resposta}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
