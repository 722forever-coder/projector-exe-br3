import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminLayout";
import { DashboardStats, dashStatsStyles } from "./_DashboardCards";

export default function Dashboard() {
  const { headers, api } = useAdminAuth();
  const [data, setData] = useState(null);
  const [atividade, setAtividade] = useState(null);
  const [erro, setErro] = useState("");
  const [modalVisitas, setModalVisitas] = useState(false);
  const [visitas, setVisitas] = useState([]);
  const [carregandoVisitas, setCarregandoVisitas] = useState(false);

  const carregar = async () => {
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${api}/api/admin/dashboard`, { headers }),
        axios.get(`${api}/api/admin/dashboard/atividade`, { headers }),
      ]);
      setData(r1.data);
      setAtividade(r2.data);
    } catch (e) {
      setErro(e.response?.data?.detail || "Erro ao carregar dashboard");
    }
  };

  useEffect(() => {
    carregar();
    // Auto-refresh silencioso a cada 30s
    const intervalo = setInterval(carregar, 30000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abrirVisitas = async () => {
    setModalVisitas(true);
    setCarregandoVisitas(true);
    try {
      const r = await axios.get(`${api}/api/admin/visitas`, { headers });
      setVisitas(r.data || []);
    } catch (e) {
      alert(e.response?.data?.detail || "Erro ao carregar visitas");
    } finally {
      setCarregandoVisitas(false);
    }
  };

  const limparDados = async () => {
    const confirm1 = window.confirm(
      "⚠️ ATENÇÃO! Isso irá APAGAR DEFINITIVAMENTE todas as inscrições, sessões e visitas do painel.\n\nUsuários e configurações NÃO serão afetados.\n\nDeseja realmente continuar?"
    );
    if (!confirm1) return;
    const confirm2 = window.prompt(
      'Para confirmar, digite exatamente: APAGAR'
    );
    if (confirm2 !== "APAGAR") {
      alert("Operação cancelada.");
      return;
    }
    try {
      const r = await axios.delete(`${api}/api/admin/limpar-dados`, { headers });
      alert(
        `Dados limpos com sucesso!\n\n` +
          `• Inscrições removidas: ${r.data.inscricoes_removidas}\n` +
          `• Sessões removidas: ${r.data.sessoes_removidas}\n` +
          `• Visitas removidas: ${r.data.visitas_removidas}`
      );
      carregar();
    } catch (e) {
      alert(e.response?.data?.detail || "Erro ao limpar dados.");
    }
  };

  const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (erro) return <div className="dash-erro">{erro}</div>;
  if (!data) return <div className="dash-load"><span className="dash-spin" /> Carregando...</div>;

  return (
    <div data-testid="admin-dashboard">
      <header className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral em tempo real do Concurso de Admissão 2026.</p>
        </div>
        <div className="dash-header-actions">
          <button
            className="dash-btn-limpar"
            onClick={limparDados}
            data-testid="btn-limpar-dados"
            title="Apaga todas as inscrições, sessões e visitas"
          >
            🗑️ Limpar dados
          </button>
          <button className="dash-refresh" onClick={carregar} data-testid="btn-refresh-dash">↻ Atualizar</button>
        </div>
      </header>

      <DashboardStats data={data} onAcessosClick={abrirVisitas} />

      {modalVisitas && (
        <ModalVisitas
          visitas={visitas}
          carregando={carregandoVisitas}
          onClose={() => setModalVisitas(false)}
        />
      )}

      {atividade && (
        <>
          {/* === Funil de conversão === */}
          <section className="dash-row">
            <div className="dash-block flex-2">
              <header className="dash-block-head">
                <div>
                  <h3>Funil de conversão</h3>
                  <p>Da visita ao PIX copiado — acompanhe a jornada do candidato</p>
                </div>
              </header>
              <Funnel data={data} />
            </div>

            <div className="dash-block flex-1">
              <header className="dash-block-head">
                <div>
                  <h3>Top localizações</h3>
                  <p>De onde vêm os visitantes</p>
                </div>
              </header>
              {atividade.top_localizacoes.length === 0 ? (
                <p className="dash-vazio">Nenhuma localização registrada ainda.</p>
              ) : (
                <ul className="dash-loc-lista">
                  {atividade.top_localizacoes.map((c, i) => {
                    const max = Math.max(...atividade.top_localizacoes.map((x) => x.qtd), 1);
                    return (
                      <li key={`${c.cidade}-${i}`}>
                        <span className="dash-loc-flag">📍</span>
                        <div className="dash-loc-info">
                          <strong>{c.cidade}</strong>
                          <span>{c.uf}</span>
                        </div>
                        <div className="dash-loc-bar">
                          <span style={{ width: `${(c.qtd / max) * 100}%` }} />
                        </div>
                        <strong className="dash-loc-qtd">{c.qtd}</strong>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* === Série temporal + Feed === */}
          <section className="dash-row">
            <div className="dash-block flex-2">
              <header className="dash-block-head">
                <div>
                  <h3>Atividade dos últimos 7 dias</h3>
                  <p>Acessos × Inscrições por dia</p>
                </div>
                <div className="dash-legenda">
                  <span><i className="lg-vis" />Acessos</span>
                  <span><i className="lg-ins" />Inscrições</span>
                </div>
              </header>
              <AreaChart serie={atividade.serie} />
            </div>

            <div className="dash-block flex-1">
              <header className="dash-block-head">
                <div>
                  <h3>Atividade em tempo real</h3>
                  <p>Últimos eventos no portal</p>
                </div>
                <span className="dash-live"><i /> AO VIVO</span>
              </header>
              {atividade.eventos.length === 0 ? (
                <p className="dash-vazio">Nenhuma atividade registrada ainda.</p>
              ) : (
                <ul className="dash-feed">
                  {atividade.eventos.map((ev, i) => (
                    <li key={i} className={`feed-${ev.tipo}`}>
                      <span className="dash-feed-ico">{iconePara(ev.tipo)}</span>
                      <div className="dash-feed-body">
                        <strong>{ev.titulo}</strong>
                        <span>{ev.subtitulo}</span>
                      </div>
                      <span className="dash-feed-time">{tempoRelativo(ev.ts)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <style>{dashStatsStyles}</style>
      <style>{stylesDash}</style>
    </div>
  );
}

/* ============ Funil ============ */
function Funnel({ data }) {
  const etapas = [
    { label: "Acessos ao site", valor: data.total_visitas, cor: "#7c5cff" },
    { label: "Login realizado", valor: data.total_sessoes || 0, cor: "#3a8bfd" },
    { label: "Inscrições criadas", valor: data.total_inscricoes, cor: "#3ddc97" },
    { label: "PIX gerado", valor: data.total_pix_gerados || 0, cor: "#ffb547" },
    { label: "PIX copiado", valor: data.total_pix_copiados, cor: "#ff6b9d" },
  ];
  const max = Math.max(...etapas.map((e) => e.valor), 1);

  return (
    <div className="dash-funnel">
      {etapas.map((et, i) => {
        const taxa = i > 0 && etapas[i - 1].valor > 0
          ? ((et.valor / etapas[i - 1].valor) * 100).toFixed(1)
          : null;
        const w = (et.valor / max) * 100;
        return (
          <div className="dash-funnel-row" key={et.label}>
            <div className="dash-funnel-label">
              <span className="dot" style={{ background: et.cor }} />
              <span>{et.label}</span>
            </div>
            <div className="dash-funnel-bar-wrap">
              <div
                className="dash-funnel-bar"
                style={{ width: `${w}%`, background: `linear-gradient(90deg, ${et.cor}, ${et.cor}cc)` }}
              >
                <strong>{et.valor}</strong>
              </div>
            </div>
            {taxa !== null && (
              <span className={`dash-funnel-taxa ${parseFloat(taxa) >= 50 ? "ok" : parseFloat(taxa) >= 20 ? "med" : "low"}`}>
                {taxa}%
              </span>
            )}
            {taxa === null && <span className="dash-funnel-taxa empty">—</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Area Chart SVG ============ */
function AreaChart({ serie }) {
  const W = 720, H = 220, P = 30;
  const maxV = Math.max(...serie.map((d) => Math.max(d.visitas, d.inscricoes)), 1);
  const stepX = (W - P * 2) / Math.max(serie.length - 1, 1);

  const ptVis = serie.map((d, i) => `${P + i * stepX},${H - P - (d.visitas / maxV) * (H - P * 2)}`).join(" ");
  const ptIns = serie.map((d, i) => `${P + i * stepX},${H - P - (d.inscricoes / maxV) * (H - P * 2)}`).join(" ");

  // Area paths (closed)
  const areaVis = `M ${P},${H - P} L ${ptVis.replaceAll(" ", " L ")} L ${P + (serie.length - 1) * stepX},${H - P} Z`;
  const areaIns = `M ${P},${H - P} L ${ptIns.replaceAll(" ", " L ")} L ${P + (serie.length - 1) * stepX},${H - P} Z`;

  return (
    <div className="dash-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="dash-svg">
        <defs>
          <linearGradient id="grad-vis" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7c5cff" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="grad-ins" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ddc97" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#3ddc97" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* grid */}
        {[0, 1, 2, 3].map((i) => {
          const y = P + ((H - P * 2) / 3) * i;
          return <line key={i} x1={P} y1={y} x2={W - P} y2={y} stroke="#eef0f8" strokeDasharray="3,3" />;
        })}

        <path d={areaVis} fill="url(#grad-vis)" />
        <path d={areaIns} fill="url(#grad-ins)" />
        <polyline points={ptVis} fill="none" stroke="#7c5cff" strokeWidth="2.5" strokeLinejoin="round" />
        <polyline points={ptIns} fill="none" stroke="#3ddc97" strokeWidth="2.5" strokeLinejoin="round" />

        {serie.map((d, i) => {
          const x = P + i * stepX;
          const yV = H - P - (d.visitas / maxV) * (H - P * 2);
          const yI = H - P - (d.inscricoes / maxV) * (H - P * 2);
          return (
            <g key={d.data}>
              <circle cx={x} cy={yV} r="3.5" fill="#fff" stroke="#7c5cff" strokeWidth="2" />
              <circle cx={x} cy={yI} r="3.5" fill="#fff" stroke="#3ddc97" strokeWidth="2" />
              <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="#5b6582">
                {new Date(d.data + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function iconePara(tipo) {
  const map = {
    VISITA: "👁️",
    LOGIN: "🔑",
    PIX_GERADO: "🔵",
    PIX_COPIADO: "✅",
    INSCRICAO: "📝",
  };
  return map[tipo] || "•";
}

function tempoRelativo(iso) {
  if (!iso) return "—";
  try {
    const t = new Date(iso).getTime();
    const diff = (Date.now() - t) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} d atrás`;
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch { return "—"; }
}

function ModalVisitas({ visitas, carregando, onClose }) {
  const [busca, setBusca] = useState("");

  const lista = visitas.filter((v) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (v.ip || "").toLowerCase().includes(q) ||
      (v.local_cidade || "").toLowerCase().includes(q) ||
      (v.local_uf || "").toLowerCase().includes(q) ||
      (v.dispositivo || "").toLowerCase().includes(q)
    );
  });

  const fmtData = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
    } catch { return "—"; }
  };

  return (
    <div className="dash-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dash-modal" data-testid="modal-visitas">
        <header className="dash-modal-head">
          <div>
            <h2>Acessos ao site</h2>
            <p>{visitas.length} visita{visitas.length === 1 ? "" : "s"} registrada{visitas.length === 1 ? "" : "s"}</p>
          </div>
          <button className="dash-x" onClick={onClose} data-testid="btn-fechar-visitas">×</button>
        </header>

        <div className="dash-modal-search">
          <input
            type="text"
            placeholder="Buscar por IP, cidade, UF ou dispositivo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            data-testid="input-busca-visitas"
          />
        </div>

        <div className="dash-modal-body">
          {carregando ? (
            <div className="dash-vazio"><span className="dash-spin" /> Carregando visitas...</div>
          ) : lista.length === 0 ? (
            <div className="dash-vazio">Nenhuma visita encontrada.</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Data / Hora</th>
                  <th>IP</th>
                  <th>Localização</th>
                  <th>Dispositivo</th>
                  <th>Acessos</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td>{fmtData(v.created_at)}</td>
                    <td><code>{v.ip || "—"}</code></td>
                    <td>{v.local_cidade || "—"}/{v.local_uf || "—"}</td>
                    <td>
                      <span className={`dash-pill-disp ${(v.dispositivo || "").toLowerCase()}`}>
                        {v.dispositivo || "—"}
                      </span>
                    </td>
                    <td>{v.hits || 1}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* Ícones */
const stylesDash = `
  .dash-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; gap: 16px; }
  .dash-header h1 { font-size: 26px; font-weight: 700; margin: 0; }
  .dash-header p { color: #5b6582; font-size: 13px; margin: 4px 0 0 0; }
  .dash-refresh { background: #fff; border: 1px solid #d6dbed; color: #1d2538; font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
  .dash-refresh:hover { background: #f4f6fb; }
  .dash-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .dash-btn-limpar { background: #fff5f6; border: 1px solid #ffc4ca; color: #c12a3a; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .dash-btn-limpar:hover { background: #ffe6e9; transform: translateY(-1px); }

  .dash-load { color: #5b6582; padding: 24px; text-align: center; }
  .dash-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #d6dbed; border-top-color: #7c5cff; border-radius: 50%; animation: dsspin 0.8s linear infinite; vertical-align: -2px; margin-right: 8px; }
  @keyframes dsspin { to { transform: rotate(360deg); } }
  .dash-erro { background: #fff1f1; border: 1px solid #ffd0d4; color: #b3261e; padding: 10px 14px; border-radius: 8px; font-size: 13px; }

  /* Modal de visitas */
  .dash-mask {
    position: fixed; inset: 0; z-index: 90;
    background: rgba(15,20,48,0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .dash-modal {
    width: 100%; max-width: 880px; max-height: 90vh;
    background: #fff; border-radius: 14px;
    display: flex; flex-direction: column;
    box-shadow: 0 30px 60px rgba(0,0,0,0.3);
    overflow: hidden;
  }
  .dash-modal-head {
    padding: 18px 22px; border-bottom: 1px solid #e6eaf5;
    display: flex; align-items: center; justify-content: space-between;
  }
  .dash-modal-head h2 { font-size: 18px; margin: 0; }
  .dash-modal-head p { font-size: 13px; color: #5b6582; margin: 4px 0 0 0; }
  .dash-x { background: transparent; border: 0; font-size: 28px; cursor: pointer; color: #5b6582; width: 36px; height: 36px; border-radius: 50%; }
  .dash-x:hover { background: #f4f6fb; color: #1d2538; }

  .dash-modal-search { padding: 14px 22px; border-bottom: 1px solid #e6eaf5; }
  .dash-modal-search input {
    width: 100%; background: #fafbff; border: 1px solid #d6dbed;
    border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: 0;
  }
  .dash-modal-search input:focus { border-color: #7c5cff; background: #fff; }

  .dash-modal-body { flex: 1; overflow-y: auto; }
  .dash-table { width: 100%; border-collapse: collapse; }
  .dash-table th {
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
    color: #5b6582; font-weight: 700; padding: 12px 22px;
    background: #fafbff; border-bottom: 1px solid #e6eaf5;
    position: sticky; top: 0;
  }
  .dash-table td {
    padding: 12px 22px; font-size: 13px; color: #1d2538;
    border-bottom: 1px solid #eef0f8;
  }
  .dash-table tr:last-child td { border-bottom: 0; }
  .dash-table code {
    background: #fafbff; padding: 2px 6px; border-radius: 4px;
    font-size: 12px; color: #3a8bfd;
  }
  .dash-pill-disp {
    font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px;
    text-transform: uppercase; letter-spacing: 0.4px;
    background: #eef0f8; color: #5b6582;
  }
  .dash-pill-disp.mobile { background: rgba(58,139,253,0.15); color: #1f5dc4; }
  .dash-pill-disp.desktop { background: rgba(124,92,255,0.15); color: #5e3fd9; }
  .dash-vazio { padding: 32px 16px; text-align: center; color: #5b6582; }

  /* === Linhas/Blocos === */
  .dash-row {
    display: grid; grid-template-columns: 2fr 1fr; gap: 16px;
    margin-bottom: 22px;
  }
  @media (max-width: 1100px) { .dash-row { grid-template-columns: 1fr; } }
  .dash-row .flex-1 { grid-column: span 1; }
  .dash-row .flex-2 { grid-column: span 1; }
  @media (min-width: 1101px) {
    .dash-row .flex-1 { grid-column: auto; }
    .dash-row .flex-2 { grid-column: auto; }
  }

  .dash-block {
    background: #fff; border: 1px solid #e6eaf5; border-radius: 14px;
    padding: 22px; min-width: 0;
  }
  .dash-block-head {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 18px; gap: 12px;
  }
  .dash-block-head h3 { font-size: 15px; font-weight: 700; margin: 0; color: #1d2538; }
  .dash-block-head p { font-size: 12px; color: #5b6582; margin: 4px 0 0 0; }

  .dash-legenda { display: flex; gap: 14px; font-size: 12px; color: #5b6582; }
  .dash-legenda span { display: inline-flex; align-items: center; gap: 6px; }
  .dash-legenda i { width: 10px; height: 10px; border-radius: 3px; }
  .lg-vis { background: #7c5cff; }
  .lg-ins { background: #3ddc97; }

  .dash-live {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,82,82,0.12); color: #c12a3a;
    padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
  }
  .dash-live i {
    width: 7px; height: 7px; border-radius: 50%; background: #ff3b3b;
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.3); }
  }

  /* === Funil === */
  .dash-funnel { display: flex; flex-direction: column; gap: 12px; }
  .dash-funnel-row {
    display: grid; grid-template-columns: 180px 1fr 60px; align-items: center; gap: 12px;
  }
  .dash-funnel-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #1d2538; font-weight: 500;
  }
  .dash-funnel-label .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dash-funnel-bar-wrap {
    background: #f4f6fb; border-radius: 8px; height: 32px; overflow: hidden;
  }
  .dash-funnel-bar {
    height: 100%; display: flex; align-items: center; justify-content: flex-end;
    padding-right: 10px; color: #fff; font-weight: 800; font-size: 13px;
    border-radius: 8px;
    min-width: 36px;
    transition: width 600ms cubic-bezier(.4,0,.2,1);
  }
  .dash-funnel-taxa {
    font-size: 12px; font-weight: 700; text-align: right;
    padding: 3px 8px; border-radius: 6px;
  }
  .dash-funnel-taxa.ok { background: rgba(61,220,151,0.15); color: #1d9967; }
  .dash-funnel-taxa.med { background: rgba(255,181,71,0.18); color: #b67700; }
  .dash-funnel-taxa.low { background: rgba(255,100,112,0.18); color: #c12a3a; }
  .dash-funnel-taxa.empty { color: #c8cee2; background: transparent; }
  @media (max-width: 700px) {
    .dash-funnel-row { grid-template-columns: 1fr; gap: 4px; }
    .dash-funnel-taxa { text-align: left; max-width: fit-content; }
  }

  /* === Top localizações === */
  .dash-loc-lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .dash-loc-lista li {
    display: grid; grid-template-columns: 22px 1fr 60px 32px;
    align-items: center; gap: 10px;
  }
  .dash-loc-flag { font-size: 14px; }
  .dash-loc-info { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
  .dash-loc-info strong { font-size: 13px; color: #1d2538; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dash-loc-info span { font-size: 11px; color: #8a93b3; }
  .dash-loc-bar { background: #f4f6fb; height: 6px; border-radius: 999px; overflow: hidden; }
  .dash-loc-bar span {
    display: block; height: 100%;
    background: linear-gradient(90deg,#7c5cff,#3a8bfd);
    border-radius: 999px;
    transition: width 600ms cubic-bezier(.4,0,.2,1);
  }
  .dash-loc-qtd { font-size: 13px; color: #1d2538; text-align: right; font-weight: 700; }

  /* === Chart === */
  .dash-chart-wrap { width: 100%; }
  .dash-svg { width: 100%; height: auto; max-height: 240px; }

  /* === Feed === */
  .dash-feed {
    list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column;
    max-height: 360px; overflow-y: auto;
  }
  .dash-feed li {
    display: grid; grid-template-columns: 36px 1fr auto;
    align-items: center; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid #eef0f8;
  }
  .dash-feed li:last-child { border-bottom: 0; }
  .dash-feed-ico {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: #f4f6fb; font-size: 14px;
  }
  .feed-VISITA .dash-feed-ico { background: rgba(124,92,255,0.12); }
  .feed-LOGIN .dash-feed-ico { background: rgba(58,139,253,0.12); }
  .feed-PIX_GERADO .dash-feed-ico { background: rgba(58,139,253,0.12); }
  .feed-PIX_COPIADO .dash-feed-ico { background: rgba(61,220,151,0.18); }
  .feed-INSCRICAO .dash-feed-ico { background: rgba(255,107,157,0.18); }

  .dash-feed-body { min-width: 0; }
  .dash-feed-body strong {
    display: block; font-size: 13px; color: #1d2538;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .dash-feed-body span { font-size: 11px; color: #5b6582; }
  .dash-feed-time {
    font-size: 11px; color: #8a93b3; white-space: nowrap;
    background: #fafbff; padding: 2px 8px; border-radius: 999px;
  }
`;
