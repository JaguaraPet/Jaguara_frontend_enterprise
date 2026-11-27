import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ErroApi, sessao } from '../../api/sessao';
import { Alerta, Botao } from '../../componentes';
import './demonstracao.css';

/**
 * Entrada da demonstração: cria uma clínica só para quem visita, com uma semana de agenda,
 * clientes, vacinas e cobranças, e entra nela. Nada é enviado a clientes de verdade.
 */
export function Demonstracao() {
  const navegar = useNavigate();
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function comecar() {
    setErro(null);
    setCriando(true);
    try {
      await sessao.entrarNaDemonstracao();
      void navegar('/', { replace: true });
    } catch (falha) {
      setErro(
        falha instanceof ErroApi && falha.problema.status === 429
          ? 'Você já criou várias demonstrações nesta última hora. Tente de novo mais tarde.'
          : falha instanceof ErroApi && falha.problema.status === 404
            ? 'A demonstração não está disponível neste endereço.'
            : 'Não foi possível criar a demonstração agora. Tente de novo em instantes.',
      );
      setCriando(false);
    }
  }

  return (
    <main className="demonstracao">
      <section className="demonstracao__cartao">
        <p className="demonstracao__marca">Jaguara Enterprise</p>
        <h1>Experimente o Jaguara com uma clínica de exemplo</h1>
        <p>
          Criamos agora uma clínica só para você, já com uma semana de agenda, clientes, pets,
          vacinas e cobranças. Mexa à vontade: nada é enviado a ninguém, e ela some sozinha em
          dois dias.
        </p>
        <ul className="demonstracao__lista">
          <li>Veja o dia da clínica na tela Hoje e responda aos pedidos de agendamento.</li>
          <li>Registre um atendimento e veja a vacina chegar na carteira do pet.</li>
          <li>Use “Ver como tutor” para ver o mesmo ciclo pelo app.</li>
        </ul>
        {erro && <Alerta tipo="erro" titulo={erro} />}
        <Botao larguraTotal carregando={criando} onClick={() => void comecar()}>
          {criando ? 'Preparando sua clínica…' : 'Começar a demonstração'}
        </Botao>
        <p className="demonstracao__nota">Sem cadastro e sem cartão.</p>
      </section>
    </main>
  );
}
