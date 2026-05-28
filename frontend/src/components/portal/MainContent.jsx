import React from "react";
import { useNavigate } from "react-router-dom";

const ASSETS = {
  esa: "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/jte4r7hw_imgi_2_esa.svg",
  aviso:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/ijsrrb17_imgi_3_undraw_progress_tracking_re_ulfg.svg",
  noticias:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/0wby1aoe_imgi_4_noticias.svg",
  provas:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/bevn6tjr_imgi_5_undraw_creative-flow_t3kz.svg",
  legislacao:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/s80r6n4g_imgi_6_undraw_folder-files_5www.svg",
  govbrCard:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/h3xsvsjs_imgi_7_govbr.png",
  pagtesouro:
    "https://customer-assets.emergentagent.com/job_fazer-web-1/artifacts/77cz6qy3_imgi_8_pagtesouro.jpg",
};

export default function MainContent() {
  const navigate = useNavigate();
  const goLogin = () => navigate("/login");

  return (
    <main
      className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-10 py-5 sm:py-10 pb-4 cursor-pointer"
      onClick={goLogin}
      data-testid="main-clickable"
    >
      <h2
        className="text-center txt-title-main mb-5 sm:mb-10"
        data-testid="main-title"
      >
        Concurso de Admissão aos Cursos de Formação e Graduação de Sargentos
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_270px] gap-5 sm:gap-10">
        {/* Left column */}
        <div className="space-y-5">
          {/* Intro com brasão ESA */}
          <div className="flex flex-row gap-4 items-start">
            <div className="shrink-0">
              <img
                src={ASSETS.esa}
                alt="Brasão da Escola de Sargentos das Armas"
                className="w-[72px] h-auto"
                data-testid="img-esa-shield"
              />
            </div>
            <p className="txt-body" data-testid="intro-text">
              A Escola de Sargento das Armas (ESA), localizada na cidade de
              Três Corações, MG, é o estabelecimento de ensino militar do
              Exército responsável por selecionar e preparar os jovens para o
              ingresso no curso de Formação e Graduação de Sargentos.
            </p>
          </div>

          <div className="section-divider" />

          <Section
            illustration={<Illustration src={ASSETS.aviso} alt="Aviso" />}
            data-testid="aviso-section"
          >
            <h3 className="txt-title-section mb-2">AVISO IMPORTANTE:</h3>
            <p className="txt-strong mb-1">Prezado candidato,</p>
            <p className="txt-body mb-5">
              As inscrições estarão abertas a partir do dia 30 de março de
              2026.
            </p>
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLogin();
                }}
                className="gov-btn-outline"
                data-testid="acessar-portal-btn"
              >
                Acessar portal
              </button>
            </div>
          </Section>

          <div className="section-divider" />

          <Section
            illustration={<Illustration src={ASSETS.noticias} alt="Notícias" />}
            data-testid="publicacoes-section"
          >
            <h3 className="txt-title-section mb-2">Publicações e notícias</h3>
            <p className="txt-body">
              <span className="hover:underline gov-blue cursor-pointer">
                Clique aqui
              </span>{" "}
              para acessar as publicações, listas e resultados do processo de
              seleção do concurso de admissão.
            </p>
          </Section>

          <div className="section-divider" />

          <Section
            illustration={<Illustration src={ASSETS.provas} alt="Provas" />}
            data-testid="provas-section"
          >
            <h3 className="txt-title-section mb-2">Provas anteriores</h3>
            <p className="txt-body">
              <span className="hover:underline gov-blue cursor-pointer">
                Clique aqui
              </span>{" "}
              para acessar as provas do concurso de admissão de anos
              anteriores.
            </p>
          </Section>

          <div className="section-divider" />

          <Section
            illustration={<Illustration src={ASSETS.legislacao} alt="Legislação" />}
            data-testid="legislacao-section"
          >
            <h3 className="txt-title-section mb-2">Legislação do concurso</h3>
            <p className="txt-body">
              <span className="hover:underline gov-blue cursor-pointer">
                Clique aqui
              </span>{" "}
              para baixar o Edital, Manual do Candidato e demais documentos
              que amparam o concurso de admissão.
            </p>
          </Section>
        </div>

        {/* Right column / sidebar */}
        <aside className="space-y-6" data-testid="sidebar">
          <div
            className="rounded-md border border-gray-200 p-5 bg-white"
            data-testid="card-govbr"
          >
            <div className="flex items-center justify-center py-10 bg-white border border-gray-200 rounded-sm">
              <img
                src={ASSETS.govbrCard}
                alt="gov.br"
                className="w-full max-w-[180px] h-auto"
                data-testid="img-govbr-card"
              />
            </div>
            <h4 className="txt-title-section mt-4 mb-2">Integração:</h4>
            <p className="txt-body mb-5">
              O Portal do Candidato está integrado ao login único do Governo
              Federal. Crie uma conta GovBr e acesse nosso portal.
            </p>
            <div className="flex justify-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goLogin();
                }}
                className="gov-btn-green"
                data-testid="criar-conta-btn"
              >
                Criar conta
              </button>
            </div>
          </div>

          <div
            className="rounded-md border border-gray-200 overflow-hidden bg-white"
            data-testid="card-pagtesouro"
          >
            <img
              src={ASSETS.pagtesouro}
              alt="PagTesouro"
              className="w-full h-auto block"
              data-testid="img-pagtesouro"
            />
            <div className="p-5">
              <h4 className="txt-title-section mb-2">Facilidade:</h4>
              <p className="txt-body">
                A plataforma de pagamento PagTesouro oferece as opções de
                pagamento em PIX, cartão de crédito e boleto de GRU. Sua
                missão principal é gerenciar as contas públicas de forma
                eficiente e transparente.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Section({ illustration, children, ...rest }) {
  return (
    <div
      className="flex flex-row gap-4 items-start py-1"
      data-testid={rest["data-testid"]}
    >
      <div className="shrink-0 w-[110px] flex items-start justify-center">
        {illustration}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Illustration({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-[100px] h-[80px] object-contain"
      loading="lazy"
    />
  );
}
