/**
 * Cards de estatísticas compartilhados entre o Dashboard e a página de Inscrições.
 * Mostra: Acessos, Total de inscrições, Valor total gerado e Pix copiados.
 */
import React from "react";

const fmtBRL = (v) =>
  `R$ ${(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function DashboardStats({ data, onAcessosClick }) {
  if (!data) return null;
  return (
    <section className="dash-stats" data-testid="dashboard-stats">
      {onAcessosClick ? (
        <CardClick
          titulo="Acessos"
          valor={data.total_visitas}
          subtitulo="Visitas registradas"
          cor="#7c5cff"
          icone={<IconEye />}
          onClick={onAcessosClick}
          testid="card-acessos"
        />
      ) : (
        <Card
          titulo="Acessos"
          valor={data.total_visitas}
          subtitulo="Visitas registradas"
          cor="#7c5cff"
          icone={<IconEye />}
          testid="card-acessos"
        />
      )}
      <Card
        titulo="Total de inscrições"
        valor={data.total_inscricoes}
        subtitulo="Candidatos cadastrados"
        cor="#3a8bfd"
        icone={<IconList />}
        testid="card-inscricoes"
      />
      <Card
        titulo="Valor total gerado"
        valor={fmtBRL(data.valor_total_inscricoes)}
        subtitulo={`${data.total_inscricoes} × ${fmtBRL(data.valor_unitario)}`}
        cor="#3ddc97"
        icone={<IconMoney />}
        testid="card-valor-gerado"
        isMoney
      />
      <Card
        titulo="Pix copiados"
        valor={fmtBRL(data.valor_total_pix_copiados)}
        subtitulo={`${data.total_pix_copiados} pix gerados e baixados`}
        cor="#ffb547"
        icone={<IconCopy />}
        testid="card-pix-copiados"
        isMoney
      />
    </section>
  );
}

function Card({ titulo, valor, subtitulo, cor, icone, testid, isMoney }) {
  return (
    <div className="dash-card-stat" style={{ "--c": cor }} data-testid={testid}>
      <div className="dash-card-ico">{icone}</div>
      <div className="dash-card-body">
        <span className="dash-card-titulo">{titulo}</span>
        <strong className={`dash-card-valor ${isMoney ? "money" : ""}`}>{valor}</strong>
        {subtitulo && <span className="dash-card-sub">{subtitulo}</span>}
      </div>
      <span className="dash-card-bar" />
    </div>
  );
}

function CardClick(props) {
  return (
    <button
      type="button"
      className="dash-card-stat dash-card-click"
      style={{ "--c": props.cor }}
      onClick={props.onClick}
      data-testid={props.testid}
    >
      <div className="dash-card-ico">{props.icone}</div>
      <div className="dash-card-body">
        <span className="dash-card-titulo">{props.titulo}</span>
        <strong className="dash-card-valor">{props.valor}</strong>
        <span className="dash-card-sub">{props.subtitulo}</span>
      </div>
      <span className="dash-card-arrow">→</span>
      <span className="dash-card-bar" />
    </button>
  );
}

function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconMoney() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export const dashStatsStyles = `
  .dash-stats {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
    margin-bottom: 22px;
  }
  @media (max-width: 1100px) { .dash-stats { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .dash-stats { grid-template-columns: 1fr; } }

  .dash-card-stat {
    background: #fff; border: 1px solid #e6eaf5; border-radius: 14px;
    padding: 22px; display: flex; align-items: flex-start; gap: 14px;
    position: relative; overflow: hidden;
    text-align: left;
    transition: transform 180ms ease, box-shadow 180ms ease;
  }
  .dash-card-click {
    border: 1px solid #e6eaf5; cursor: pointer;
    font-family: inherit;
  }
  .dash-card-click:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 34px rgba(124,92,255,0.18);
    border-color: var(--c, #7c5cff);
  }
  .dash-card-ico {
    width: 46px; height: 46px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--c) 14%, transparent);
    color: var(--c);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .dash-card-body { flex: 1; min-width: 0; }
  .dash-card-titulo { font-size: 12px; color: #5b6582; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; display: block; }
  .dash-card-valor {
    display: block; font-size: 26px; font-weight: 800; color: #1d2538;
    margin: 6px 0 4px 0; line-height: 1.1;
  }
  .dash-card-valor.money { font-size: 22px; }
  .dash-card-sub { font-size: 12px; color: #8a93b3; }
  .dash-card-bar {
    position: absolute; left: 0; bottom: 0; right: 0;
    height: 3px; background: var(--c, #7c5cff);
  }
  .dash-card-arrow {
    position: absolute; top: 18px; right: 18px;
    color: var(--c, #7c5cff); font-size: 18px; font-weight: 700;
    opacity: 0.6;
    transition: opacity 160ms, transform 160ms;
  }
  .dash-card-click:hover .dash-card-arrow { opacity: 1; transform: translateX(4px); }
`;
