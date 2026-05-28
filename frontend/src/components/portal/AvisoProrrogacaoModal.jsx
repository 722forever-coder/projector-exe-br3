import React, { useEffect, useState } from "react";

/**
 * Modal de "Aviso importante" exibido na home do Portal do Candidato.
 * Aparece sempre que o usuário acessar a home (até clicar em "Ok, entendi"
 * naquela sessão). Visual idêntico ao aviso oficial do gov.br.
 */
export default function AvisoProrrogacaoModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Mostra o aviso uma vez por sessão para não atrapalhar a navegação
    const ja = sessionStorage.getItem("aviso_prorrogacao_visto");
    if (ja !== "true") {
      // pequeno delay para o portal carregar antes do modal aparecer
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, []);

  const fechar = () => {
    sessionStorage.setItem("aviso_prorrogacao_visto", "true");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aviso-prorrogacao-titulo"
      data-testid="aviso-prorrogacao-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45"
        onClick={fechar}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative bg-white rounded-md shadow-2xl w-full max-w-[460px] px-7 sm:px-9 py-8 text-center"
        style={{ fontFamily: "'Rawline', 'Raleway', Arial, sans-serif" }}
      >
        {/* Ícone azul circular com "!" */}
        <div className="flex justify-center mb-5">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 56,
              height: 56,
              background: "#e8f0fb",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1351b4"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16.5" r="1" fill="#1351b4" stroke="none" />
            </svg>
          </div>
        </div>

        <h2
          id="aviso-prorrogacao-titulo"
          className="text-[22px] sm:text-[26px] font-bold mb-5"
          style={{ color: "#1351b4" }}
        >
          Aviso importante
        </h2>

        <p
          className="text-[14px] sm:text-[15px] leading-[1.65] mb-4"
          style={{ color: "#1f1f1f" }}
        >
          As <strong>inscrições foram prorrogadas</strong> para o Concurso de
          Admissão ESA 2026.
        </p>

        <p
          className="text-[14px] sm:text-[15px] leading-[1.65] mb-7"
          style={{ color: "#1f1f1f" }}
        >
          O novo prazo final para realizar a sua inscrição encerra-se às{" "}
          <strong>23h59 do dia 18 de maio de 2026</strong>, horário de Brasília.
        </p>

        <button
          type="button"
          onClick={fechar}
          data-testid="aviso-prorrogacao-ok-btn"
          className="w-full py-3 rounded-sm text-white text-[15px] font-semibold transition-colors"
          style={{ background: "#1351b4" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0d3f8f")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1351b4")}
        >
          Ok, entendi
        </button>
      </div>
    </div>
  );
}
