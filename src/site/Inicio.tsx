import { Link } from 'react-router';
import { caminhoSite, URL_APK, urlEnterprise, urlTutor } from './enderecos';

const PASSOS = [
  {
    titulo: 'Agende pelo app',
    texto: 'O tutor encontra a clínica ou o pet shop, vê os horários livres e pede o agendamento.',
    icone: '📅',
  },
  {
    titulo: 'Receba o lembrete',
    texto: 'Um dia antes e duas horas antes, com “confirmar presença” num toque. A clínica vê quem confirmou.',
    icone: '🔔',
  },
  {
    titulo: 'Atendimento registrado',
    texto: 'A clínica registra a vacina, o exame ou a receita no próprio atendimento.',
    icone: '🩺',
  },
  {
    titulo: 'A carteira se atualiza',
    texto: 'A vacina chega ao app com o selo da clínica e o lembrete da próxima dose já marcado.',
    icone: '✅',
  },
];

const PARA_TUTORES = [
  ['Carteira de vacinação', 'Com o selo da clínica que aplicou e o lembrete da próxima dose.'],
  ['Remédios na hora certa', 'Lembrete de cada dose do tratamento, para toda a família.'],
  ['Saúde num lugar só', 'Exames, alergias, documentos, alimentação, despesas e a linha do tempo do pet.'],
  ['Agenda com as clínicas', 'Pedidos de agendamento, confirmação de presença e pagamento pelo app.'],
  ['Você decide quem vê', 'Compartilhe só o que quiser, com quem quiser, e desfaça quando quiser.'],
  ['Para a família toda', 'Mais de um responsável por pet, cada um com o próprio acesso.'],
];

const PERGUNTAS = [
  ['O app é pago?', 'Não. O app do tutor é gratuito. Quem paga é a empresa que usa o Jaguara Enterprise.'],
  [
    'A clínica vê todos os dados do meu pet?',
    'Só o que você compartilhar, e só enquanto você quiser. Vacinas, exames e alergias ficam fechados até você liberar.',
  ],
  ['Tem para iPhone?', 'Ainda não na App Store. No iPhone, use o Jaguara pelo navegador e adicione à tela de início.'],
  [
    'Meus dados estão seguros?',
    'Dados sensíveis, como o CPF, ficam cifrados. Tudo segue a LGPD, com consentimento registrado e auditoria.',
  ],
];

/** Homepage (jaguarapet.com.br): dois caminhos iguais no topo, tutor e empresa. */
export function Inicio() {
  return (
    <>
      <section className="site-heroi">
        <div className="site-heroi__conteudo">
          <p className="site-sobretitulo">Para tutores e para quem cuida de pets</p>
          <h1>A vida do seu pet num lugar só, levada a qualquer clínica.</h1>
          <p className="site-heroi__texto">
            O Jaguara liga o tutor à clínica e ao pet shop: agendamento, lembrete, atendimento e
            carteira de saúde, tudo conversando.
          </p>
          <div className="site-caminhos">
            <article className="site-caminho">
              <span className="site-caminho__icone" aria-hidden="true">
                🐶
              </span>
              <h2>Para tutores</h2>
              <p>Vacinas, remédios, consultas e lembretes do seu pet, de graça.</p>
              <div className="site-caminho__acoes">
                {URL_APK ? (
                  <a className="site-botao" href={URL_APK}>
                    Baixar para Android
                  </a>
                ) : (
                  <span className="site-botao site-botao--desativado" aria-disabled="true">
                    Android em breve
                  </span>
                )}
                <a className="site-botao site-botao--contorno" href={urlTutor()}>
                  Usar no navegador
                </a>
              </div>
            </article>
            <article className="site-caminho site-caminho--empresa">
              <span className="site-caminho__icone" aria-hidden="true">
                🏥
              </span>
              <h2>Para empresas</h2>
              <p>Agenda, clientes, atendimento e pagamentos para clínicas e pet shops.</p>
              <div className="site-caminho__acoes">
                <Link className="site-botao" to={caminhoSite('/empresas')}>
                  Conhecer o Enterprise
                </Link>
                <a className="site-botao site-botao--contorno" href={`${urlEnterprise()}/demonstracao`}>
                  Ver a demonstração
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="site-secao" aria-labelledby="como-funciona">
        <div className="site-secao__conteudo">
          <p className="site-sobretitulo">Como funciona</p>
          <h2 id="como-funciona">Do agendamento à carteira, sem digitar duas vezes</h2>
          <ol className="site-passos">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="site-passo">
                <span className="site-passo__numero">{i + 1}</span>
                <span className="site-passo__icone" aria-hidden="true">
                  {p.icone}
                </span>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-secao site-secao--suave" id="tutores" aria-labelledby="titulo-tutores">
        <div className="site-secao__conteudo">
          <p className="site-sobretitulo">Para tutores</p>
          <h2 id="titulo-tutores">Tudo o que o seu pet precisa, sem papel e sem esquecer</h2>
          <div className="site-grade">
            {PARA_TUTORES.map(([titulo, texto]) => (
              <article key={titulo} className="site-cartao">
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-secao site-faixa" aria-labelledby="titulo-empresas">
        <div className="site-secao__conteudo site-faixa__conteudo">
          <div>
            <p className="site-sobretitulo">Para clínicas e pet shops</p>
            <h2 id="titulo-empresas">A agenda que enche sozinha e o cliente que não falta</h2>
            <p>
              Lembrete com confirmação, pedidos pelo app, atendimento que vira carteira de vacinação e a
              lista de quem avisar sobre vacina vencendo.
            </p>
          </div>
          <div className="site-faixa__acoes">
            <a className="site-botao site-botao--claro" href={`${urlEnterprise()}/demonstracao`}>
              Experimentar a demonstração
            </a>
            <Link className="site-botao site-botao--contorno-claro" to={caminhoSite('/empresas')}>
              Ver planos
            </Link>
          </div>
        </div>
      </section>

      <section className="site-secao" aria-labelledby="titulo-seguranca">
        <div className="site-secao__conteudo site-duas-colunas">
          <div>
            <p className="site-sobretitulo">Segurança e privacidade</p>
            <h2 id="titulo-seguranca">Os dados são do tutor</h2>
            <p>
              O tutor escolhe o que cada clínica vê e pode desfazer o compartilhamento a qualquer momento.
              CPF cifrado, senhas protegidas com Argon2, consentimento registrado e auditoria de tudo o que
              muda. Tudo de acordo com a LGPD.
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
