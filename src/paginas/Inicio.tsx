export function Inicio() {
  return (
    <main className="inicio">
      <h1>Jaguara Enterprise</h1>
      <p>Agenda, atendimentos e clientes da sua empresa pet em um só lugar.</p>
      {import.meta.env.DEV && <a href="/componentes">Ver componentes (desenvolvimento)</a>}
    </main>
  );
}
