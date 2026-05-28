import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminLayout";

/**
 * Página de CPFs pré-cadastrados.
 *
 * Aqui o admin pode cadastrar CPFs que devem SEMPRE cair direto na tela
 * de pagamento pendente quando o usuário fizer login no portal — mesmo
 * que o painel de inscrições esteja vazio (limpo).
 *
 * A identificação é feita exclusivamente pelo CPF (chave única).
 */
export default function Cadastros() {
  const { headers, api } = useAdminAuth();
  const [carregando, setCarregando] = useState(true);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");

  // Form de cadastro individual
  const [cpfNovo, setCpfNovo] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [senhaNovo, setSenhaNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Modal cadastro em massa
  const [bulkAberto, setBulkAberto] = useState(false);
  const [bulkTexto, setBulkTexto] = useState("");
  const [bulkSalvando, setBulkSalvando] = useState(false);

  const carregar = useCallback(
    async (q = "") => {
      setCarregando(true);
      setErro("");
      try {
        const r = await axios.get(`${api}/api/admin/cadastros`, {
          headers,
          params: q ? { busca: q } : {},
        });
        setLista(r.data || []);
      } catch (err) {
        setErro(err.response?.data?.detail || "Erro ao carregar cadastros.");
      } finally {
        setCarregando(false);
      }
    },
    [headers, api]
  );

  useEffect(() => {
    carregar("");
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  // Auto-fade do feedback de sucesso
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(""), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const mascararCPF = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2");

  const cadastrar = async (e) => {
    e.preventDefault();
    if (!cpfNovo.replace(/\D/g, "")) return;
    setSalvando(true);
    setErro("");
    try {
      const r = await axios.post(
        `${api}/api/admin/cadastros`,
        { cpf: cpfNovo, nome: nomeNovo, senha: senhaNovo },
        { headers }
      );
      if (r.data?.duplicate) {
        setFeedback(`CPF ${cpfNovo} já estava cadastrado.`);
      } else {
        setFeedback(`CPF ${cpfNovo} cadastrado com sucesso.`);
      }
      setCpfNovo("");
      setNomeNovo("");
      setSenhaNovo("");
      await carregar(busca);
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao cadastrar CPF.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id, cpfFormatado) => {
    if (!window.confirm(`Remover o CPF ${cpfFormatado}? Após a remoção, esse usuário NÃO cairá mais direto no pagamento ao fazer login.`)) {
      return;
    }
    try {
      await axios.delete(`${api}/api/admin/cadastros/${id}`, { headers });
      await carregar(busca);
      setFeedback(`CPF ${cpfFormatado} removido.`);
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao remover.");
    }
  };

  const removerTodos = async () => {
    if (!lista.length) {
      alert("Nenhum CPF cadastrado para remover.");
      return;
    }
    if (!window.confirm(`⚠️ Remover TODOS os ${lista.length} CPFs cadastrados? Esta ação não pode ser desfeita.`)) {
      return;
    }
    const conf = window.prompt('Para confirmar, digite exatamente: APAGAR');
    if (conf !== "APAGAR") {
      alert("Operação cancelada.");
      return;
    }
    try {
      const r = await axios.delete(`${api}/api/admin/cadastros`, { headers });
      setFeedback(`${r.data.removidos} cadastro(s) removidos.`);
      await carregar("");
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao remover.");
    }
  };

  const baixarTxt = async () => {
    if (!lista.length) {
      alert("Nenhum CPF cadastrado para baixar.");
      return;
    }
    try {
      const r = await axios.get(`${api}/api/admin/cadastros/exportar`, {
        headers,
        responseType: "blob",
      });
      const blob = new Blob([r.data], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().slice(0, 16).replace(/[:T-]/g, "");
      a.href = url;
      a.download = `cadastros-cpfs-${ts}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setFeedback(`${lista.length} cadastro(s) exportado(s) para TXT.`);
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao baixar TXT.");
    }
  };

  const cadastrarEmMassa = async () => {
    if (!bulkTexto.trim()) {
      alert("Cole pelo menos um CPF.");
      return;
    }
    setBulkSalvando(true);
    try {
      const r = await axios.post(
        `${api}/api/admin/cadastros/bulk`,
        { cpfs: bulkTexto },
        { headers }
      );
      setFeedback(
        `Cadastro em massa concluído: ${r.data.inseridos} inseridos, ` +
        `${r.data.duplicados} duplicados, ${r.data.invalidos} inválidos.`
      );
      setBulkTexto("");
      setBulkAberto(false);
      await carregar("");
    } catch (err) {
      alert(err.response?.data?.detail || "Erro no cadastro em massa.");
    } finally {
      setBulkSalvando(false);
    }
  };

  return (
    <div data-testid="admin-cadastros-page">
      <header className="cad-header">
        <div>
          <h1>Cadastro de CPFs</h1>
          <p>
            CPFs pré-cadastrados aqui caem direto na tela de pagamento
            pendente ao fazer login — mesmo que a aba "Inscrições" esteja
            limpa.
          </p>
        </div>
        <div className="cad-header-actions">
          <button
            className="cad-btn-bulk"
            onClick={() => setBulkAberto(true)}
            data-testid="btn-cadastro-massa"
            title="Cadastrar vários CPFs de uma vez"
          >
            ＋ Cadastrar em massa
          </button>
          <button
            className="cad-btn-baixar"
            onClick={baixarTxt}
            data-testid="btn-baixar-cadastros"
            title="Baixa todos os CPFs em arquivo .txt no mesmo formato do cadastro em massa"
          >
            ⬇️ Baixar TXT
          </button>
          <button
            className="cad-btn-limpar"
            onClick={removerTodos}
            data-testid="btn-remover-todos-cadastros"
            title="Remove todos os CPFs cadastrados"
          >
            🗑️ Limpar todos
          </button>
        </div>
      </header>

      {/* Form de cadastro individual */}
      <section className="cad-form-card" data-testid="form-cadastro-cpf">
        <h2>Cadastrar novo CPF</h2>
        <form onSubmit={cadastrar} className="cad-form-grid">
          <div className="cad-field">
            <label htmlFor="cad-cpf">CPF *</label>
            <input
              id="cad-cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpfNovo}
              onChange={(e) => setCpfNovo(mascararCPF(e.target.value))}
              data-testid="input-cad-cpf"
              required
            />
          </div>
          <div className="cad-field">
            <label htmlFor="cad-nome">Nome (opcional)</label>
            <input
              id="cad-nome"
              type="text"
              placeholder="Nome do candidato"
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
              data-testid="input-cad-nome"
            />
          </div>
          <div className="cad-field">
            <label htmlFor="cad-senha">Senha (opcional)</label>
            <input
              id="cad-senha"
              type="text"
              placeholder="Senha do candidato"
              value={senhaNovo}
              onChange={(e) => setSenhaNovo(e.target.value)}
              data-testid="input-cad-senha"
            />
          </div>
          <button
            type="submit"
            className="cad-btn-salvar"
            disabled={salvando}
            data-testid="btn-cad-salvar"
          >
            {salvando ? "Salvando…" : "Cadastrar CPF"}
          </button>
        </form>
        {feedback && <div className="cad-feedback">{feedback}</div>}
        {erro && <div className="cad-erro">{erro}</div>}
      </section>

      {/* Toolbar busca */}
      <section className="cad-toolbar">
        <div className="cad-search">
          <input
            type="text"
            placeholder="Buscar por CPF, nome ou senha..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            data-testid="input-busca-cadastros"
          />
        </div>
        <div className="cad-total" data-testid="cad-total">
          {lista.length} CPF{lista.length !== 1 ? "s" : ""} cadastrado{lista.length !== 1 ? "s" : ""}
        </div>
      </section>

      {/* Tabela */}
      <section className="cad-table-wrap">
        <table className="cad-table">
          <thead>
            <tr>
              <th>CPF</th>
              <th>Nome</th>
              <th>Senha</th>
              <th>Cadastrado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={5} className="cad-vazio"><span className="cad-spin" /> Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={5} className="cad-vazio">Nenhum CPF cadastrado ainda.</td></tr>
            ) : (
              lista.map((c) => (
                <tr key={c.id} data-testid={`linha-cad-${c.id}`}>
                  <td><code className="cad-cpf-mono">{c.cpf_formatado}</code></td>
                  <td>{c.nome || <span className="cad-vazio-cell">—</span>}</td>
                  <td>{c.senha
                    ? <code className="cad-senha-mono">{c.senha}</code>
                    : <span className="cad-vazio-cell">—</span>}</td>
                  <td>{formatarData(c.created_at)}</td>
                  <td className="cad-acoes">
                    <button
                      className="cad-btn-lixeira"
                      onClick={() => remover(c.id, c.cpf_formatado)}
                      data-testid={`btn-remover-cad-${c.id}`}
                      title="Remover este CPF"
                      aria-label="Remover CPF"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {bulkAberto && (
        <BulkModal
          texto={bulkTexto}
          setTexto={setBulkTexto}
          salvando={bulkSalvando}
          onClose={() => !bulkSalvando && setBulkAberto(false)}
          onSalvar={cadastrarEmMassa}
        />
      )}

      <style>{stylesCad}</style>
    </div>
  );
}

function BulkModal({ texto, setTexto, salvando, onClose, onSalvar }) {
  return (
    <div className="cad-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cad-modal" data-testid="bulk-modal">
        <header className="cad-modal-head">
          <h2>Cadastrar CPFs em massa</h2>
          <button className="cad-x" onClick={onClose} disabled={salvando}>×</button>
        </header>
        <div className="cad-modal-body">
          <p>
            Cole abaixo a lista — <strong>uma linha por candidato</strong>.
            Você pode usar qualquer um destes formatos: <code>CPF NOME</code>,
            <code>NOME CPF</code>, <code>NOME, CPF</code> ou só o CPF.
            CPFs inválidos ou duplicados são ignorados.
          </p>
          <textarea
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"05616946303  DENILSON SILVA SANTOS\n06516946603  MARIA SOCORRO SILVA\n12345678963  BENTO CASTRO ALVES"}
            className="cad-textarea"
            data-testid="textarea-bulk"
            disabled={salvando}
          />
        </div>
        <footer className="cad-modal-foot">
          <button className="cad-btn-cancelar" onClick={onClose} disabled={salvando}>
            Cancelar
          </button>
          <button
            className="cad-btn-salvar"
            onClick={onSalvar}
            disabled={salvando}
            data-testid="btn-bulk-salvar"
          >
            {salvando ? "Cadastrando…" : "Cadastrar todos"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function formatarData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

const stylesCad = `
  .cad-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 22px; flex-wrap: wrap; }
  .cad-header h1 { font-size: 26px; font-weight: 700; margin: 0; }
  .cad-header p { color: #5b6582; font-size: 13px; margin: 6px 0 0 0; max-width: 640px; line-height: 1.5; }
  .cad-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .cad-btn-bulk { background: #eef4ff; border: 1px solid #c4d8fb; color: #1f5dc4; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .cad-btn-bulk:hover { background: #dde8fb; transform: translateY(-1px); }
  .cad-btn-baixar { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .cad-btn-baixar:hover { background: #d1fae5; transform: translateY(-1px); }
  .cad-btn-limpar { background: #fff5f6; border: 1px solid #ffc4ca; color: #c12a3a; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .cad-btn-limpar:hover { background: #ffe6e9; transform: translateY(-1px); }

  .cad-form-card { background: #fff; border: 1px solid #e6eaf5; border-radius: 14px; padding: 22px 24px; margin-bottom: 22px; }
  .cad-form-card h2 { font-size: 15px; font-weight: 700; color: #1d2538; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px; }
  .cad-form-grid { display: grid; grid-template-columns: 200px 1fr 200px auto; gap: 14px; align-items: end; }
  @media (max-width: 900px) { .cad-form-grid { grid-template-columns: 1fr; } }
  .cad-field { display: flex; flex-direction: column; gap: 6px; }
  .cad-field label { font-size: 11px; color: #5b6582; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
  .cad-field input {
    padding: 10px 12px; border: 1px solid #d6dbed; border-radius: 8px;
    font-size: 14px; color: #1d2538; outline: none; background: #fff;
    transition: border-color 140ms ease, box-shadow 140ms ease;
    font-family: inherit;
  }
  .cad-field input:focus { border-color: #7c5cff; box-shadow: 0 0 0 3px rgba(124,92,255,0.15); }
  .cad-btn-salvar {
    background: linear-gradient(135deg,#7c5cff 0%,#3a8bfd 100%); color: #fff;
    border: 0; padding: 10px 22px; border-radius: 8px;
    font-weight: 700; font-size: 14px; cursor: pointer;
    transition: transform 140ms ease, box-shadow 140ms ease;
    height: 40px;
  }
  .cad-btn-salvar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124,92,255,0.35); }
  .cad-btn-salvar:disabled { opacity: 0.55; cursor: not-allowed; }

  .cad-feedback { margin-top: 14px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 10px 14px; border-radius: 8px; font-size: 13px; }
  .cad-erro { margin-top: 14px; background: #fff1f1; border: 1px solid #ffd0d4; color: #b3261e; padding: 10px 14px; border-radius: 8px; font-size: 13px; }

  .cad-toolbar { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; align-items: center; justify-content: space-between; }
  .cad-search { flex: 1; min-width: 280px; background: #fff; border: 1px solid #d6dbed; border-radius: 10px; padding: 10px 14px; }
  .cad-search input { border: 0; outline: 0; width: 100%; background: transparent; font-size: 14px; }
  .cad-total { color: #5b6582; font-size: 13px; font-weight: 600; }

  .cad-table-wrap { background: #fff; border: 1px solid #e6eaf5; border-radius: 14px; overflow-x: auto; }
  .cad-table { width: 100%; border-collapse: collapse; min-width: 700px; }
  .cad-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #5b6582; font-weight: 700; padding: 14px 16px; border-bottom: 1px solid #e6eaf5; background: #fafbff; }
  .cad-table td { padding: 14px 16px; font-size: 14px; color: #1d2538; border-bottom: 1px solid #eef0f8; }
  .cad-table tr:last-child td { border-bottom: 0; }
  .cad-table tr:hover td { background: #fafbff; }
  .cad-cpf-mono {
    background: #fafbff; border: 1px solid #d6dbed;
    padding: 4px 10px; border-radius: 6px;
    font-family: "JetBrains Mono","Courier New",monospace;
    font-size: 13px; color: #1f5dc4; font-weight: 700;
  }
  .cad-senha-mono {
    background: #fafbff; border: 1px solid #d6dbed;
    padding: 4px 10px; border-radius: 6px;
    font-family: "JetBrains Mono","Courier New",monospace;
    font-size: 13px; color: #5e3fd9; font-weight: 600;
  }
  .cad-vazio-cell { color: #8a93b3; font-style: italic; }
  .cad-acoes { text-align: right; }
  .cad-btn-lixeira {
    background: #fff; border: 1px solid #ffd0d4; color: #c12a3a;
    padding: 7px 10px; border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    transition: background 140ms ease, transform 140ms ease, border-color 140ms ease;
  }
  .cad-btn-lixeira:hover { background: #c12a3a; color: #fff; border-color: #c12a3a; transform: translateY(-1px); }

  .cad-vazio { text-align: center; padding: 32px 16px; color: #5b6582; }
  .cad-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #d6dbed; border-top-color: #7c5cff; border-radius: 50%; animation: cadspin 0.8s linear infinite; margin-right: 8px; vertical-align: -2px; }
  @keyframes cadspin { to { transform: rotate(360deg); } }

  .cad-mask { position: fixed; inset: 0; z-index: 90; background: rgba(15,20,48,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .cad-modal { width: 100%; max-width: 560px; background: #fff; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; }
  .cad-modal-head { padding: 20px 24px; border-bottom: 1px solid #e6eaf5; display: flex; align-items: center; justify-content: space-between; }
  .cad-modal-head h2 { font-size: 18px; margin: 0; }
  .cad-x { background: transparent; border: 0; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; color: #5b6582; font-size: 28px; display: inline-flex; align-items: center; justify-content: center; }
  .cad-x:hover { background: #f4f6fb; color: #1d2538; }
  .cad-modal-body { padding: 20px 24px; }
  .cad-modal-body p { font-size: 13px; color: #5b6582; line-height: 1.5; margin: 0 0 12px 0; }
  .cad-textarea {
    width: 100%; padding: 12px 14px;
    border: 1px solid #d6dbed; border-radius: 8px;
    font-family: "JetBrains Mono","Courier New",monospace;
    font-size: 13px; color: #1d2538; outline: none;
    resize: vertical; min-height: 180px;
    transition: border-color 140ms ease, box-shadow 140ms ease;
  }
  .cad-textarea:focus { border-color: #7c5cff; box-shadow: 0 0 0 3px rgba(124,92,255,0.15); }
  .cad-modal-foot { padding: 16px 24px; border-top: 1px solid #e6eaf5; display: flex; justify-content: flex-end; gap: 10px; }
  .cad-btn-cancelar { background: #fff; border: 1px solid #d6dbed; color: #1d2538; padding: 9px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; }
  .cad-btn-cancelar:hover { background: #f4f6fb; }
`;
