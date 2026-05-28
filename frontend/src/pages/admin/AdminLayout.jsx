import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

/* ========= Auth context ========= */
const AdminAuthCtx = createContext(null);
export const useAdminAuth = () => useContext(AdminAuthCtx);

export default function AdminLayout() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [me, setMe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/donaspainel/login", { replace: true });
      return;
    }
    axios
      .get(`${API}/api/admin/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setMe(r.data))
      .catch(() => sair())
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sair = useCallback(() => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setMe(null);
    navigate("/donaspainel/login", { replace: true });
  }, [navigate]);

  const auth = useMemo(
    () => ({
      token,
      me,
      sair,
      headers: { Authorization: `Bearer ${token}` },
      api: API,
    }),
    [token, me, sair]
  );

  if (!token) return null;

  if (carregando) {
    return (
      <div className="al-loading-screen">
        <span className="al-loading-spin" />
      </div>
    );
  }

  const navItens = [
    { to: "/donaspainel", label: "Dashboard", icon: <IconHome />, end: true },
    { to: "/donaspainel/inscricoes", label: "Inscrições", icon: <IconList /> },
    { to: "/donaspainel/cadastros", label: "Cadastro", icon: <IconIdCard /> },
    { to: "/donaspainel/usuarios", label: "Usuários", icon: <IconUsers /> },
    { to: "/donaspainel/configuracoes", label: "Configurações", icon: <IconCog /> },
  ];

  return (
    <AdminAuthCtx.Provider value={auth}>
      <div className={`al-shell ${colapsado ? "is-collapsed" : ""}`}>
        <aside className="al-side" data-testid="admin-sidebar">
          <div className="al-brand">
            <div className="al-brand-mark">D</div>
            {!colapsado && (
              <div className="al-brand-text">
                <strong>Donas</strong>
                <span>Painel</span>
              </div>
            )}
          </div>

          <button
            className="al-toggle"
            onClick={() => setColapsado((c) => !c)}
            title={colapsado ? "Expandir menu" : "Recolher menu"}
            data-testid="btn-toggle-sidebar"
          >
            {colapsado ? "›" : "‹"}
          </button>

          <nav className="al-nav">
            {navItens.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `al-nav-item ${isActive ? "active" : ""}`
                }
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                {item.icon}
                {!colapsado && <span>{item.label}</span>}
              </NavLink>
            ))}
          </nav>

          <div className="al-foot">
            <div className="al-user">
              <div className="al-user-av">
                {(me?.nome || me?.usuario || "A").substring(0, 1).toUpperCase()}
              </div>
              {!colapsado && (
                <div className="al-user-info">
                  <strong>{me?.nome || me?.usuario}</strong>
                  <span>{me?.papel === "admin" ? "Administrador" : "Visualizador"}</span>
                </div>
              )}
            </div>
            <button
              className="al-sair"
              onClick={sair}
              data-testid="btn-sair-admin"
              title="Sair"
            >
              <IconLogout />
              {!colapsado && <span>Sair</span>}
            </button>
          </div>
        </aside>

        <main className="al-main">
          <Outlet />
        </main>

        <style>{stylesLayout}</style>
      </div>
    </AdminAuthCtx.Provider>
  );
}

/* ========= Ícones ========= */
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V9.5z"/>
    </svg>
  );
}
function IconList() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function IconIdCard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2"/>
      <circle cx="9" cy="11" r="2.2"/>
      <path d="M5.6 17c0.6-1.6 1.9-2.6 3.4-2.6s2.8 1 3.4 2.6"/>
      <line x1="14" y1="9" x2="19" y2="9"/>
      <line x1="14" y1="13" x2="19" y2="13"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconCog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

const stylesLayout = `
  .al-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 240px 1fr;
    background: #f4f6fb;
    font-family: "Inter","Rawline",system-ui,sans-serif;
    color: #1d2538;
    transition: grid-template-columns 220ms ease;
  }
  .al-shell.is-collapsed { grid-template-columns: 76px 1fr; }
  @media (max-width: 900px) {
    .al-shell, .al-shell.is-collapsed { grid-template-columns: 76px 1fr; }
    .al-shell .al-brand-text, .al-shell .al-user-info, .al-shell .al-nav-item span, .al-shell .al-sair span { display: none; }
    .al-toggle { display: none !important; }
  }

  .al-side {
    background: linear-gradient(180deg, #0f1430 0%, #131a3f 100%);
    color: #e9ecf6;
    padding: 22px 14px 16px 14px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid rgba(255,255,255,0.05);
    position: sticky; top: 0; height: 100vh;
  }
  .al-brand { display: flex; align-items: center; gap: 12px; padding: 0 6px; margin-bottom: 18px; }
  .al-brand-mark {
    width: 38px; height: 38px;
    background: linear-gradient(135deg,#7c5cff 0%,#3a8bfd 100%);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; color: #fff;
    flex-shrink: 0;
  }
  .al-brand-text { display: flex; flex-direction: column; line-height: 1.2; }
  .al-brand-text strong { font-size: 16px; }
  .al-brand-text span { font-size: 11px; color: #8a93b3; text-transform: uppercase; letter-spacing: 1px; }

  .al-toggle {
    align-self: flex-end;
    width: 24px; height: 24px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: #aab2c8;
    border-radius: 6px;
    margin-bottom: 14px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
  }
  .al-toggle:hover { color: #fff; background: rgba(255,255,255,0.12); }

  .al-nav { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .al-nav-item {
    display: flex; align-items: center; gap: 12px;
    background: transparent; color: #aab2c8;
    padding: 11px 12px; border-radius: 8px;
    font-size: 14px; font-weight: 500;
    text-decoration: none;
    transition: background 140ms, color 140ms;
  }
  .al-nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
  .al-nav-item.active {
    background: linear-gradient(135deg, rgba(124,92,255,0.25) 0%, rgba(58,139,253,0.18) 100%);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(124,92,255,0.35);
  }

  .al-foot { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 12px; margin-top: 8px; }
  .al-user { display: flex; align-items: center; gap: 10px; padding: 0 6px; margin-bottom: 12px; }
  .al-user-av {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg,#3a8bfd,#7c5cff);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; flex-shrink: 0;
  }
  .al-user-info { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
  .al-user-info strong {
    font-size: 13px; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .al-user-info span { font-size: 11px; color: #8a93b3; }

  .al-sair {
    display: flex; align-items: center; gap: 8px; justify-content: center;
    width: 100%;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);
    color: #e9ecf6; font-size: 13px; padding: 9px 12px;
    border-radius: 8px; cursor: pointer;
  }
  .al-sair:hover { background: rgba(255,82,82,0.15); border-color: rgba(255,82,82,0.4); color: #ffaaaa; }

  .al-main { padding: 32px 36px 80px 36px; min-width: 0; }
  @media (max-width: 700px) { .al-main { padding: 22px 18px 60px 18px; } }

  .al-loading-screen {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f4f6fb;
  }
  .al-loading-spin {
    width: 32px; height: 32px;
    border: 3px solid #d6dbed; border-top-color: #7c5cff;
    border-radius: 50%; animation: alspin 0.85s linear infinite;
  }
  @keyframes alspin { to { transform: rotate(360deg); } }
`;
