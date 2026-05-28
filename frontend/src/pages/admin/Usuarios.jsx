import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminLayout";

export default function Usuarios() {
  const { headers, api, me } = useAdminAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(null); // {modo:'novo'|'editar'|'senha', usuario}

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const r = await axios.get(`${api}/api/admin/usuarios`, { headers });
      setUsuarios(r.data || []);
    } catch (err) {
      setErro(err.response?.data?.detail || "Erro ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, [headers, api]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = async (modo, dados, userId) => {
    try {
      if (modo === "novo") {
        await axios.post(`${api}/api/admin/usuarios`, dados, { headers });
      } else if (modo === "editar") {
        await axios.patch(`${api}/api/admin/usuarios/${userId}`, dados, { headers });
      } else if (modo === "senha") {
        await axios.post(
          `${api}/api/admin/usuarios/${userId}/reset-senha`,
          { senha_atual: "", senha_nova: dados.senha_nova },
          { headers }
        );
      }
      setModal(null);
      await carregar();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao salvar usuário.");
    }
  };

  const remover = async (u) => {
    if (u.is_root) return;
    if (!window.confirm(`Remover o usuário "${u.nome}"?`)) return;
    try {
      await axios.delete(`${api}/api/admin/usuarios/${u.id}`, { headers });
      await carregar();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao remover.");
    }
  };

  const podeGerenciar = me?.papel === "admin";

  return (
    <div data-testid="admin-usuarios-page">
      <header className="us-header">
        <div>
          <h1>Usuários</h1>
          <p>Gerencie quem tem acesso ao painel administrativo.</p>
        </div>
        {podeGerenciar && (
          <button
            className="us-btn-novo"
            onClick={() => setModal({ modo: "novo" })}
            data-testid="btn-novo-usuario"
          >
            + Novo usuário
          </button>
        )}
      </header>

      {erro && <div className="us-erro">{erro}</div>}

      <section className="us-table-wrap">
        <table className="us-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Usuário</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={7} className="us-vazio"><span className="us-spin" /> Carregando...</td></tr>
            ) : usuarios.length === 0 ? (
              <tr><td colSpan={7} className="us-vazio">Nenhum usuário cadastrado.</td></tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} data-testid={`linha-usuario-${u.id}`}>
                  <td>
                    <div className="us-nome-cell">
                      <div className="us-av">{(u.nome || u.usuario || "?").substring(0,1).toUpperCase()}</div>
                      <div>
                        <strong>{u.nome}</strong>
                        {u.is_root && <span className="us-tag-root">ROOT</span>}
                      </div>
                    </div>
                  </td>
                  <td>{u.usuario}</td>
                  <td>{u.email || "—"}</td>
                  <td>
                    <span className={`us-pill papel-${u.papel}`}>
                      {u.papel === "admin" ? "Administrador" : "Visualizador"}
                    </span>
                  </td>
                  <td>
                    {u.ativo ? (
                      <span className="us-pill ativo">Ativo</span>
                    ) : (
                      <span className="us-pill inativo">Inativo</span>
                    )}
                  </td>
                  <td>{formatarData(u.created_at)}</td>
                  <td className="us-acoes">
                    {!u.is_root && podeGerenciar && (
                      <>
                        <button
                          className="us-btn-acao"
                          onClick={() => setModal({ modo: "editar", usuario: u })}
                          data-testid={`btn-editar-${u.id}`}
                        >Editar</button>
                        <button
                          className="us-btn-acao"
                          onClick={() => setModal({ modo: "senha", usuario: u })}
                          data-testid={`btn-senha-${u.id}`}
                        >Senha</button>
                        <button
                          className="us-btn-acao remover"
                          onClick={() => remover(u)}
                          data-testid={`btn-remover-${u.id}`}
                        >Remover</button>
                      </>
                    )}
                    {u.is_root && (
                      <span className="us-root-info">Editável apenas via .env</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {modal && (
        <UsuarioModal
          modo={modal.modo}
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSalvar={salvar}
        />
      )}

      <style>{stylesUs}</style>
    </div>
  );
}

function formatarData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function UsuarioModal({ modo, usuario, onClose, onSalvar }) {
  const titulos = { novo: "Novo usuário", editar: "Editar usuário", senha: "Redefinir senha" };
  const [form, setForm] = useState(() => ({
    nome: usuario?.nome || "",
    usuario: usuario?.usuario || "",
    email: usuario?.email || "",
    senha: "",
    senha_nova: "",
    papel: usuario?.papel || "admin",
    ativo: usuario?.ativo ?? true,
  }));
  const [salvando, setSalvando] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      if (modo === "novo") {
        if (form.senha.length < 6) { alert("Senha deve ter ao menos 6 caracteres"); setSalvando(false); return; }
        await onSalvar("novo", {
          nome: form.nome.trim(),
          usuario: form.usuario.trim(),
          email: form.email.trim() || null,
          senha: form.senha,
          papel: form.papel,
          ativo: form.ativo,
        });
      } else if (modo === "editar") {
        await onSalvar("editar", {
          nome: form.nome.trim(),
          email: form.email.trim() || null,
          papel: form.papel,
          ativo: form.ativo,
        }, usuario.id);
      } else if (modo === "senha") {
        if (form.senha_nova.length < 6) { alert("Senha deve ter ao menos 6 caracteres"); setSalvando(false); return; }
        await onSalvar("senha", { senha_nova: form.senha_nova }, usuario.id);
      }
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="us-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="us-modal" data-testid="modal-usuario">
        <header className="us-modal-head">
          <h2>{titulos[modo]}</h2>
          <button className="us-x" onClick={onClose}>×</button>
        </header>
        <form onSubmit={submit} className="us-form">
          {modo !== "senha" && (
            <>
              <Field label="Nome completo" required>
                <input type="text" value={form.nome} onChange={(e) => upd("nome", e.target.value)} required data-testid="input-nome" />
              </Field>
              {modo === "novo" && (
                <Field label="Usuário" required>
                  <input type="text" value={form.usuario} onChange={(e) => upd("usuario", e.target.value)} required data-testid="input-usuario" />
                </Field>
              )}
              <Field label="E-mail">
                <input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} data-testid="input-email" />
              </Field>
              <Field label="Papel">
                <select value={form.papel} onChange={(e) => upd("papel", e.target.value)} data-testid="select-papel">
                  <option value="admin">Administrador</option>
                  <option value="visualizador">Visualizador</option>
                </select>
              </Field>
              <Field label="Status">
                <label className="us-switch">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => upd("ativo", e.target.checked)} data-testid="switch-ativo" />
                  <span>{form.ativo ? "Ativo" : "Inativo"}</span>
                </label>
              </Field>
            </>
          )}
          {modo === "novo" && (
            <Field label="Senha" required>
              <input type="password" value={form.senha} onChange={(e) => upd("senha", e.target.value)} required minLength={6} data-testid="input-senha" />
            </Field>
          )}
          {modo === "senha" && (
            <Field label="Nova senha" required>
              <input type="password" value={form.senha_nova} onChange={(e) => upd("senha_nova", e.target.value)} required minLength={6} data-testid="input-senha-nova" />
            </Field>
          )}

          <footer className="us-form-foot">
            <button type="button" className="us-btn-cancelar" onClick={onClose}>Cancelar</button>
            <button type="submit" className="us-btn-salvar" disabled={salvando} data-testid="btn-salvar-usuario">
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="us-field">
      <span>{label}{required && <em>*</em>}</span>
      {children}
    </label>
  );
}

