import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import { conectarTempoReal } from '../../tempo-real/tempoReal';
import type { ConectarTempoReal } from '../../tempo-real/tempoReal';
import { useUsuario } from '../../sessao/useUsuario';
import './chat.css';

type Conversa = components['schemas']['ConversaResumo'];
type Mensagem = components['schemas']['Mensagem'];

const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/** Mensagens em ordem de envio (a API devolve da mais nova para a mais antiga). */
const emOrdem = (lista: Mensagem[]) =>
  [...lista].sort((a, b) => (a.dataHoraEnvio ?? '').localeCompare(b.dataHoraEnvio ?? ''));

/** Chat da empresa com os tutores (UC-43), com as mensagens novas em tempo real (ADR-011). */
export function Chat({ conectar = conectarTempoReal }: { conectar?: ConectarTempoReal }) {
  const usuario = useUsuario();
  const [conversas, setConversas] = useState<Conversa[] | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);
  const abertaRef = useRef<string | null>(null);

  // O socket lê a conversa aberta por esta referência, atualizada fora do render.
  useEffect(() => {
    abertaRef.current = aberta;
  }, [aberta]);

  useEffect(() => {
    let ativo = true;
    void api.GET('/conversas').then(({ data }) => {
      if (!ativo) return;
      const lista = data ?? [];
      setConversas(lista);
      setAberta((atual) => atual ?? lista[0]?.id ?? null);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  useEffect(() => {
    if (!aberta) return;
    let ativo = true;
    void api.GET('/conversas/{conversaId}/mensagens', { params: { path: { conversaId: aberta } } }).then(({ data }) => {
      if (ativo) setMensagens(emOrdem(data ?? []));
    });
    return () => {
      ativo = false;
    };
  }, [aberta]);

  // Mensagem nova chega pelo Socket.IO: entra na conversa aberta e atualiza a lista.
  useEffect(() => {
    if (!usuario?.id) return;
    const socket = conectar();
    socket.on('mensagem:nova', (m: Mensagem) => {
      if (m.conversaId === abertaRef.current) {
        setMensagens((atuais) => (atuais.some((x) => x.id === m.id) ? atuais : [...atuais, m]));
      }
      setVersao((v) => v + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, [usuario?.id, conectar]);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!aberta || !texto.trim()) return;
    setEnviando(true);
    const { data, error } = await api.POST('/conversas/{conversaId}/mensagens', {
      params: { path: { conversaId: aberta } },
      body: { conteudo: texto.trim() },
    });
    setEnviando(false);
    if (error || !data) {
      setErro(mensagemDoErro(error));
      return;
    }
    setErro(null);
    setTexto('');
    setMensagens((atuais) => (atuais.some((x) => x.id === data.id) ? atuais : [...atuais, data]));
    setVersao((v) => v + 1);
  }

  const atual = conversas?.find((c) => c.id === aberta);

  return (
    <div className="pagina">
      <h1>Chat</h1>
      {conversas === null ? (
        <p role="status">Carregando…</p>
      ) : conversas.length === 0 ? (
        <Alerta
          tipo="info"
          titulo="Nenhuma conversa ainda"
          mensagem="Os tutores que são clientes ou têm agendamento conversam com a empresa pelo app."
        />
      ) : (
        <div className="chat">
          <ul className="chat__lista" aria-label="Conversas">
            {conversas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chat__conversa${c.id === aberta ? ' chat__conversa--aberta' : ''}`}
                  aria-current={c.id === aberta ? 'true' : undefined}
                  onClick={() => setAberta(c.id ?? null)}
                >
                  <strong>
                    {c.tutor}
                    {c.pet ? ` · ${c.pet}` : ''}
                  </strong>
                  {c.ultimaMensagem && (
                    <span className="chat__previa">
                      {c.ultimaMensagem.minha ? 'Você: ' : ''}
                      {c.ultimaMensagem.conteudo}
                    </span>
                  )}
                  {c.naoLidas > 0 && c.id !== aberta && (
                    <span className="chat__naolidas" aria-label={`${c.naoLidas} não lidas`}>
                      {c.naoLidas}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <section className="chat__conversa-aberta" aria-label={atual ? `Conversa com ${atual.tutor}` : 'Conversa'}>
            <ol className="chat__mensagens" aria-live="polite">
              {mensagens.map((m) => {
                const minha = m.remetenteId !== null && m.remetenteId !== undefined && m.remetenteId !== atual?.tutorId;
                return (
                  <li key={m.id} className={minha ? 'chat__minha' : 'chat__dele'}>
                    <span className="chat__autor">
                      {minha ? 'Empresa' : atual?.tutor} · {hora(m.dataHoraEnvio)}
                    </span>
                    {m.conteudo}
                  </li>
                );
              })}
            </ol>
            {erro && <Alerta tipo="erro" titulo="Mensagem não enviada" mensagem={erro} />}
            {atual?.status === 'ENCERRADA' ? (
              <Alerta tipo="info" titulo="O tutor encerrou esta conversa" />
            ) : (
              <form className="chat__envio" onSubmit={(e) => void enviar(e)} aria-label="Enviar mensagem">
                <label htmlFor="chat-texto" className="visualmente-oculto">
                  Mensagem
                </label>
                <textarea
                  id="chat-texto"
                  rows={2}
                  maxLength={4000}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escreva para o tutor"
                />
                <Botao type="submit" carregando={enviando} disabled={!texto.trim()}>
                  Enviar
                </Botao>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

