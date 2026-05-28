import React from "react";
import { useNavigate } from "react-router-dom";
import { Home as HomeIcon, Menu } from "lucide-react";

/**
 * Header reutilizável.
 * mode: "default" → home pública (Entrar)
 *       "logged"  → após login (Sair) e exibe Home na linha de "Portal do candidato"
 */
export default function Header({ onLoginClick, mode = "default" }) {
  const navigate = useNavigate();
  const goLogin = onLoginClick || (() => navigate("/login"));

  const handleSair = () => {
    sessionStorage.removeItem("login_step");
    sessionStorage.removeItem("login_cpf");
    sessionStorage.removeItem("autorizado");
    sessionStorage.removeItem("gov_nome");
    sessionStorage.removeItem("gov_email");
    sessionStorage.removeItem("gov_telefone");
    navigate("/");
  };

  return (
    <header
      className="w-full bg-white border-b border-gray-200"
      data-testid="header"
    >
      <div className={`${mode === "logged" ? "w-full" : "max-w-[1200px] mx-auto"} px-3 sm:px-6 lg:px-10 py-3 sm:py-5 flex items-center justify-between gap-2`}>
        <button
          onClick={mode === "logged" ? () => navigate("/cadastro") : goLogin}
          className="flex items-center gap-2 sm:gap-4 cursor-pointer bg-transparent border-0 p-0 min-w-0"
          data-testid="header-brand"
        >
          <img
            src="https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/gtbwkdo5_imgi_1_govbr.svg"
            alt="gov.br"
            className="h-7 sm:h-8 w-auto flex-shrink-0"
            data-testid="header-govbr-logo"
          />
          <span className="hidden sm:inline-block w-px h-7 bg-gray-300" />
          <span
            className="hidden sm:inline-block txt-header-label truncate"
            data-testid="header-esa-label"
          >
            Escola de Sargentos das Armas
          </span>
          <span
            className="sm:hidden txt-header-label truncate"
            style={{ fontSize: 12 }}
            data-testid="header-esa-label-mobile"
          >
            ESA
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0">
          {mode === "logged" ? (
            <>
              <span
                className="hidden md:inline txt-header-link"
                style={{ cursor: "default" }}
                data-testid="link-exercito"
              >
                Exército Brasileiro
              </span>
              <span
                className="hidden md:inline txt-header-link"
                style={{ cursor: "default" }}
                data-testid="link-site-esa"
              >
                Site da ESA
              </span>
              <span className="hidden md:inline-block w-px h-6 bg-gray-300" />
              <button
                onClick={handleSair}
                className="entrar-btn inline-flex items-center gap-2"
                data-testid="header-sair-btn"
              >
                <span>Sair</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={goLogin}
                className="hidden md:inline txt-header-link hover:underline bg-transparent border-0 p-0 cursor-pointer"
                data-testid="link-exercito"
              >
                Exército Brasileiro
              </button>
              <button
                onClick={goLogin}
                className="hidden md:inline txt-header-link hover:underline bg-transparent border-0 p-0 cursor-pointer"
                data-testid="link-site-esa"
              >
                Site da ESA
              </button>
              <span className="hidden md:inline-block w-px h-6 bg-gray-300" />
              <button
                onClick={goLogin}
                className="entrar-btn inline-flex items-center gap-2"
                data-testid="header-entrar-btn"
              >
                <img
                  src="https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/8orq10a0_image.png"
                  alt=""
                  className="w-5 h-5"
                  aria-hidden="true"
                />
                <span>Entrar</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Sub-Hero exibido em páginas autenticadas, com hamburger e link Home.
 */
export function PortalHero() {
  const navigate = useNavigate();
  return (
    <section className="w-full bg-white border-b border-gray-200">
      <div className="w-full px-3 sm:px-6 lg:px-10 py-3 sm:py-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            className="bg-transparent border-0 p-0 cursor-pointer flex-shrink-0"
            style={{ color: "#1351b4" }}
            data-testid="menu-btn"
          >
            <Menu size={22} strokeWidth={3} className="sm:hidden" />
            <Menu size={28} strokeWidth={3} className="hidden sm:block" />
          </button>
          <div className="min-w-0">
            <h1 className="txt-page-title">Portal do candidato</h1>
            <p className="mt-0.5 sm:mt-1 txt-page-subtitle">
              Concurso de Admissão aos Cursos de Formação e Graduação de Sargentos
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/cadastro")}
          className="flex items-center gap-1 sm:gap-2 bg-transparent border-0 p-0 cursor-pointer flex-shrink-0"
          style={{ color: "#1351b4", fontFamily: '"Rawline","Raleway",sans-serif', fontWeight: 500 }}
          data-testid="home-link"
        >
          <HomeIcon size={18} className="sm:hidden" />
          <HomeIcon size={22} className="hidden sm:block" />          <span>Home</span>
        </button>
      </div>
    </section>
  );
}