const stylesUs = `
  .us-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 22px; }
  .us-header h1 { font-size: 26px; font-weight: 700; margin: 0; }
  .us-header p { color: #5b6582; font-size: 13px; margin: 4px 0 0 0; }
  .us-btn-novo { background: linear-gradient(135deg,#7c5cff,#3a8bfd); color: #fff; border: 0; font-size: 14px; font-weight: 700; padding: 11px 18px; border-radius: 10px; cursor: pointer; box-shadow: 0 8px 18px rgba(58,139,253,0.3); }
  .us-btn-novo:hover { transform: translateY(-1px); box-shadow: 0 12px 22px rgba(58,139,253,0.4); }

  .us-erro { background: #fff1f1; border: 1px solid #ffd0d4; color: #b3261e; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

  .us-table-wrap { background: #fff; border: 1px solid #e6eaf5; border-radius: 14px; overflow-x: auto; }
  .us-table { width: 100%; border-collapse: collapse; min-width: 900px; }
  .us-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #5b6582; font-weight: 700; padding: 14px 16px; border-bottom: 1px solid #e6eaf5; background: #fafbff; }
  .us-table td { padding: 14px 16px; font-size: 14px; color: #1d2538; border-bottom: 1px solid #eef0f8; }
  .us-table tr:last-child td { border-bottom: 0; }
  .us-table tr:hover td { background: #fafbff; }

  .us-nome-cell { display: flex; align-items: center; gap: 10px; }
  .us-av { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#3a8bfd,#7c5cff); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .us-tag-root { display: inline-block; margin-left: 6px; background: #ffe9c2; color: #855a00; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 4px; letter-spacing: 0.5px; }

  .us-pill { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.4px; }
  .us-pill.papel-admin { background: rgba(124,92,255,0.15); color: #5e3fd9; }
  .us-pill.papel-visualizador { background: #eef0f8; color: #5b6582; }
  .us-pill.ativo { background: rgba(61,220,151,0.18); color: #1d9967; }
  .us-pill.inativo { background: rgba(255,100,112,0.18); color: #c12a3a; }

  .us-acoes { text-align: right; white-space: nowrap; }
  .us-btn-acao { background: #fff; border: 1px solid #d6dbed; color: #1d2538; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 6px; cursor: pointer; margin-left: 6px; }
  .us-btn-acao:hover { background: #f4f6fb; }
  .us-btn-acao.remover { color: #c12a3a; border-color: #ffd0d4; }
  .us-btn-acao.remover:hover { background: #fff1f1; }
  .us-root-info { font-size: 11px; color: #8a93b3; font-style: italic; }

  .us-vazio { text-align: center; padding: 32px 16px; color: #5b6582; }
  .us-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #d6dbed; border-top-color: #7c5cff; border-radius: 50%; animation: usspin 0.8s linear infinite; margin-right: 8px; vertical-align: -2px; }
  @keyframes usspin { to { transform: rotate(360deg); } }

  .us-mask { position: fixed; inset: 0; z-index: 90; background: rgba(15,20,48,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .us-modal { width: 100%; max-width: 480px; background: #fff; border-radius: 14px; box-shadow: 0 30px 60px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; }
  .us-modal-head { padding: 18px 22px; border-bottom: 1px solid #e6eaf5; display: flex; align-items: center; justify-content: space-between; }
  .us-modal-head h2 { font-size: 18px; margin: 0; }
  .us-x { background: transparent; border: 0; font-size: 24px; cursor: pointer; color: #5b6582; }
  .us-x:hover { color: #1d2538; }

  .us-form { padding: 18px 22px 0 22px; overflow-y: auto; }
  .us-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .us-field span { font-size: 12px; font-weight: 600; color: #5b6582; text-transform: uppercase; letter-spacing: 0.4px; }
  .us-field span em { color: #c12a3a; font-style: normal; margin-left: 2px; }
  .us-field input, .us-field select {
    background: #fafbff; border: 1px solid #d6dbed; border-radius: 8px;
    padding: 10px 12px; font-size: 14px; color: #1d2538; outline: 0;
  }
  .us-field input:focus, .us-field select:focus { border-color: #7c5cff; background: #fff; }

  .us-switch { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .us-switch input { width: 18px; height: 18px; accent-color: #7c5cff; }

  .us-form-foot { padding: 16px 0 22px 0; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e6eaf5; margin-top: 8px; }
  .us-btn-cancelar { background: #fff; border: 1px solid #d6dbed; color: #1d2538; font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; }
  .us-btn-salvar { background: linear-gradient(135deg,#7c5cff,#3a8bfd); color: #fff; border: 0; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px; cursor: pointer; }
  .us-btn-salvar:disabled { opacity: 0.7; cursor: not-allowed; }
`;
