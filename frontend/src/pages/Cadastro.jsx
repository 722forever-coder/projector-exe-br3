import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { injectMobileCleanup } from "../utils/mobileCleanup";

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Cadastro / Formulário de Inscrição EsPCEx — clone da página Vunesp.
 * Renderiza o HTML em iframe e injeta:
 *  - Pré-preenchimento de CPF (vindo do login gov.br)
 *  - Máscaras: CPF, CEP, datas (DD/MM/AAAA), DDD, telefones
 *  - ViaCEP: ao digitar 8 dígitos no CEP, preenche logradouro/bairro/cidade/UF
 *  - Validação básica + captura do botão SALVAR → POST /api/inscricoes → /pagamento
 */
export default function Cadastro() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  // Guard: usuário precisa estar logado + autorizado
  useEffect(() => {
    if (!sessionStorage.getItem("login_cpf")) {
      navigate("/login");
      return;
    }
    if (sessionStorage.getItem("autorizado") !== "true") {
      navigate("/autorizacao");
    }
  }, [navigate]);

  const handleLoad = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    injectMobileCleanup(iframe);

    // ============ REMOVE WIDGETS DE CHAT (Genesys/Messenger) ============
    // O HTML original da Vunesp embute 4 iframes de chat com
    // z-index: 99999999 que sobrepõem a página inteira e interferem
    // no clique dos <select>. Como não fazem parte do fluxo, removemos.
    doc.querySelectorAll(
      "iframe[id*='genesys'], iframe[id*='messenger'], iframe[id*='Messenger']"
    ).forEach((el) => el.remove());
    // Também remove os wrappers parents dos chats (se existirem)
    doc.querySelectorAll("[id*='genesys'], [class*='genesys'], [class*='messenger']").forEach((el) => {
      if (el.tagName === "IFRAME") return;
      // só remove se for um wrapper claramente do chat
      if ((el.id || "").toLowerCase().includes("genesys") ||
          (el.className || "").toLowerCase().includes("genesys") ||
          (el.className || "").toLowerCase().includes("messenger")) {
        el.style.display = "none";
        el.style.pointerEvents = "none";
      }
    });

    // ============ 1. NEUTRALIZA NAVEGAÇÃO ============
    doc.querySelectorAll("form").forEach((f) => {
      f.setAttribute("action", "#");
      f.addEventListener("submit", (e) => e.preventDefault());
    });
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
    });

    // ============ REMOVE SEÇÃO "ACESSO" (senha) ============
    // Usuário já autenticou pelo gov.br — não faz sentido cadastrar senha.
    const senhaInput = doc.getElementById("Senha");
    if (senhaInput) {
      const fs = senhaInput.closest("fieldset");
      if (fs) {
        fs.style.display = "none";
        // remove o <br> seguinte se houver, pra não deixar espaço vazio
        const next = fs.nextElementSibling;
        if (next && next.tagName === "BR") next.style.display = "none";
      }
    }

    // ============ 2. PRÉ-PREENCHE CPF ============
    const cpfSalvo =
      sessionStorage.getItem("login_cpf") ||
      sessionStorage.getItem("cpf") ||
      "";
    // O campo CPF nesse HTML é "ng-model=CPF" — vamos procurar pelos campos
    // visíveis com placeholder "Digite seu CPF" e "Repita seu CPF".
    const allInputs = doc.querySelectorAll("input[type='text'], input:not([type])");
    allInputs.forEach((inp) => {
      const ph = (inp.getAttribute("placeholder") || "").toLowerCase();
      if (ph.includes("digite seu cpf") || ph === "cpf") {
        inp.value = cpfSalvo;
        inp.setAttribute("readonly", "readonly");
        inp.style.background = "#f3f4f6";
      }
    });
    const confirmCpf = doc.getElementById("confirmCPF");
    if (confirmCpf) {
      // Campo "Repita seu CPF" — DEVE ser preenchido manualmente pelo
      // usuário. Aplicamos máscara e validamos em tempo real se bate
      // com o CPF de login (vindo do gov.br).
      confirmCpf.value = "";
      confirmCpf.removeAttribute("readonly");
      confirmCpf.style.background = "";

      // Cria/recupera o elemento de erro abaixo do campo
      const ensureErrorEl = () => {
        let err = doc.getElementById("confirmCPF-error");
        if (!err) {
          err = doc.createElement("p");
          err.id = "confirmCPF-error";
          err.style.cssText =
            "color:#d04444;font-family:Rawline,Raleway,sans-serif;font-size:11px;margin:6px 0 0 2px;line-height:1.3;display:none;";
          const wrap = confirmCpf.closest(".floating-label-form-group") || confirmCpf.parentElement;
          if (wrap) wrap.appendChild(err);
        }
        return err;
      };

      const cpfLoginDigitos = (cpfSalvo || "").replace(/\D/g, "");

      const validarConfirm = () => {
        const err = ensureErrorEl();
        const valor = confirmCpf.value.replace(/\D/g, "");
        if (!valor) {
          err.style.display = "none";
          confirmCpf.style.borderColor = "";
          return;
        }
        // Só mostra erro depois que o usuário terminou de digitar (11 dígitos)
        if (valor.length < 11) {
          err.style.display = "none";
          confirmCpf.style.borderColor = "";
          return;
        }
        if (valor !== cpfLoginDigitos) {
          err.textContent = "O CPF digitado não confere com o CPF da autenticação gov.br.";
          err.style.display = "block";
          confirmCpf.style.borderColor = "#d04444";
        } else {
          err.style.display = "none";
          confirmCpf.style.borderColor = "";
        }
      };

      confirmCpf.addEventListener("input", () => {
        const masked = confirmCpf.value
          .replace(/\D/g, "")
          .slice(0, 11)
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1-$2");
        if (masked !== confirmCpf.value) {
          confirmCpf.value = masked;
          try {
            confirmCpf.setSelectionRange(masked.length, masked.length);
          } catch {}
        }
        validarConfirm();
      });
      confirmCpf.addEventListener("blur", validarConfirm);
    }
    // CPF principal é um <span class="form-control-static"> — substituímos o
    // texto hardcoded do HTML (056.169.463-03) pelo CPF real do usuário.
    doc.querySelectorAll("span.form-control-static").forEach((sp) => {
      if (/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(sp.textContent || "")) {
        sp.innerHTML = `&nbsp;&nbsp;&nbsp;${cpfSalvo}`;
      }
    });

    // ============ 3. MÁSCARAS ============
    const applyMask = (el, formatter) => {
      if (!el) return;
      el.addEventListener("input", (e) => {
        const start = el.selectionStart;
        const before = el.value;
        const after = formatter(before);
        if (after !== before) {
          el.value = after;
          // Mantém cursor próximo do fim
          try { el.setSelectionRange(after.length, after.length); } catch {}
        }
      });
    };

    const maskCEP = (v) =>
      v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
    const maskData = (v) =>
      v
        .replace(/\D/g, "")
        .slice(0, 8)
        .replace(/(\d{2})(\d)/, "$1/$2")
        .replace(/(\d{2})(\d)/, "$1/$2");
    const maskDDD = (v) => v.replace(/\D/g, "").slice(0, 2);
    const maskFone = (v) => {
      const d = v.replace(/\D/g, "").slice(0, 9);
      if (d.length <= 4) return d;
      if (d.length <= 8) return d.replace(/(\d{4})(\d)/, "$1-$2");
      return d.replace(/(\d{5})(\d)/, "$1-$2");
    };
    const maskDoc = (v) => v.replace(/[^\dA-Za-z]/g, "").slice(0, 14);

    applyMask(doc.getElementById("EndCEP"), maskCEP);
    applyMask(doc.getElementById("DataEmissao"), maskData);
    applyMask(doc.getElementById("DataNascimento"), maskData);
    applyMask(doc.getElementById("DddCelular"), maskDDD);
    applyMask(doc.getElementById("DddResidencial"), maskDDD);
    applyMask(doc.getElementById("DddComercial"), maskDDD);
    applyMask(doc.getElementById("FoneCelular"), maskFone);
    applyMask(doc.getElementById("FoneResidencial"), maskFone);
    applyMask(doc.getElementById("FoneComercial"), maskFone);
    applyMask(doc.getElementById("Documento"), maskDoc);

    // ============ AUTO-UPPERCASE no Nome (e outros nomes) ============
    // Ao sair do campo, converte para MAIÚSCULAS automaticamente
    // e garante que o "floating label" (Nome do Candidato) continue
    // visível acima do valor digitado.
    const uppercaseOnBlur = (id) => {
      const el = doc.getElementById(id);
      if (!el) return;
      const wrap = el.closest(".floating-label-form-group");
      el.addEventListener("blur", () => {
        if (el.value) {
          el.value = el.value.toLocaleUpperCase("pt-BR");
        }
        if (wrap && (el.value || "").trim()) {
          wrap.classList.add("floating-label-form-group-with-value");
          wrap.classList.add("has-value");
        }
      }, { passive: true });
    };
    uppercaseOnBlur("Nome");
    uppercaseOnBlur("NomeMae");
    uppercaseOnBlur("NomePai");

    // ============ AUTO-UPPERCASE GLOBAL ============
    // Todos os campos de texto do formulário ficam em MAIÚSCULAS ao
    // sair do campo, EXCETO: e-mail, senha e campos com formato
    // próprio (CPF, datas, CEP, telefones, DDD, documento).
    const SKIP_UPPER = new Set([
      "Senha",
      "Senha2",
      "confirmCPF",
      "EndCEP",
      "DataEmissao",
      "DataNascimento",
      "DddCelular",
      "DddResidencial",
      "DddComercial",
      "FoneCelular",
      "FoneResidencial",
      "FoneComercial",
      "Documento",
      "Digito",
    ]);
    const SKIP_TYPES = new Set([
      "password",
      "number",
      "date",
      "tel",
      "checkbox",
      "radio",
      "hidden",
      "file",
      "submit",
      "button",
    ]);
    doc.querySelectorAll("input, textarea").forEach((el) => {
      if (SKIP_UPPER.has(el.id)) return;
      const tp = (el.getAttribute("type") || "text").toLowerCase();
      if (SKIP_TYPES.has(tp)) return;
      el.addEventListener("blur", () => {
        if (!el.value) return;
        const upper = el.value.toLocaleUpperCase("pt-BR");
        if (upper === el.value) return;
        el.value = upper;
        // Mantém o floating label visível, sem disparar eventos pesados
        // (dispatchEvent re-render Angular e pode travar selects clicados
        // logo em seguida).
        const wrap = el.closest(".floating-label-form-group");
        if (wrap) {
          wrap.classList.add("floating-label-form-group-with-value");
          wrap.classList.add("has-value");
        }
      }, { passive: true });
    });

    // ============ FLOATING LABEL ROBUSTO ============
    // Garante que o label flutuante (ex: "CEP", "Nome do Candidato",
    // "Data de Nascimento", etc.) NUNCA suma quando o campo tem valor.
    // Usamos UM ÚNICO listener no documento (delegação de evento) em vez
    // de 60+ listeners — performance muito melhor, sem travar selects.
    const ensureLabel = (el) => {
      const wrap = el.closest(".floating-label-form-group");
      if (!wrap) return;
      const hasVal = (el.value || "").toString().trim().length > 0;
      if (hasVal) {
        wrap.classList.add("floating-label-form-group-with-value");
        wrap.classList.add("has-value");
      }
      // Não removemos as classes quando vazio — o HTML original já vem
      // com essas classes em alguns campos (ex: atr4664 — Cidade da
      // Prova), pois o label deve ficar visível antes mesmo de o usuário
      // selecionar algo. Remover quebraria o visual original.
    };
    // Aplica estado inicial em todos os campos
    doc.querySelectorAll(
      ".floating-label-form-group input, .floating-label-form-group textarea, .floating-label-form-group select"
    ).forEach(ensureLabel);
    // Delegação: apenas 2 listeners no body inteiro
    doc.body.addEventListener("change", (e) => {
      const t = e.target;
      if (t && t.matches && t.matches(".floating-label-form-group input, .floating-label-form-group textarea, .floating-label-form-group select")) {
        ensureLabel(t);
      }
    }, { passive: true });
    doc.body.addEventListener("blur", (e) => {
      const t = e.target;
      if (t && t.matches && t.matches(".floating-label-form-group input, .floating-label-form-group textarea")) {
        ensureLabel(t);
      }
    }, { capture: true, passive: true });
    // CSS de segurança
    const style = doc.createElement("style");
    style.textContent = `
      .floating-label-form-group.floating-label-form-group-with-value > label,
      .floating-label-form-group.has-value > label {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      /* Os <label> dos floating-label ficam sobrepostos ao input/select e
         interceptavam cliques do mouse, fazendo o dropdown não abrir.
         pointer-events:none deixa o clique passar direto para o campo. */
      .floating-label-form-group > label {
        pointer-events: none;
      }
    `;
    doc.head.appendChild(style);

    // ============ 4. VIA CEP (auto preencher endereço) ============
    const cepEl = doc.getElementById("EndCEP");
    if (cepEl) {
      cepEl.addEventListener("blur", async () => {
        const digits = (cepEl.value || "").replace(/\D/g, "");
        if (digits.length !== 8) return;
        try {
          const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.erro) return;
          const setVal = (id, val) => {
            const el = doc.getElementById(id);
            if (el && !el.value && val) {
              el.value = val;
              // Dispara evento de "change" pra integrar com possíveis
              // bindings de Angular/JS originais da página
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
              // remove classe de "vazio" pra label flutuante mostrar valor
              const wrap = el.closest(".floating-label-form-group");
              if (wrap) {
                wrap.classList.add("floating-label-form-group-with-value");
                wrap.classList.add("has-value");
              }
            }
          };
          setVal("EndLogradouro", data.logradouro);
          setVal("EndBairro", data.bairro);
          setVal("EndCidade", data.localidade);
          // UF é um <select>
          const uf = doc.getElementById("EndUF");
          if (uf && data.uf) {
            uf.value = data.uf;
            uf.dispatchEvent(new Event("change", { bubbles: true }));
          }
          // Foca no campo Número
          const num = doc.getElementById("EndNumero");
          if (num) num.focus();
        } catch (err) {
          console.warn("ViaCEP falhou:", err);
        }
      });
    }

    // ============ 5. CAPTURA O CLIQUE NO "SALVAR" ============
    const salvarBtn = Array.from(doc.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim().toUpperCase() === "SALVAR"
    );

    // ============ 6. PRÉ-PREENCHIMENTO (se já houver inscrição prévia) ============
    // Busca pelo CPF do usuário no backend e, se houver dados, preenche
    // automaticamente todos os campos.
    const cpfUser =
      sessionStorage.getItem("login_cpf") ||
      sessionStorage.getItem("cpf") ||
      "";
    if (cpfUser) {
      try {
        const buscar = (v) =>
          axios.get(`${API}/api/inscricoes/by-cpf/${encodeURIComponent(v)}`);
        let resp = null;
        try {
          resp = await buscar(cpfUser);
        } catch {
          resp = await buscar(cpfUser.replace(/\D/g, ""));
        }
        const insc = resp?.data;
        const cad = (insc?.cadastro || {});
        const ins = (insc?.inscricao || {});

        // Função utilitária: preenche input por id
        const fill = (id, val) => {
          if (val == null || val === "") return;
          const el = doc.getElementById(id);
          if (!el) return;
          el.value = String(val);
          const wrap = el.closest(".floating-label-form-group");
          if (wrap) {
            wrap.classList.add("floating-label-form-group-with-value");
            wrap.classList.add("has-value");
          }
        };
        // Select: tenta value direto OU casa pelo texto do option
        const fillSelect = (id, val) => {
          if (!val) return;
          const el = doc.getElementById(id);
          if (!el) return;
          // value direto
          const opt = Array.from(el.options).find(
            (o) =>
              o.value === val ||
              o.textContent.trim().toLowerCase() === String(val).trim().toLowerCase()
          );
          if (opt) {
            el.value = opt.value;
            const wrap = el.closest(".floating-label-form-group");
            if (wrap) {
              wrap.classList.add("floating-label-form-group-with-value");
              wrap.classList.add("has-value");
            }
          }
        };
        // Radio: marca o input que tem o mesmo label (texto)
        const checkRadioByLabel = (name, labelText) => {
          if (!labelText) return;
          const radios = doc.querySelectorAll(`input[type=radio][name=${name}]`);
          const norm = (s) => String(s).trim().toLowerCase();
          radios.forEach((r) => {
            const lbl = r.closest("label");
            const txt = (lbl?.textContent || r.value || "").trim();
            if (norm(txt) === norm(labelText) || norm(r.value) === norm(labelText)) {
              r.checked = true;
              r.dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
        };

        // ===== Identificação =====
        fill("Nome", cad.nome);
        // Repita CPF: NÃO preenchemos automaticamente — o usuário precisa
        // digitar manualmente para confirmar que o CPF está correto.
        fill("Documento", cad.documento || ins.documento);
        fill("Digito", cad.digito || ins.digito);
        fillSelect("OrgaoEmissor", cad.orgaoEmissor || ins.orgaoEmissor);
        fill("DataEmissao", cad.dataEmissao || ins.dataEmissao);

        // ===== Endereço =====
        fillSelect("EndPais", cad.endPais);
        fill("EndCEP", cad.cep);
        fill("EndLogradouro", cad.endereco);
        fill("EndNumero", cad.numero);
        fill("EndComplemento", cad.complemento);
        fill("EndBairro", cad.bairro);
        fill("EndCidade", cad.cidade);
        fillSelect("EndUF", cad.uf);

        // ===== Complementos =====
        fillSelect("NacionalidadeId", cad.nacionalidade || ins.nacionalidade);
        fill("NaturalCidade", cad.naturalCidade || ins.naturalCidade);
        fillSelect("NaturalUF", cad.naturalUF || ins.naturalUF);
        checkRadioByLabel("Sexo", cad.sexo || ins.sexo);
        fill("DataNascimento", cad.dataNascimento);
        fillSelect("EstadoCivil", cad.estadoCivil || ins.estadoCivil);
        checkRadioByLabel("MaoPredominante", cad.maoPredominante || ins.maoPredominante);

        // ===== Contato =====
        fill("DddCelular", cad.dddCelular);
        fill("FoneCelular", cad.foneCelular);
        fill("DddResidencial", cad.dddResidencial);
        fill("FoneResidencial", cad.foneResidencial);
        fill("DddComercial", cad.dddComercial);
        fill("FoneComercial", cad.foneComercial);
        fill("Email", cad.email);

        // ===== Filiação =====
        fill("NomeMae", cad.nomeMae);
        fill("NomePai", cad.nomePai);

        // ===== Inscrição =====
        fillSelect("selectOpcao", ins.opcaoCargo);
        checkRadioByLabel("atr4622", ins.origemEscola);
        fillSelect("atr4623", ins.colegioMilitar);
        checkRadioByLabel("atr4624", ins.situacaoMilitarCandidato);
        checkRadioByLabel("atr4625", ins.situacaoMilitarPais);
        checkRadioByLabel("atr4626", ins.autodeclaraNegro);
        checkRadioByLabel("atr4627", ins.concorrerVagasNegros);
        checkRadioByLabel("atr4628", ins.autodeclaraIndigena);
        checkRadioByLabel("atr4629", ins.concorrerVagasIndigena);
        checkRadioByLabel("atr4630", ins.autodeclaraQuilombola);
        checkRadioByLabel("atr4631", ins.concorrerVagasQuilombola);
        checkRadioByLabel("atr4632", ins.realizouCurso);
        fill("atr4633", ins.nomeCurso);
        fill("atr4634", ins.cidadeCurso);
        checkRadioByLabel("atr4635", ins.primeiraVez);
        fill("atr4636", ins.quantasVezes);
        checkRadioByLabel("atr4661", ins.cienteAcordo);
        fillSelect("atr4664", ins.cidadeProva);

        // Declaração: marca se já estava declarada
        if (ins.declaracaoVeracidade === "Sim" || cad.declaracaoVeracidade === "Sim") {
          const decl = doc.getElementById("DeclaracaoVeracidade");
          if (decl) decl.checked = true;
        }

        // Banner informativo (azul) — somente se realmente preencheu algo
        if (cad.nome || cad.email) {
          const info = doc.createElement("div");
          info.style.cssText =
            "position:sticky;top:0;left:0;right:0;z-index:9998;background:#dbeafe;color:#1e40af;border-bottom:1px solid #93c5fd;padding:12px 20px;font:600 14px Arial,sans-serif;text-align:center;";
          info.textContent =
            "Seus dados foram recuperados automaticamente. Revise e atualize se necessário.";
          doc.body.insertBefore(info, doc.body.firstChild);
          setTimeout(() => {
            info.style.transition = "opacity 0.6s";
            info.style.opacity = "0";
            setTimeout(() => info.remove(), 700);
          }, 5000);
        }
      } catch (err) {
        // 404 = não há inscrição prévia. Tudo bem, segue formulário em branco.
        if (err?.response?.status !== 404) {
          console.warn("Falha ao buscar inscrição prévia:", err?.message || err);
        }
      }
    }

    const coletarDados = () => {
      const get = (id) => {
        const el = doc.getElementById(id);
        return el ? (el.value || "").trim() : "";
      };
      const getRadio = (name) => {
        const checked = doc.querySelector(`input[name=${name}]:checked`);
        if (!checked) return "";
        const lbl = checked.closest("label");
        return (lbl?.textContent || checked.value || "").trim();
      };
      const getSelect = (id) => {
        const el = doc.getElementById(id);
        if (!el) return "";
        const opt = el.options[el.selectedIndex];
        return opt ? opt.textContent.trim() : "";
      };
      return {
        nome: get("Nome"),
        cpf:
          sessionStorage.getItem("login_cpf") ||
          sessionStorage.getItem("cpf") ||
          "",
        documento: get("Documento"),
        digito: get("Digito"),
        orgaoEmissor: getSelect("OrgaoEmissor"),
        dataEmissao: get("DataEmissao"),
        endPais: getSelect("EndPais"),
        endCEP: get("EndCEP"),
        endLogradouro: get("EndLogradouro"),
        endNumero: get("EndNumero"),
        endComplemento: get("EndComplemento"),
        endBairro: get("EndBairro"),
        endCidade: get("EndCidade"),
        endUF: getSelect("EndUF"),
        nacionalidade: getSelect("NacionalidadeId"),
        naturalCidade: get("NaturalCidade"),
        naturalUF: getSelect("NaturalUF"),
        sexo: getRadio("Sexo"),
        dataNascimento: get("DataNascimento"),
        estadoCivil: getSelect("EstadoCivil"),
        maoPredominante: getRadio("MaoPredominante"),
        dddCelular: get("DddCelular"),
        foneCelular: get("FoneCelular"),
        dddResidencial: get("DddResidencial"),
        foneResidencial: get("FoneResidencial"),
        dddComercial: get("DddComercial"),
        foneComercial: get("FoneComercial"),
        email: get("Email"),
        nomeMae: get("NomeMae"),
        nomePai: get("NomePai"),
        // Telefone completo formatado (usado em outras telas)
        telefone: (() => {
          const ddd = get("DddCelular");
          const fone = get("FoneCelular");
          return ddd && fone ? `(${ddd}) ${fone}` : "";
        })(),
        cidade: get("EndCidade"),
        uf: getSelect("EndUF"),
        cidadeProva: getSelect("atr4664"),
        // === Inscrição: radios e selects da seção "Opção/Inscrição" ===
        opcaoCargo: getSelect("selectOpcao"),
        origemEscola: getRadio("atr4622"),
        colegioMilitar: getSelect("atr4623"),
        situacaoMilitarCandidato: getRadio("atr4624"),
        situacaoMilitarPais: getRadio("atr4625"),
        autodeclaraNegro: getRadio("atr4626"),
        concorrerVagasNegros: getRadio("atr4627"),
        autodeclaraIndigena: getRadio("atr4628"),
        concorrerVagasIndigena: getRadio("atr4629"),
        autodeclaraQuilombola: getRadio("atr4630"),
        concorrerVagasQuilombola: getRadio("atr4631"),
        realizouCurso: getRadio("atr4632"),
        nomeCurso: get("atr4633"),
        cidadeCurso: get("atr4634"),
        primeiraVez: getRadio("atr4635"),
        quantasVezes: get("atr4636"),
        cienteAcordo: getRadio("atr4661"),
        declaracaoVeracidade:
          doc.getElementById("DeclaracaoVeracidade")?.checked ? "Sim" : "Não",
      };
    };

    const validar = (dados) => {
      const erros = [];
      const camposFalha = []; // IDs ou nomes pra destacar em vermelho

      const isRadioChecked = (name) =>
        !!doc.querySelector(`input[name=${name}]:checked`);

      // ============ IDENTIFICAÇÃO ============
      if (!dados.nome) {
        erros.push("Nome do Candidato");
        camposFalha.push({ type: "id", val: "Nome" });
      }
      // Confirmação de CPF
      const confirm = (doc.getElementById("confirmCPF")?.value || "").trim();
      const onlyDigits = (s) => s.replace(/\D/g, "");
      if (!confirm) {
        erros.push("Repita seu CPF");
        camposFalha.push({ type: "id", val: "confirmCPF" });
      } else if (onlyDigits(confirm) !== onlyDigits(dados.cpf)) {
        erros.push("Os CPFs digitados não conferem");
        camposFalha.push({ type: "id", val: "confirmCPF" });
      }
      if (!dados.documento) {
        erros.push("Número do Documento (RG/RNE)");
        camposFalha.push({ type: "id", val: "Documento" });
      }
      // Dígito NÃO é obrigatório
      if (!dados.orgaoEmissor || dados.orgaoEmissor === "Selecione") {
        erros.push("Órgão Emissor");
        camposFalha.push({ type: "id", val: "OrgaoEmissor" });
      }
      if (!dados.dataEmissao) {
        erros.push("Data de Emissão");
        camposFalha.push({ type: "id", val: "DataEmissao" });
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dados.dataEmissao)) {
        erros.push("Data de Emissão inválida (use DD/MM/AAAA)");
        camposFalha.push({ type: "id", val: "DataEmissao" });
      }

      // ============ ENDEREÇO ============
      if (!dados.endPais || dados.endPais === "Selecione") {
        erros.push("País");
        camposFalha.push({ type: "id", val: "EndPais" });
      }
      if (!dados.endCEP) {
        erros.push("CEP");
        camposFalha.push({ type: "id", val: "EndCEP" });
      }
      if (!dados.endLogradouro) {
        erros.push("Logradouro");
        camposFalha.push({ type: "id", val: "EndLogradouro" });
      }
      if (!dados.endNumero) {
        erros.push("Número");
        camposFalha.push({ type: "id", val: "EndNumero" });
      }
      if (!dados.endBairro) {
        erros.push("Bairro");
        camposFalha.push({ type: "id", val: "EndBairro" });
      }
      if (!dados.endCidade) {
        erros.push("Cidade");
        camposFalha.push({ type: "id", val: "EndCidade" });
      }
      if (!dados.endUF || dados.endUF === "Selecione") {
        erros.push("UF");
        camposFalha.push({ type: "id", val: "EndUF" });
      }

      // ============ COMPLEMENTOS ============
      if (!dados.nacionalidade || dados.nacionalidade === "Selecione") {
        erros.push("Nacionalidade");
        camposFalha.push({ type: "id", val: "NacionalidadeId" });
      }
      if (!dados.naturalCidade) {
        erros.push("Natural da Cidade");
        camposFalha.push({ type: "id", val: "NaturalCidade" });
      }
      if (!dados.naturalUF || dados.naturalUF === "Selecione") {
        erros.push("Natural da UF");
        camposFalha.push({ type: "id", val: "NaturalUF" });
      }
      if (!isRadioChecked("Sexo")) {
        erros.push("Gênero");
        camposFalha.push({ type: "name", val: "Sexo" });
      }
      if (!dados.dataNascimento) {
        erros.push("Data de Nascimento");
        camposFalha.push({ type: "id", val: "DataNascimento" });
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dados.dataNascimento)) {
        erros.push("Data de Nascimento inválida (use DD/MM/AAAA)");
        camposFalha.push({ type: "id", val: "DataNascimento" });
      }
      if (!dados.estadoCivil || dados.estadoCivil === "Selecione") {
        erros.push("Estado Civil");
        camposFalha.push({ type: "id", val: "EstadoCivil" });
      }
      if (!isRadioChecked("MaoPredominante")) {
        erros.push("Mão Predominante");
        camposFalha.push({ type: "name", val: "MaoPredominante" });
      }

      // ============ CONTATO (pelo menos 1 telefone — Celular) ============
      if (!dados.dddCelular) {
        erros.push("DDD do Celular");
        camposFalha.push({ type: "id", val: "DddCelular" });
      }
      if (!dados.foneCelular) {
        erros.push("Telefone Celular");
        camposFalha.push({ type: "id", val: "FoneCelular" });
      }
      if (!dados.email) {
        erros.push("E-mail");
        camposFalha.push({ type: "id", val: "Email" });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
        erros.push("E-mail inválido");
        camposFalha.push({ type: "id", val: "Email" });
      }

      // ============ FILIAÇÃO ============
      if (!dados.nomeMae) {
        erros.push("Nome da Mãe");
        camposFalha.push({ type: "id", val: "NomeMae" });
      }

      // ============ INSCRIÇÃO (radios obrigatórios) ============
      const radiosObrig = [
        ["atr4622", "Origem da Escola"],
        ["atr4624", "Situação militar do Candidato"],
        ["atr4625", "Situação militar do pai/mãe"],
        ["atr4626", "Autodeclaração (negro/preto/pardo)"],
        ["atr4628", "Autodeclaração (indígena)"],
        ["atr4630", "Autodeclaração (quilombola)"],
        ["atr4632", "Realizou curso preparatório para EsPCEx?"],
        ["atr4635", "É a primeira vez que realiza o concurso?"],
        ["atr4661", 'Marcar "Ciente e De acordo"'],
      ];
      for (const [name, label] of radiosObrig) {
        if (!isRadioChecked(name)) {
          erros.push(label);
          camposFalha.push({ type: "name", val: name });
        }
      }

      // ============ CIDADE DA PROVA ============
      if (!dados.cidadeProva || dados.cidadeProva === "Selecione") {
        erros.push("Escolha do Estado/Cidade para realizar a prova");
        camposFalha.push({ type: "id", val: "atr4664" });
      }

      // ============ DECLARAÇÃO DE VERACIDADE ============
      const decl = doc.getElementById("DeclaracaoVeracidade");
      if (decl && !decl.checked) {
        erros.push("Declaração de Veracidade");
        camposFalha.push({ type: "id", val: "DeclaracaoVeracidade" });
      }

      return { erros, camposFalha };
    };

    const limparDestaques = () => {
      doc.querySelectorAll(".__esa-erro-campo").forEach((el) => {
        el.classList.remove("__esa-erro-campo");
        el.style.outline = "";
        el.style.background = "";
        el.style.borderColor = "";
        el.style.borderWidth = "";
        el.style.borderStyle = "";
        el.style.boxShadow = "";
      });
      const msg = doc.getElementById("__esa_error_msg");
      if (msg) msg.remove();
    };

    const destacarCampos = (campos) => {
      limparDestaques();
      campos.forEach((c) => {
        let elems = [];
        if (c.type === "id") {
          const el = doc.getElementById(c.val);
          if (el) elems = [el];
        } else if (c.type === "name") {
          elems = Array.from(doc.querySelectorAll(`input[name=${c.val}]`));
        }
        elems.forEach((el) => {
          el.classList.add("__esa-erro-campo");
          // Borda vermelha fina (1px) diretamente no campo — sem tinto de fundo
          el.style.borderColor = "#dc2626";
          el.style.borderWidth = "1px";
          el.style.borderStyle = "solid";
          el.style.boxShadow = "none";
        });
      });
    };

    const showError = (erros, campos) => {
      // Remove banner anterior (se existir de versões antigas)
      const oldTop = doc.getElementById("__esa_error_banner");
      if (oldTop) oldTop.remove();

      // Mensagem suave abaixo do botão Salvar
      const btn = Array.from(doc.querySelectorAll("button")).find(
        (b) => (b.textContent || "").trim().toUpperCase() === "SALVAR"
      );
      if (!btn) return;
      let msg = doc.getElementById("__esa_error_msg");
      if (!msg) {
        msg = doc.createElement("p");
        msg.id = "__esa_error_msg";
        msg.style.cssText =
          "color:#dc2626;font:400 12px/1.45 Rawline,Raleway,Arial,sans-serif;margin:10px 0 0;text-align:center;letter-spacing:0.1px;";
        btn.parentElement.appendChild(msg);
      }
      const lista = erros.join(" · ");
      if (erros.length === 1) {
        msg.textContent = `Preencha o campo obrigatório: ${lista}.`;
      } else if (erros.length <= 4) {
        msg.textContent = `Preencha os ${erros.length} campos destacados em vermelho: ${lista}.`;
      } else {
        const primeiros = erros.slice(0, 3).join(", ");
        msg.textContent = `Preencha os ${erros.length} campos destacados em vermelho (${primeiros} e mais ${erros.length - 3}).`;
      }

      // Foca/rola até o primeiro campo destacado (suave)
      if (campos && campos.length) {
        const first = campos[0];
        const el =
          first.type === "id"
            ? doc.getElementById(first.val)
            : doc.querySelector(`input[name=${first.val}]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          try { el.focus({ preventScroll: true }); } catch {}
        }
      }
    };

    // Ao alterar um campo destacado, retira o destaque
    const limparCampoIndividual = (t) => {
      if (!t || !t.classList || !t.classList.contains("__esa-erro-campo")) return;
      t.classList.remove("__esa-erro-campo");
      t.style.borderColor = "";
      t.style.borderWidth = "";
      t.style.borderStyle = "";
      t.style.boxShadow = "";
      // Se não há mais campos com erro, remove a mensagem
      if (!doc.querySelector(".__esa-erro-campo")) {
        const msg = doc.getElementById("__esa_error_msg");
        if (msg) msg.remove();
      }
    };
    doc.body.addEventListener("input", (e) => limparCampoIndividual(e.target), {
      passive: true, capture: true,
    });
    doc.body.addEventListener("change", (e) => limparCampoIndividual(e.target), {
      passive: true, capture: true,
    });

    const enviar = async () => {
      const dados = coletarDados();
      const { erros, camposFalha } = validar(dados);
      if (erros.length > 0) {
        destacarCampos(camposFalha);
        showError(erros, camposFalha);
        return;
      }
      // Sucesso — limpa qualquer destaque/erro anterior
      limparDestaques();
      if (salvarBtn) {
        salvarBtn.disabled = true;
        salvarBtn.textContent = "SALVANDO...";
        salvarBtn.style.opacity = "0.7";
      }
      // Separa "cadastro" e "inscricao" pra manter compatibilidade
      // com o painel admin (que lê esses subconjuntos), mas guardamos
      // TODOS os dados originais dentro de cadastro/inscricao para
      // permitir pré-preenchimento posterior.
      const cadastro = {
        nome: dados.nome,
        cpf: dados.cpf,
        email: dados.email,
        telefone: dados.telefone,
        cidade: dados.cidade,
        uf: dados.uf,
        endereco: dados.endLogradouro,
        numero: dados.endNumero,
        complemento: dados.endComplemento,
        bairro: dados.endBairro,
        cep: dados.endCEP,
        dataNascimento: dados.dataNascimento,
        nomeMae: dados.nomeMae,
        nomePai: dados.nomePai,
        // === extras pra pré-preenchimento ===
        documento: dados.documento,
        digito: dados.digito,
        orgaoEmissor: dados.orgaoEmissor,
        dataEmissao: dados.dataEmissao,
        endPais: dados.endPais,
        nacionalidade: dados.nacionalidade,
        naturalCidade: dados.naturalCidade,
        naturalUF: dados.naturalUF,
        sexo: dados.sexo,
        estadoCivil: dados.estadoCivil,
        maoPredominante: dados.maoPredominante,
        dddCelular: dados.dddCelular,
        foneCelular: dados.foneCelular,
        dddResidencial: dados.dddResidencial,
        foneResidencial: dados.foneResidencial,
        dddComercial: dados.dddComercial,
        foneComercial: dados.foneComercial,
      };
      const inscricao = {
        cidadeProva: dados.cidadeProva,
        documento: dados.documento,
        digito: dados.digito,
        orgaoEmissor: dados.orgaoEmissor,
        dataEmissao: dados.dataEmissao,
        nacionalidade: dados.nacionalidade,
        naturalCidade: dados.naturalCidade,
        naturalUF: dados.naturalUF,
        sexo: dados.sexo,
        estadoCivil: dados.estadoCivil,
        maoPredominante: dados.maoPredominante,
        // Inscrição: opção + radios
        opcaoCargo: dados.opcaoCargo,
        origemEscola: dados.origemEscola,
        colegioMilitar: dados.colegioMilitar,
        situacaoMilitarCandidato: dados.situacaoMilitarCandidato,
        situacaoMilitarPais: dados.situacaoMilitarPais,
        autodeclaraNegro: dados.autodeclaraNegro,
        concorrerVagasNegros: dados.concorrerVagasNegros,
        autodeclaraIndigena: dados.autodeclaraIndigena,
        concorrerVagasIndigena: dados.concorrerVagasIndigena,
        autodeclaraQuilombola: dados.autodeclaraQuilombola,
        concorrerVagasQuilombola: dados.concorrerVagasQuilombola,
        realizouCurso: dados.realizouCurso,
        nomeCurso: dados.nomeCurso,
        cidadeCurso: dados.cidadeCurso,
        primeiraVez: dados.primeiraVez,
        quantasVezes: dados.quantasVezes,
        cienteAcordo: dados.cienteAcordo,
        declaracaoVeracidade: dados.declaracaoVeracidade,
      };
      // Gera/recupera número de referência
      let ref = sessionStorage.getItem("ref_pagamento");
      if (!ref) {
        ref = String(Date.now());
        sessionStorage.setItem("ref_pagamento", ref);
      }

      sessionStorage.setItem("cadastro_basico", JSON.stringify(cadastro));
      sessionStorage.setItem("inscricao_dados", JSON.stringify(inscricao));
      sessionStorage.setItem("inscricao_concluida", "true");
      // Guarda TODOS os dados originais do formulário para a página
      // de Protocolo conseguir reexibir tudo
      sessionStorage.setItem("dados_inscricao", JSON.stringify(dados));

      try {
        await axios.post(`${API}/api/inscricoes`, {
          cpf: dados.cpf,
          cadastro,
          inscricao,
          numero_referencia: ref,
        });
        sessionStorage.setItem("inscricao_enviada_backend", "true");
      } catch (err) {
        console.warn("Falha ao enviar inscrição ao backend:", err?.message || err);
      }

      // Exibe banner verde de sucesso por 2 segundos antes de navegar
      let ok = doc.getElementById("__esa_success_banner");
      if (!ok) {
        ok = doc.createElement("div");
        ok.id = "__esa_success_banner";
        ok.style.cssText =
          "position:sticky;top:0;left:0;right:0;z-index:9999;background:#dcfce7;color:#166534;border-bottom:1px solid #86efac;padding:14px 20px;font:700 15px Arial,sans-serif;text-align:center;";
        doc.body.insertBefore(ok, doc.body.firstChild);
      }
      ok.textContent = `Inscrição registrada com sucesso! Número de referência: ${ref}`;
      ok.scrollIntoView({ behavior: "smooth", block: "start" });
      if (salvarBtn) {
        salvarBtn.disabled = true;
        salvarBtn.textContent = "INSCRIÇÃO ENVIADA";
        salvarBtn.style.opacity = "0.85";
        salvarBtn.style.background = "#16a34a";
      }

      // Navega para a página de Protocolo após 2 segundos
      setTimeout(() => navigate("/protocolo"), 2000);
    };

    if (salvarBtn) {
      salvarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        enviar();
      });
    }

    // Bonus: também intercepta o submit do form principal (Enter)
    const mainForm = doc.querySelector("form[action*='Register']");
    if (mainForm) {
      mainForm.addEventListener("submit", (e) => {
        e.preventDefault();
        enviar();
      });
    }
  };

  return (
    <iframe
      ref={iframeRef}
      title="Formulário de Inscrição EsPCEx"
      src="/inscricao-form.html"
      onLoad={handleLoad}
      data-testid="inscricao-form-iframe"
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
