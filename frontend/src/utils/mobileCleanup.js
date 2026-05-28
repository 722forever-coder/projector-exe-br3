/**
 * Esconde os ícones de acessibilidade (âncora vermelha + widget Rybena)
 * e aplica pequenos ajustes ESPECÍFICOS APENAS em mobile (≤768px).
 * NÃO mexe no layout geral do site para evitar quebrar a aparência Vunesp.
 *
 * Idempotente: pode ser chamado em todo onLoad do iframe sem problemas.
 *
 * @param {HTMLIFrameElement} iframe — elemento iframe (ref.current)
 */
export function injectMobileCleanup(iframe) {
  if (!iframe) return;
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc || !doc.head) return;

  // 1) Injeta CSS (somente uma vez por iframe)
  if (!doc.getElementById("__esa_mobile_cleanup")) {
    const style = doc.createElement("style");
    style.id = "__esa_mobile_cleanup";
    style.textContent = `
      /* === MOBILE: esconde widgets de acessibilidade laterais === */
      body.esa-mobile #ancora-container,
      body.esa-mobile #abrir-ancora,
      body.esa-mobile .ancora-acessbilidade,
      body.esa-mobile [class*="ancora-acessbilidade"],
      body.esa-mobile #rybena-sidebar,
      body.esa-mobile [id*="rybena"],
      body.esa-mobile .vw-access-button,
      body.esa-mobile [vw], body.esa-mobile [vw-access-button],
      body.esa-mobile .userway_buttons_wrapper,
      body.esa-mobile #userwayAccessibilityIcon,
      body.esa-mobile .barra-acessibilidade,
      body.esa-mobile [class*="barra-acessibilidade"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      /* === MOBILE: Portal Vunesp — ajustes pontuais === */
      /* Esconde "Busque por categoria, cargo, cidade ou o termo de sua preferência" */
      body.esa-mobile #lblBusca,
      body.esa-mobile label[for="ancora-busca"] {
        display: none !important;
      }

      /* Cola o botão "Inscreva-se com GovBr" logo abaixo da descrição.
         Removemos: <br> de espaçamento, social-media vazia e a altura
         automática (igual ao desktop) que o Bootstrap aplica à row. */
      body.esa-mobile section.row.concurso { display: block !important; }
      body.esa-mobile article.concurso > br,
      body.esa-mobile .visible-xs.sf-hidden,
      body.esa-mobile article.concurso .social-media:empty {
        display: none !important;
      }
      body.esa-mobile article.concurso.col-xs-12.col-sm-4 {
        padding-top: 0 !important;
        margin-top: 0 !important;
      }
      body.esa-mobile article.concurso.course-single {
        padding-bottom: 0 !important;
        margin-bottom: 0 !important;
      }
      body.esa-mobile .course-description { margin-bottom: 8px !important; }

      /* === MOBILE: Formulário de Inscrição === */
      /* Reduz títulos gigantes do topo (h1 "EsPCEx..." e h2 "Formulário...") */
      body.esa-mobile hgroup.text-center h1 {
        font-size: 22px !important;
        line-height: 1.2 !important;
        margin: 8px 0 4px !important;
      }
      body.esa-mobile hgroup.text-center h2 {
        font-size: 16px !important;
        line-height: 1.2 !important;
        margin: 0 0 10px !important;
      }
      /* Corrige bloco LGPD: texto justify cria buracos enormes e URL longa
         transborda para fora da página em mobile */
      body.esa-mobile .well,
      body.esa-mobile .well p {
        text-align: left !important;
        word-break: break-word !important;
        overflow-wrap: anywhere !important;
        hyphens: auto !important;
      }
      body.esa-mobile .well p span { font-size: 13px !important; }
      body.esa-mobile .well a {
        word-break: break-all !important;
        overflow-wrap: anywhere !important;
      }
    `;
    doc.head.appendChild(style);
  }

  // 2) Aplica/remove a classe conforme o viewport REAL do browser
  const aplicar = () => {
    if (!doc.body) return;
    const ehMobile = window.innerWidth <= 768;
    doc.body.classList.toggle("esa-mobile", ehMobile);
  };
  aplicar();

  // 3) Listener de resize (registra apenas uma vez por iframe)
  if (!iframe.__esaMobileListener) {
    iframe.__esaMobileListener = aplicar;
    window.addEventListener("resize", aplicar);
  }
}
