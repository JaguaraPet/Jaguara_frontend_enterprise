import { Alerta } from '../componentes';

/** Tela ainda não implementada: aparece no menu, mas o conteúdo chega em outra tarefa. */
export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="pagina">
      <h1>{titulo}</h1>
      <Alerta tipo="info" titulo="Em construção" mensagem="Esta tela chega nas próximas entregas." />
    </div>
  );
}
