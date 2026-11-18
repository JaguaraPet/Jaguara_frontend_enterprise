import { useState } from 'react';
import { Alerta, Botao, Campo, Cartao } from '../componentes';

/** Catálogo dos componentes base (UX-02), para conferir estados e acessibilidade. */
export function Componentes() {
  const [nome, setNome] = useState('');
  const erroNome =
    nome.length > 0 && nome.length < 2 ? 'Digite pelo menos 2 letras.' : undefined;

  return (
    <main className="catalogo">
      <h1>Componentes</h1>

      <h2>Botões</h2>
      <div className="catalogo__linha">
        <Botao>Salvar</Botao>
        <Botao variante="secundaria">Exportar</Botao>
        <Botao variante="perigo">Remover funcionário</Botao>
        <Botao variante="texto">Cancelar</Botao>
        <Botao disabled>Desabilitado</Botao>
        <Botao carregando>Enviando</Botao>
      </div>

      <h2>Campos</h2>
      <div className="catalogo__grade">
        <Campo
          rotulo="Nome do serviço"
          placeholder="Ex.: Banho e tosa"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erroNome}
        />
        <Campo rotulo="E-mail do funcionário" type="email" ajuda="Ele recebe o convite por e-mail." />
        <Campo rotulo="CNPJ" defaultValue="11.222.333/0001-00" erro="CNPJ inválido. Confira os números." />
        <Campo rotulo="Tipo de empresa" defaultValue="Clínica veterinária" disabled />
      </div>

      <h2>Cartões</h2>
      <div className="catalogo__grade">
        <Cartao titulo="Agenda de hoje" subtitulo="12 atendimentos">
          <p>Próximo: Thor, consulta às 14h.</p>
        </Cartao>
        <Cartao titulo="Solicitações" subtitulo="3 aguardando resposta" />
      </div>

      <h2>Alertas</h2>
      <div className="catalogo__coluna">
        <Alerta tipo="sucesso" titulo="Agendamento confirmado" />
        <Alerta tipo="alerta" titulo="Solicitação pendente" mensagem="Responda em até 24 horas." />
        <Alerta tipo="erro" titulo="Alergia grave" mensagem="Dipirona: reação grave em 2024." />
        <Alerta tipo="info" titulo="Pet compartilhado" mensagem="O tutor liberou vacinas e alergias." />
      </div>
    </main>
  );
}
