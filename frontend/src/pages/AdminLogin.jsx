import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const HERO_IMG =
  "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/o3kqh1kc_imgi_20_6a50a659976faf894399ea0eccc6b0fe.jpg";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const submeter = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const { data } = await axios.post(`${API}/api/admin/login`, {
        usuario: usuario.trim(),
        senha,
      });
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_user", data.usuario);
      navigate("/donaspainel");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Não foi possível autenticar. Verifique sua conexão.";
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="al-wrapper" data-testid="admin-login-page">
      {/* HERO — imagem dramática (Donatello) ocupando toda a esquerda no desktop
          e como fundo borrado no mobile */}
      <aside className="al-hero" aria-hidden="true">
        <div className="al-hero-img" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="al-hero-overlay" />
        <div className="al-hero-grain" />
        <div className="al-hero-content">
          <div className="al-hero-badge">
            <span className="al-hero-dot" /> Acesso restrito
          </div>
          <blockquote className="al-hero-quote">
            O conhecimento é como uma escada: quanto mais alto você sobe,
            mais <span className="grad">ampla é sua visão</span>.
          </blockquote>
        </div>
      </aside>

      {/* FORMULÁRIO */}
      <main className="al-main">
        <div className="al-card">
          <div className="al-logo">
            <div className="al-logo-mark">D</div>
            <div className="al-logo-text">
              <strong>Donas</strong>
              <span>Painel administrativo</span>
            </div>
          </div>

          <h1 className="al-title">Acessar painel</h1>
          <p className="al-subtitle">
            Digite suas credenciais para continuar.
          </p>

          <form onSubmit={submeter} className="al-form">
            <label className="al-field">
              <span>Usuário</span>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="seu.usuario"
                autoComplete="username"
                required
                data-testid="admin-input-usuario"
              />
            </label>

            <label className="al-field">
              <span>Senha</span>
              <div className="al-pass-wrap">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  data-testid="admin-input-senha"
                />
                <button
                  type="button"
                  className="al-pass-toggle"
                  onClick={() => setMostrarSenha((s) => !s)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  data-testid="admin-toggle-senha"
                >
                  {mostrarSenha ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>

            {erro && (
              <div className="al-erro" data-testid="admin-erro">
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="al-submit"
              disabled={carregando}
              data-testid="admin-btn-entrar"
            >
              {carregando ? (
                <>
                  <span className="al-spin" /> Verificando...
                </>
              ) : (
                <>
                  Entrar <ArrowIcon />
                </>
              )}
            </button>
          </form>

          <p className="al-footer-note">
            🛡️ Conexão segura · Apenas administradores autorizados.
          </p>
        </div>
      </main>

      <style>{styles}</style>
    </div>
  );
}

function IconEye() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const styles = `
  :root {
    --al-purple-1: #7c5cff;
    --al-purple-2: #b07cff;
    --al-bg: #060916;
  }

  .al-wrapper {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr;
    background: radial-gradient(1200px 800px at 10% 0%, #1c2540 0%, #0c1226 60%, #060916 100%);
    font-family: "Inter","Rawline",system-ui,sans-serif;
    color: #f4f6fb;
    overflow: hidden;
  }
  @media (min-width: 980px) {
    .al-wrapper { grid-template-columns: 1.05fr 1fr; }
  }

  /* ====== HERO ====== */
  .al-hero {
    position: relative;
    min-height: 220px;
    overflow: hidden;
    isolation: isolate;
  }
  @media (min-width: 980px) {
    .al-hero { min-height: 100vh; }
  }
  .al-hero-img {
    position: absolute; inset: 0;
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    filter: saturate(1.05) contrast(1.05);
    transform: scale(1.02);
    z-index: 0;
  }
  .al-hero-overlay {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba(6,9,22,0.55) 0%, rgba(6,9,22,0.35) 35%, rgba(6,9,22,0.85) 100%),
      radial-gradient(1000px 600px at 80% 30%, rgba(124,92,255,0.28) 0%, transparent 60%),
      linear-gradient(90deg, rgba(6,9,22,0.0) 50%, rgba(6,9,22,0.92) 100%);
    z-index: 1;
  }
  /* fade extra para a borda direita encostar no formulário sem corte feio */
  @media (min-width: 980px) {
    .al-hero-overlay {
      background:
        linear-gradient(90deg, rgba(6,9,22,0.0) 0%, rgba(6,9,22,0.0) 55%, rgba(6,9,22,0.92) 100%),
        radial-gradient(900px 600px at 80% 40%, rgba(124,92,255,0.30) 0%, transparent 60%),
        linear-gradient(180deg, rgba(6,9,22,0.30) 0%, rgba(6,9,22,0.05) 30%, rgba(6,9,22,0.55) 100%);
    }
  }
  .al-hero-grain {
    position: absolute; inset: 0; z-index: 2;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>");
    mix-blend-mode: overlay;
    opacity: 0.18;
    pointer-events: none;
  }
  .al-hero-content {
    position: relative; z-index: 3;
    height: 100%;
    padding: 36px 28px 32px 28px;
    display: flex; flex-direction: column;
    justify-content: flex-end;
    gap: 10px;
  }
  @media (min-width: 980px) {
    .al-hero-content { padding: 56px 60px 60px 60px; gap: 14px; }
  }

  .al-hero-badge {
    align-self: flex-start;
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(124,92,255,0.18);
    border: 1px solid rgba(124,92,255,0.45);
    color: #c8b8ff;
    font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 1.4px;
    padding: 6px 12px;
    border-radius: 999px;
    backdrop-filter: blur(8px);
  }
  .al-hero-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #b07cff;
    box-shadow: 0 0 0 4px rgba(176,124,255,0.18);
    animation: alpulse 1.6s ease-in-out infinite;
  }
  @keyframes alpulse {
    0%,100% { box-shadow: 0 0 0 4px rgba(176,124,255,0.18); }
    50%     { box-shadow: 0 0 0 8px rgba(176,124,255,0.04); }
  }

  .al-hero-quote {
    margin: 0;
    padding: 0;
    font-family: "Georgia","Playfair Display",serif;
    font-style: italic;
    font-size: 15px;
    line-height: 1.5;
    letter-spacing: 0;
    color: #f4f6fb;
    max-width: 480px;
    text-shadow: 0 4px 24px rgba(0,0,0,0.6);
  }
  @media (min-width: 980px) {
    .al-hero-quote { font-size: 20px; line-height: 1.45; }
  }
  .al-hero-quote .grad {
    font-style: italic;
    background: linear-gradient(120deg,#b07cff 0%,#7c5cff 50%,#3a8bfd 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }

  /* ====== MAIN ====== */
  .al-main {
    display: flex; align-items: center; justify-content: center;
    padding: 28px 22px 36px 22px;
    position: relative;
    z-index: 4;
  }
  @media (min-width: 980px) { .al-main { padding: 40px; } }

  .al-card {
    width: 100%;
    max-width: 440px;
    background: rgba(13,17,34,0.72);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(124,92,255,0.22);
    border-radius: 18px;
    padding: 32px 28px 26px 28px;
    color: #f4f6fb;
    box-shadow:
      0 30px 80px rgba(0,0,0,0.55),
      inset 0 1px 0 rgba(255,255,255,0.06);
    position: relative;
  }
  /* leve glow roxo na borda do card */
  .al-card::before {
    content: ""; position: absolute; inset: -1px; border-radius: 18px;
    background: linear-gradient(135deg, rgba(124,92,255,0.55), rgba(58,139,253,0.0) 40%, rgba(176,124,255,0.45));
    z-index: -1; filter: blur(8px); opacity: 0.55;
    pointer-events: none;
  }

  .al-logo { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
  .al-logo-mark {
    width: 44px; height: 44px;
    background: linear-gradient(135deg,#7c5cff 0%,#3a8bfd 100%);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 22px; color: #fff;
    box-shadow: 0 8px 16px rgba(124,92,255,0.4);
  }
  .al-logo-text { display: flex; flex-direction: column; line-height: 1.2; }
  .al-logo-text strong { font-size: 18px; }
  .al-logo-text span { font-size: 11px; color: #aab2c8; text-transform: uppercase; letter-spacing: 1px; }

  .al-title { font-size: 24px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px; }
  .al-subtitle { color: #aab2c8; font-size: 13px; margin: 0 0 22px 0; }

  .al-form { display: flex; flex-direction: column; gap: 14px; }
  .al-field { display: flex; flex-direction: column; gap: 6px; }
  .al-field span {
    font-size: 11px; font-weight: 700; color: #c8cee2;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .al-field input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    color: #fff;
    font-size: 14px;
    padding: 12px 14px;
    border-radius: 10px;
    outline: none;
    transition: border-color 160ms, background 160ms, box-shadow 160ms;
  }
  .al-field input::placeholder { color: #7a85a3; }
  .al-field input:focus {
    border-color: #7c5cff;
    background: rgba(124,92,255,0.08);
    box-shadow: 0 0 0 3px rgba(124,92,255,0.15);
  }
  .al-pass-wrap { position: relative; }
  .al-pass-wrap input { padding-right: 44px; }
  .al-pass-toggle {
    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
    background: transparent; border: 0; color: #aab2c8;
    padding: 6px; cursor: pointer; border-radius: 6px;
  }
  .al-pass-toggle:hover { color: #fff; background: rgba(255,255,255,0.06); }

  .al-erro {
    background: rgba(255,82,82,0.14);
    border: 1px solid rgba(255,82,82,0.4);
    color: #ff8a8a;
    font-size: 13px;
    padding: 10px 12px;
    border-radius: 8px;
  }

  .al-submit {
    margin-top: 8px;
    background: linear-gradient(135deg,#7c5cff 0%,#3a8bfd 100%);
    border: 0;
    color: #fff;
    font-weight: 700;
    font-size: 14px;
    padding: 14px 18px;
    border-radius: 10px;
    cursor: pointer;
    letter-spacing: 0.3px;
    box-shadow: 0 12px 24px rgba(58,139,253,0.35);
    transition: transform 140ms, box-shadow 160ms, opacity 140ms;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .al-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 16px 30px rgba(58,139,253,0.5);
  }
  .al-submit:disabled { opacity: 0.7; cursor: not-allowed; }
  .al-spin {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.45);
    border-top-color: #fff;
    border-radius: 50%;
    animation: alspin 0.8s linear infinite;
  }
  @keyframes alspin { to { transform: rotate(360deg); } }

  .al-footer-note {
    margin: 18px 0 0 0;
    text-align: center;
    font-size: 12px;
    color: #8590ad;
    letter-spacing: 0.3px;
  }
`;
