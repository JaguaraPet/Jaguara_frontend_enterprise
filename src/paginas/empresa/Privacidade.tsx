import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../api/cliente';
import type { components } from '../../api/esquema';
import { Alerta, Botao, Campo, Cartao } from '../../componentes';
import { mensagemDoErro } from '../admin/erros';
import '../admin/admin.css';
import './privacidade.css';

type Consentimento = components['schemas']['Consentimento'];
type Aviso = { tipo: 'sucesso' | 'erro' | 'alerta' | 'info'; titulo: string; mensagem?: string };

const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

/** Baixa um JSON pelo navegador, sem passar por servidor de arquivos. */
function baixarJson(conteudo: unknown, nome: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

/** Privacidade da conta da empresa (UC-46, LGPD): consentimentos, exportação, correção e exclusão. */
export function Privacidade() {
  const [lista, setLista] = useState<Consentimento[] | null>(null);
  const [versao, setVersao] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [exportando, setExportando] = useState(false);
  const [senha, setSenha] = useState('');
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    let ativo = true;
    void api.GET('/privacidade/consentimentos').then(({ data: d }) => {
      if (ativo) setLista(d ?? []);
    });
    return () => {
      ativo = false;
    };
  }, [versao]);

  async function alternar(c: Consentimento, aceito: boolean) {
    const { error } = await api.PUT('/privacidade/consentimentos', { body: [{ termoId: c.termoId!, aceito }] });
    if (error) {
      // CT-46-02: termo obrigatório só deixa de valer com a exclusão da conta.
      setAviso({
        tipo: 'alerta',
        titulo: 'Este termo é necessário para usar o Jaguara',
        mensagem: `${mensagemDoErro(error)} Se não quiser mais, peça a exclusão da conta abaixo.`,
      });
      return;
    }
    setAviso({ tipo: 'sucesso', titulo: aceito ? 'Consentimento registrado' : 'Consentimento revogado' });
    setVersao((v) => v + 1);
  }

  async function exportar() {
    setExportando(true);
    const { data: dados, error } = await api.GET('/privacidade/exportacao');
    setExportando(false);
    if (error || !dados) {
      setAviso({ tipo: 'erro', titulo: 'Não foi possível exportar agora' });
      return;
    }
    baixarJson(dados, 'dados-jaguara.json');
  }

  async function pedirCorrecao() {
    const { error } = await api.POST('/privacidade/solicitacoes', { body: { tipo: 'CORRECAO_DADOS' } });
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Pedido não registrado', mensagem: mensagemDoErro(error) }
        : { tipo: 'sucesso', titulo: 'Pedido de correção registrado', mensagem: 'O suporte responde em até 15 dias.' },
    );
  }

  async function excluir(evento: FormEvent) {
    evento.preventDefault();
    setExcluindo(true);
    const { error } = await api.POST('/privacidade/solicitacoes', { body: { tipo: 'EXCLUSAO_DADOS', senha } });
    setExcluindo(false);
    setSenha('');
    setAviso(
      error
        ? { tipo: 'erro', titulo: 'Pedido de exclusão não registrado', mensagem: mensagemDoErro(error) }
        : {
            tipo: 'info',
            titulo: 'Pedido de exclusão registrado',
            mensagem: 'A conta da empresa é encerrada pelo suporte, que confirma por e-mail em até 15 dias.',
          },
    );
  }

  return (
    <div className="pagina">
      <h1>Privacidade</h1>
      <p>Seus dados e consentimentos, conforme a LGPD.</p>
      {aviso && <Alerta tipo={aviso.tipo} titulo={aviso.titulo} mensagem={aviso.mensagem} />}

      <Cartao titulo="Termos e consentimentos">
        {lista === null ? (
          <p role="status">Carregando…</p>
        ) : (
          <ul className="privacidade__termos">
            {lista.map((c) => (
              <li key={c.termoId}>
                <label>
                  <input type="checkbox" checked={!!c.aceito} onChange={(e) => void alternar(c, e.target.checked)} />{' '}
                  <strong>{c.titulo}</strong> · versão {c.versao}
                  {c.obrigatorio ? ' · obrigatório' : ' · opcional'}
                  {c.dataAceite ? ` · aceito em ${data(c.dataAceite)}` : ''}
                </label>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Seus dados" subtitulo="Cadastro da empresa, equipe, serviços e histórico em um arquivo JSON.">
        <div className="privacidade__acoes">
          <Botao variante="secundaria" carregando={exportando} onClick={() => void exportar()}>
            Exportar dados
          </Botao>
          <Botao variante="texto" onClick={() => void pedirCorrecao()}>
            Pedir correção de dados
          </Botao>
        </div>
      </Cartao>

      <Cartao titulo="Excluir a conta" subtitulo="O suporte confirma e encerra a conta da empresa.">
        <form onSubmit={(e) => void excluir(e)} aria-label="Excluir a conta">
          <Campo rotulo="Senha para confirmar" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          <Botao type="submit" variante="perigo" carregando={excluindo} disabled={!senha}>
            Pedir exclusão
          </Botao>
        </form>
      </Cartao>
    </div>
  );
}
