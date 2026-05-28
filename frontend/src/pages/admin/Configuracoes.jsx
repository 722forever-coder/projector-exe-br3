import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminLayout";

export default function Configuracoes() {
  const { headers, api, me } = useAdminAuth();
  const [config, setConfig] = useState(null);

  // PIX form
  const [pixChave, setPixChave] = useState("");
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [msgPix, setMsgPix] = useState(null);

  // Telegram form
  const [tgToken, setTgToken] = useState("");
  const [tgChat, setTgChat] = useState("");
  const [tgAtivo, setTgAtivo] = useState(false);
  const [salvandoTg, setSalvandoTg] = useState(false);
  const [testandoTg, setTestandoTg] = useState(false);
  const [msgTg, setMsgTg] = useState(null);

  // Senha form
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senhaNova, setSenhaNova] = useState("");
  const [senhaConf, setSenhaConf] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState(null);

  const carregar = async () => {
    try {
      const r = await axios.get(`${api}/api/admin/configuracoes`, { headers });
      setConfig(r.data);
      setPixChave(r.data.pix_chave || "");
      setTgToken(r.data.telegram_bot_token || "");
      setTgChat(r.data.telegram_chat_id || "");
      setTgAtivo(!!r.data.telegram_ativo);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!config) {
    return <div className="cf-load"><span className="cf-spin" /> Carregando...</div>;
  }

  const salvarPix = async (e) => {
    e.preventDefault();
    setSalvandoPix(true);
    setMsgPix(null);
    try {
      await axios.patch(`${api}/api/admin/configuracoes`, {
        pix_chave: pixChave.trim(),
      }, { headers });
      setMsgPix({ tipo: "ok", texto: "Chave PIX salva com sucesso!" });
      setTimeout(() => setMsgPix(null), 3000);
      carregar();
    } catch (err) {
      setMsgPix({ tipo: "erro", texto: err.response?.data?.detail || "Erro ao salvar" });
    } finally {
      setSalvandoPix(false);
    }
  };

  const salvarTelegram = async (e) => {
    e.preventDefault();
    setSalvandoTg(true);
    setMsgTg(null);
    try {
      await axios.patch(`${api}/api/admin/configuracoes`, {
        telegram_bot_token: tgToken.trim(),
        telegram_chat_id: tgChat.trim(),
        telegram_ativo: tgAtivo,
      }, { headers });
      setMsgTg({ tipo: "ok", texto: "Configurações do Telegram salvas com sucesso!" });
      setTimeout(() => setMsgTg(null), 3000);
      carregar();
    } catch (err) {
      setMsgTg({ tipo: "erro", texto: err.response?.data?.detail || "Erro ao salvar" });
    } finally {
      setSalvandoTg(false);
    }
  };

  const testarTelegram = async () => {
    setTestandoTg(true);
    setMsgTg(null);
    try {
      const r = await axios.post(`${api}/api/admin/configuracoes/testar-telegram`,
        { bot_token: tgToken.trim(), chat_id: tgChat.trim() },
        { headers }
      );
      setMsgTg({ tipo: "ok", texto: r.data.detail || "Mensagem de teste enviada! ✅" });
    } catch (err) {
      setMsgTg({ tipo: "erro", texto: err.response?.data?.detail || "Falha no envio do teste" });
    } finally {
      setTestandoTg(false);
    }
  };

  const alterarSenha = async (e) => {
    e.preventDefault();
    setMsgSenha(null);
    if (senhaNova !== senhaConf) {
      setMsgSenha({ tipo: "erro", texto: "A nova senha e a confirmação não coincidem." });
      return;
    }
    if (senhaNova.length < 6) {
      setMsgSenha({ tipo: "erro", texto: "A nova senha deve ter ao menos 6 caracteres." });
      return;
    }
    setSalvandoSenha(true);
    try {
      await axios.post(`${api}/api/admin/alterar-senha`,
        { senha_atual: senhaAtual, senha_nova: senhaNova },
        { headers }
      );
      setMsgSenha({ tipo: "ok", texto: "Senha alterada com sucesso!" });
      setSenhaAtual(""); setSenhaNova(""); setSenhaConf("");
      setTimeout(() => setMsgSenha(null), 3000);
    } catch (err) {
      setMsgSenha({ tipo: "erro", texto: err.response?.data?.detail || "Erro" });
    } finally {
      setSalvandoSenha(false);
    }
  };

  const podeEditar = me?.papel === "admin";
  const isRoot = me?.is_root;

  return (
    <div data-testid="admin-configuracoes-page">
      <header className="cf-header">
        <div>
          <h1>Configurações</h1>
          <p>Configure a chave PIX e as notificações do Telegram.</p>
        </div>
      </header>

      {/* === PIX === */}
      <section className="cf-card">
        <header className="cf-card-head">
          <div className="cf-card-icon" style={{ background: "rgba(50,200,150,0.12)", color: "#1d9967" }}>
            <PixIcon />
          </div>
          <div>
            <h3>Chave PIX</h3>
            <p>Cadastre a chave PIX que vai receber os pagamentos das inscrições. Aceita CPF, CNPJ, e-mail, telefone ou chave aleatória.</p>
          </div>
        </header>
        <form onSubmit={salvarPix} className="cf-form">
          <div className="cf-grid">
            <Field label="Chave PIX" required full>
              <input
                type="text"
                value={pixChave}
                onChange={(e) => setPixChave(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                disabled={!podeEditar}
                data-testid="input-pix-chave"
                required
              />
            </Field>
          </div>

          {msgPix && <div className={`cf-msg ${msgPix.tipo}`}>{msgPix.texto}</div>}

          {podeEditar && (
            <div className="cf-form-foot">
              <button type="submit" className="cf-btn-salvar" disabled={salvandoPix} data-testid="btn-salvar-pix">
                {salvandoPix ? "Salvando..." : "Salvar chave PIX"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* === Telegram === */}
      <section className="cf-card">
        <header className="cf-card-head">
          <div className="cf-card-icon" style={{ background: "rgba(58,139,253,0.12)", color: "#3a8bfd" }}>
            <TelegramIcon />
          </div>
          <div>
            <h3>Notificações Telegram</h3>
            <p>Receba uma mensagem no seu bot/grupo do Telegram sempre que uma nova inscrição for criada.</p>
          </div>
        </header>
        <form onSubmit={salvarTelegram} className="cf-form">
          <div className="cf-grid">
            <Field label="Bot Token" required full>
              <input
                type="text"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="Ex.: 1234567890:ABC..."
                disabled={!podeEditar}
                data-testid="input-tg-token"
              />
            </Field>
            <Field label="Chat ID (grupo ou usuário)" required full>
              <input
                type="text"
                value={tgChat}
                onChange={(e) => setTgChat(e.target.value)}
                placeholder="Ex.: -1001234567890 (grupo) ou 123456789 (usuário)"
                disabled={!podeEditar}
                data-testid="input-tg-chat"
              />
            </Field>
            <Field label="Status das notificações" full>
              <label className="cf-switch">
                <input
                  type="checkbox"
                  checked={tgAtivo}
                  onChange={(e) => setTgAtivo(e.target.checked)}
                  disabled={!podeEditar}
                  data-testid="switch-tg-ativo"
                />
                <span className={`cf-switch-track ${tgAtivo ? "on" : ""}`}>
                  <span className="cf-switch-knob" />
                </span>
                <span className="cf-switch-label">
                  {tgAtivo
                    ? "Ativo — Você receberá notificação a cada nova inscrição"
                    : "Inativo — Nenhuma notificação será enviada"}
                </span>
              </label>
            </Field>
          </div>

          {msgTg && <div className={`cf-msg ${msgTg.tipo}`}>{msgTg.texto}</div>}

          <div className="cf-info-box">
            <strong>📋 Como obter Bot Token e Chat ID?</strong>
            <ol className="cf-passos">
              <li>Crie um bot conversando com <code>@BotFather</code> no Telegram (comando <code>/newbot</code>) — ele te dará o <strong>Bot Token</strong>.</li>
              <li>Adicione o bot ao seu <strong>grupo</strong> e envie qualquer mensagem.</li>
              <li>Acesse <code>https://api.telegram.org/bot&lt;SEU_TOKEN&gt;/getUpdates</code> no navegador.</li>
              <li>Copie o valor de <code>chat.id</code> (grupos começam com sinal de menos, ex.: <code>-100...</code>).</li>
              <li>Cole os valores acima e clique em <strong>Testar envio</strong>.</li>
            </ol>
          </div>

          {podeEditar && (
            <div className="cf-form-foot">
              <button
                type="button"
                className="cf-btn-testar"
                onClick={testarTelegram}
                disabled={testandoTg || !tgToken.trim() || !tgChat.trim()}
                data-testid="btn-testar-tg"
              >
                {testandoTg ? "Enviando..." : "Testar envio"}
              </button>
              <button type="submit" className="cf-btn-salvar" disabled={salvandoTg} data-testid="btn-salvar-tg">
                {salvandoTg ? "Salvando..." : "Salvar Telegram"}
              </button>
            </div>
          )}
        </form>
      </section>

      {/* === Conta / Senha === */}
      <section className="cf-card">
        <header className="cf-card-head">
          <div className="cf-card-icon" style={{ background: "rgba(124,92,255,0.12)", color: "#7c5cff" }}>
            <UserIcon />
          </div>
          <div>
            <h3>Minha Conta</h3>
            <p>Gerencie sua senha de acesso ao painel.</p>
          </div>
        </header>

        <div className="cf-conta-info">
          <div className="cf-conta-av">{(me?.nome || me?.usuario || "A").substring(0,1).toUpperCase()}</div>
          <div>
            <strong>{me?.nome || me?.usuario}</strong>
            <span>{me?.usuario} · {me?.papel === "admin" ? "Administrador" : "Visualizador"}</span>
          </div>
        </div>

        {isRoot ? (
          <div className="cf-aviso-root">
            🔒 Você está logado como usuário <strong>root</strong>. A senha do root só pode ser
            alterada diretamente no arquivo <code>backend/.env</code> do servidor por questões de segurança.
          </div>
        ) : (
          <form onSubmit={alterarSenha} className="cf-form">
            <div className="cf-grid">
              <Field label="Senha atual" required>
                <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required data-testid="input-senha-atual" />
              </Field>
              <Field label="Nova senha" required>
                <input type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} required minLength={6} data-testid="input-senha-nova" />
              </Field>
              <Field label="Confirmar nova senha" required>
                <input type="password" value={senhaConf} onChange={(e) => setSenhaConf(e.target.value)} required minLength={6} data-testid="input-senha-conf" />
              </Field>
            </div>

            {msgSenha && <div className={`cf-msg ${msgSenha.tipo}`}>{msgSenha.texto}</div>}

            <div className="cf-form-foot">
              <button type="submit" className="cf-btn-salvar" disabled={salvandoSenha} data-testid="btn-salvar-senha">
                {salvandoSenha ? "Alterando..." : "Alterar senha"}
              </button>
            </div>
          </form>
        )}
      </section>

      <style>{stylesCf}</style>
    </div>
  );
}

function Field({ label, required, full, children }) {
  return (
    <label className={`cf-field ${full ? "full" : ""}`}>
      <span>{label}{required && <em>*</em>}</span>
      {children}
    </label>
  );
}

function PixIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 18.6L5.4 14.6c-.4-.4-.4-1 0-1.4l4-4c.4-.4 1-.4 1.4 0s.4 1 0 1.4L8.2 13l3.4 3.4c.4.4.4 1 0 1.4-.4.4-1.1.4-1.4 0l-.8-.2zm5.2-13.2l4 4c.4.4.4 1 0 1.4l-4 4c-.4.4-1 .4-1.4 0s-.4-1 0-1.4l3.4-3.4-3.4-3.4c-.4-.4-.4-1 0-1.4.4-.4 1-.4 1.4 0l0 .2z"/>
      <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.86 4.49l-3.32 15.67c-.25 1.11-.91 1.38-1.84.86l-5.09-3.75-2.46 2.36c-.27.27-.5.5-1.03.5l.36-5.18L18.83 5.4c.41-.36-.09-.56-.63-.2L6.21 12.79l-5.13-1.6c-1.11-.35-1.13-1.11.23-1.64L20.54 2.85c.93-.35 1.74.21 1.32 1.64z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

const stylesCf = `
  .cf-header { margin-bottom: 24px; }
  .cf-header h1 { font-size: 26px; font-weight: 700; margin: 0; }
  .cf-header p { color: #5b6582; font-size: 13px; margin: 4px 0 0 0; }

  .cf-card { background: #fff; border: 1px solid #e6eaf5; border-radius: 14px; padding: 24px; margin-bottom: 22px; }
  .cf-card-head { display: flex; gap: 14px; margin-bottom: 18px; align-items: flex-start; }
  .cf-card-head h3 { font-size: 17px; font-weight: 700; margin: 0; }
  .cf-card-head p { font-size: 13px; color: #5b6582; margin: 4px 0 0 0; max-width: 600px; }
  .cf-card-icon {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .cf-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 18px; }
  @media (max-width: 700px) { .cf-grid { grid-template-columns: 1fr; } }
  .cf-field { display: flex; flex-direction: column; gap: 6px; }
  .cf-field.full { grid-column: 1 / -1; }
  .cf-field span { font-size: 12px; font-weight: 600; color: #5b6582; text-transform: uppercase; letter-spacing: 0.4px; }
  .cf-field span em { color: #c12a3a; font-style: normal; margin-left: 2px; }
  .cf-field input { background: #fafbff; border: 1px solid #d6dbed; border-radius: 8px; padding: 10px 12px; font-size: 14px; color: #1d2538; outline: 0; transition: border 140ms; font-family: inherit; }
  .cf-field input:focus { border-color: #7c5cff; background: #fff; }
  .cf-field input:disabled { background: #eef0f8; color: #5b6582; cursor: not-allowed; }

  .cf-msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-top: 14px; font-weight: 500; }
  .cf-msg.ok { background: rgba(61,220,151,0.15); color: #1d9967; border: 1px solid rgba(61,220,151,0.3); }
  .cf-msg.erro { background: #fff1f1; color: #b3261e; border: 1px solid #ffd0d4; }

  .cf-info-box {
    background: #fafbff; border: 1px solid #e6eaf5;
    border-left: 4px solid #7c5cff;
    padding: 14px 16px; border-radius: 8px;
    margin-top: 18px; font-size: 13px; color: #1d2538;
  }
  .cf-info-box strong { display: block; margin-bottom: 6px; font-size: 13px; }
  .cf-info-box p { margin: 0; color: #5b6582; line-height: 1.5; }
  .cf-info-box code { background: #fff; padding: 1px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #d6dbed; color: #5e3fd9; }

  .cf-passos { margin: 8px 0 0 18px; padding: 0; color: #5b6582; line-height: 1.7; }
  .cf-passos li { font-size: 13px; }

  .cf-form-foot { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  .cf-btn-salvar { background: linear-gradient(135deg,#7c5cff,#3a8bfd); color: #fff; border: 0; font-size: 14px; font-weight: 700; padding: 11px 22px; border-radius: 10px; cursor: pointer; box-shadow: 0 8px 18px rgba(58,139,253,0.3); }
  .cf-btn-salvar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 22px rgba(58,139,253,0.4); }
  .cf-btn-salvar:disabled { opacity: 0.7; cursor: not-allowed; }
  .cf-btn-testar {
    background: #fff; border: 1px solid #3a8bfd; color: #3a8bfd;
    font-size: 14px; font-weight: 700; padding: 10px 22px; border-radius: 10px; cursor: pointer;
  }
  .cf-btn-testar:hover:not(:disabled) { background: #3a8bfd; color: #fff; }
  .cf-btn-testar:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Switch toggle */
  .cf-switch {
    display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;
  }
  .cf-switch input { position: absolute; opacity: 0; pointer-events: none; }
  .cf-switch-track {
    width: 44px; height: 24px;
    background: #d6dbed;
    border-radius: 999px; position: relative;
    transition: background 200ms;
    flex-shrink: 0;
  }
  .cf-switch-track.on { background: linear-gradient(135deg,#7c5cff,#3a8bfd); }
  .cf-switch-knob {
    position: absolute; left: 2px; top: 2px;
    width: 20px; height: 20px; background: #fff;
    border-radius: 50%;
    transition: left 200ms;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  .cf-switch-track.on .cf-switch-knob { left: 22px; }
  .cf-switch-label { font-size: 13px; color: #1d2538; font-weight: 500; }

  .cf-conta-info { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; padding: 14px; background: #fafbff; border-radius: 10px; border: 1px solid #e6eaf5; }
  .cf-conta-av { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg,#3a8bfd,#7c5cff); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px; }
  .cf-conta-info strong { display: block; font-size: 15px; color: #1d2538; }
  .cf-conta-info span { font-size: 12px; color: #5b6582; }

  .cf-aviso-root {
    background: #fff8e6; border: 1px solid #ffe0a3;
    color: #7a5300; padding: 14px 16px; border-radius: 10px;
    font-size: 13px; line-height: 1.5;
  }
  .cf-aviso-root code { background: #fff; padding: 2px 6px; border-radius: 4px; font-size: 12px; border: 1px solid #ffe0a3; }

  .cf-load { color: #5b6582; padding: 24px; text-align: center; }
  .cf-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #d6dbed; border-top-color: #7c5cff; border-radius: 50%; animation: cfspin 0.8s linear infinite; vertical-align: -2px; margin-right: 8px; }
  @keyframes cfspin { to { transform: rotate(360deg); } }
`;
