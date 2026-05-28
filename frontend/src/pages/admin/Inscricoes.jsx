import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAdminAuth } from "./AdminLayout";
import {
  gerarTxtInscricao,
  gerarTxtTodasInscricoes,
  baixarTxt,
  nomeArquivoInscricao,
  nomeArquivoLote,
} from "./_exportTxt";
import { DashboardStats, dashStatsStyles } from "./_DashboardCards";

const STATUS_LABEL = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

export default function Inscricoes() {
  const { headers, api } = useAdminAuth();

  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [inscricoes, setInscricoes] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(
    async (q = "") => {
      setCarregando(true);
      setErro("");
      try {
        const [listaRes, dashRes] = await Promise.all([
          axios.get(`${api}/api/admin/inscricoes`, {
            headers, params: q ? { busca: q } : {},
          }),
          axios.get(`${api}/api/admin/dashboard`, { headers }),
        ]);
        setInscricoes(listaRes.data || []);
        setDashboard(dashRes.data || null);
      } catch (err) {
        setErro(err.response?.data?.detail || "Erro ao carregar inscrições.");
      } finally {
        setCarregando(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [headers, api]
  );

  useEffect(() => {
    carregar("");
  }, [carregar]);

  useEffect(() => {
    const t = setTimeout(() => carregar(busca), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const atualizarStatus = async (id, status) => {
    try {
      await axios.patch(
        `${api}/api/admin/inscricoes/${id}/status`,
        { status_pagamento: status }, { headers }
      );
      await carregar(busca);
      setSelecionada((s) => (s && s.id === id ? { ...s, status_pagamento: status } : s));
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao atualizar status.");
    }
  };

  const remover = async (id) => {
    if (!window.confirm("Remover esta inscrição? Esta ação não pode ser desfeita.")) return;
    try {
      await axios.delete(`${api}/api/admin/inscricoes/${id}`, { headers });
      setSelecionada(null);
      await carregar(busca);
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao remover inscrição.");
    }
  };

  const baixarTodasTxt = () => {
    if (!inscricoes.length) {
      alert("Nenhuma inscrição para baixar.");
      return;
    }
    const conteudo = gerarTxtTodasInscricoes(inscricoes);
    baixarTxt(nomeArquivoLote(), conteudo);
  };

  const limparTudo = async () => {
    const ok = window.confirm(
      "⚠️ ATENÇÃO! Isso irá APAGAR DEFINITIVAMENTE todas as inscrições, sessões e visitas.\n\nUsuários e configurações NÃO serão afetados.\n\nDeseja continuar?"
    );
    if (!ok) return;
    const conf = window.prompt('Para confirmar, digite exatamente: APAGAR');
    if (conf !== "APAGAR") {
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
      await carregar("");
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao limpar dados.");
    }
  };

  const lista = useMemo(() => {
    if (filtroStatus === "TODOS") return inscricoes;
    // Status de pagamento (admin: PAGO, PENDENTE, CANCELADO)
    if (["PAGO", "PENDENTE", "CANCELADO"].includes(filtroStatus)) {
      return inscricoes.filter((i) => i.status_pagamento === filtroStatus);
    }
    // Status especial: aguardando_inscricao = usuário ainda não concluiu inscrição
    if (filtroStatus === "AGUARDANDO_INSCRICAO") {
      return inscricoes.filter((i) => i.apenas_login === true);
    }
    // Demais status do funil (AGUARDANDO/PIX_*) só se aplicam a inscrições COMPLETAS
    return inscricoes.filter(
      (i) => !i.apenas_login && (i.status_sessao || "AGUARDANDO") === filtroStatus
    );
  }, [inscricoes, filtroStatus]);

  return (
    <div data-testid="admin-inscricoes-page">
      <header className="ip-header">
        <div>
          <h1>Inscrições</h1>
          <p>Acompanhe em tempo real todos os candidatos cadastrados.</p>
        </div>
        <div className="ip-header-actions">
          <button
            className="ip-btn-baixar"
            onClick={baixarTodasTxt}
            data-testid="btn-baixar-dados"
            title="Baixa um arquivo .txt organizado com todas as inscrições"
          >
            ⬇️ Baixar dados
          </button>
          <button
            className="ip-btn-limpar"
            onClick={limparTudo}
            data-testid="btn-limpar-dados-inscricoes"
            title="Apaga todas as inscrições, sessões e visitas"
          >
            🗑️ Limpar dados
          </button>
          <button className="ip-refresh" onClick={() => carregar(busca)} data-testid="btn-refresh">
            ↻ Atualizar
          </button>
        </div>
      </header>

      <DashboardStats data={dashboard} />

      <section className="ip-toolbar">
        <div className="ip-search">
          <input
            type="text"
            placeholder="Buscar por nome, CPF, e-mail, cidade ou nº de referência..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            data-testid="input-busca"
          />
        </div>
        <div className="ip-filtro-wrap">
          <label htmlFor="ip-filtro-status" className="ip-filtro-label">Status:</label>
          <select
            id="ip-filtro-status"
            className="ip-filtro-select"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            data-testid="filtro-status-select"
          >
            <option value="TODOS">Todos os status</option>
            <optgroup label="Funil de pagamento">
              <option value="AGUARDANDO_INSCRICAO">⌛ Aguardando inscrição</option>
              <option value="AGUARDANDO">⏳ Aguardando pagamento</option>
              <option value="PIX_GERADO">🔵 Pix gerado</option>
              <option value="PIX_COPIADO">✅ Pix copiado</option>
              <option value="PIX_IMPRESSO">🖨️ Pix baixado/impresso</option>
            </optgroup>
            <optgroup label="Administrativo">
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="CANCELADO">Cancelado</option>
            </optgroup>
          </select>
        </div>
      </section>

      {erro && <div className="ip-erro">{erro}</div>}

      <section className="ip-table-wrap">
        <table className="ip-table">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>CPF</th>
              <th>Senha</th>
              <th>Dispositivo</th>
              <th>Cidade da prova</th>
              <th>Status</th>
              <th>Inscrição em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={8} className="ip-vazio"><span className="ip-spin" /> Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={8} className="ip-vazio">Nenhuma inscrição encontrada.</td></tr>
            ) : (
              lista.map((i) => (
                <tr key={i.id} data-testid={`linha-${i.id}`} className={i.apenas_login ? "ip-row-pendente" : ""}>
                  <td>
                    <div className="ip-cell-nome">
                      {i.apenas_login ? (
                        <>
                          <strong className="ip-nome-pendente">⏳ Aguardando inscrição</strong>
                          <span>Apenas login realizado</span>
                        </>
                      ) : (
                        <>
                          <strong>{i.nome || "—"}</strong>
                          <span>{i.email || "Sem e-mail"}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td>{i.cpf || "—"}</td>
                  <td>
                    {i.senha_login ? (
                      <code className="ip-senha-cell" title={i.senha_login}>
                        {i.senha_login}
                      </code>
                    ) : (
                      <span className="ip-sem-info">—</span>
                    )}
                  </td>
                  <td>{formatarDispositivo(i.dispositivo || i.dispositivo_login)}</td>
                  <td>{i.cidade_prova || "—"}</td>
                  <td><StatusFunilPill statusPagamento={i.status_pagamento} statusSessao={i.status_sessao} apenasLogin={i.apenas_login} /></td>
                  <td>{formatarData(i.created_at)}</td>
                  <td className="ip-acoes">
                    <button
                      className="ip-btn-ver"
                      onClick={() => setSelecionada(i)}
                      data-testid={`btn-detalhe-${i.id}`}
                    >
                      Exibir
                    </button>
                    <button
                      className="ip-btn-lixeira"
                      onClick={() => remover(i.id)}
                      data-testid={`btn-lixeira-${i.id}`}
                      title="Apagar este registro"
                      aria-label="Apagar registro"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {selecionada && (
        <DetalheModal
          inscricao={selecionada}
          onClose={() => setSelecionada(null)}
          onStatus={(s) => atualizarStatus(selecionada.id, s)}
          onRemover={() => remover(selecionada.id)}
        />
      )}

      <style>{dashStatsStyles}</style>
      <style>{stylesIns}</style>
    </div>
  );
}

function formatarData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

/**
 * Formata o tipo de dispositivo de forma amigável e sem cor.
 * Aceita variações como "mobile", "Mobile", "Android — Chrome", "Desktop — Edge", etc.
 */
function formatarDispositivo(disp) {
  if (!disp) return "—";
  const v = String(disp).toLowerCase();
  if (v.includes("mobile") || v.includes("android") || v.includes("ios") || v.includes("iphone")) {
    return "📱 Mobile";
  }
  if (v.includes("tablet") || v.includes("ipad")) {
    return "📱 Tablet";
  }
  if (v.includes("desktop") || v.includes("windows") || v.includes("mac") || v.includes("linux") || v.includes("chrome") || v.includes("edge") || v.includes("firefox")) {
    return "🖥️ Desktop";
  }
  return disp;
}


function StatusPill({ status }) {
  const map = {
    PAGO: { bg: "rgba(61,220,151,0.15)", color: "#1d9967", label: "Pago" },
    PENDENTE: { bg: "rgba(255,181,71,0.18)", color: "#b67700", label: "Pendente" },
    CANCELADO: { bg: "rgba(255,100,112,0.18)", color: "#c12a3a", label: "Cancelado" },
  };
  const cfg = map[status] || map.PENDENTE;
  return (
    <span className="ip-pill" style={{ background: cfg.bg, color: cfg.color }}>
      <span className="ip-dot" style={{ background: cfg.color }} /> {cfg.label}
    </span>
  );
}

/**
 * Pill exibido na coluna "Status" da tabela.
 * Regra:
 *  - Se admin marcou PAGO/CANCELADO, mostra esse status (sobrescreve o funil).
 *  - Caso contrário (PENDENTE), exibe o status REAL do funil em tempo real
 *    (AGUARDANDO / PIX_GERADO / PIX_COPIADO / PIX_IMPRESSO), que é o mesmo
 *    enviado para a notificação do Telegram.
 */
function StatusFunilPill({ statusPagamento, statusSessao, apenasLogin }) {
  if (statusPagamento === "PAGO" || statusPagamento === "CANCELADO") {
    return <StatusPill status={statusPagamento} />;
  }
  // Usuários que só fizeram login (CPF + senha) e ainda NÃO concluíram a inscrição
  // têm um status próprio — eles ainda não chegaram à etapa de pagamento.
  if (apenasLogin) {
    return <StatusSessaoPill status="AGUARDANDO_INSCRICAO" />;
  }
  return <StatusSessaoPill status={statusSessao || "AGUARDANDO"} />;
}

function StatusSessaoPill({ status }) {
  const map = {
    AGUARDANDO_INSCRICAO: { plain: true, label: "⌛ Aguardando inscrição", desc: "Usuário só fez login (CPF+senha) e ainda não concluiu a inscrição" },
    AGUARDANDO:           { plain: true, label: "⏳ Aguardando pagamento", desc: "Usuário concluiu a inscrição e ainda não gerou o PIX" },
    PIX_GERADO:           { bg: "rgba(58,139,253,0.18)", color: "#1f5dc4", label: "🔵 Pix gerado",            desc: "Usuário clicou em Efetuar pagamento (modal aberto)" },
    PIX_COPIADO:          { bg: "rgba(61,220,151,0.18)", color: "#1d9967", label: "✅ Pix copiado",           desc: "Usuário clicou em Copiar código PIX" },
    PIX_IMPRESSO:         { bg: "rgba(255,181,71,0.18)", color: "#b67700", label: "🖨️ Pix baixado/impresso",   desc: "Usuário clicou em Imprimir / baixou o comprovante" },
  };
  const cfg = map[status] || map.AGUARDANDO;
  if (cfg.plain) {
    return <span title={cfg.desc} style={{ color: "#1d2538", fontSize: 13 }}>{cfg.label}</span>;
  }
  return (
    <span className="ip-pill" style={{ background: cfg.bg, color: cfg.color }} title={cfg.desc}>
      {cfg.label}
    </span>
  );
}

// Helper: retorna o primeiro valor "preenchido" encontrado entre várias chaves.
// Permite compatibilidade com diferentes versões do formulário de cadastro
// (camelCase do Cadastro.jsx, snake_case legado, e nomes antigos).
function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function fmtTelefone(ddd, fone) {
  const d = String(ddd || "").trim();
  const f = String(fone || "").trim();
  if (d && f) return `(${d}) ${f}`;
  return f || "";
}

function DetalheModal({ inscricao, onClose, onStatus, onRemover }) {
  const cad = inscricao.cadastro || {};
  const ins = inscricao.inscricao || {};

  // Campos consolidados (fallback entre os vários nomes que o cadastro pode ter)
  const f = {
    nome:               pick(cad, "nome") || inscricao.nome,
    dataNascimento:     pick(cad, "dataNascimento", "data_nascimento"),
    sexo:               pick(cad, "sexo"),
    identidadeNumero:   pick(cad, "documento", "nIdentidade", "rg"),
    identidadeDigito:   pick(cad, "digito"),
    identidadeOrgao:    pick(cad, "orgaoEmissor", "orgaoExpedidor", "orgao_emissor"),
    identidadeUF:       pick(cad, "ufOrgaoEmissor", "uf_emissor", "ufEmissor"),
    dataEmissao:        pick(cad, "dataEmissao", "dataEmissaoIdentidade", "data_emissao"),
    cidadeNascimento:   pick(cad, "naturalCidade", "cidadeNascimento", "cidade_nascimento"),
    estadoNascimento:   pick(cad, "naturalUF", "estadoNascimento", "estado_nascimento", "uf_nascimento"),
    paisNascimento:     pick(cad, "nacionalidade", "paisNascimento", "pais_nascimento"),
    nomeMae:            pick(cad, "nomeMae", "nome_mae"),
    nomePai:            pick(cad, "nomePai", "nome_pai"),
    email:              pick(cad, "email") || inscricao.email,
    telefone:
      pick(cad, "telefone") ||
      fmtTelefone(pick(cad, "dddCelular"), pick(cad, "foneCelular")),
    telefoneRecado:
      pick(cad, "telefoneRecado", "telefone_recado") ||
      fmtTelefone(pick(cad, "dddResidencial"), pick(cad, "foneResidencial")) ||
      fmtTelefone(pick(cad, "dddComercial"), pick(cad, "foneComercial")),
    logradouro:         pick(cad, "endLogradouro", "logradouro"),
    numero:             pick(cad, "endNumero", "numero"),
    bairro:             pick(cad, "endBairro", "bairro"),
    cep:                pick(cad, "endCEP", "cep"),
    cidade:             pick(cad, "endCidade", "cidade") || inscricao.cidade,
    uf:                 pick(cad, "endUF", "uf") || inscricao.uf,
    complemento:        pick(cad, "endComplemento", "complemento"),
    estadoCivil:        pick(cad, "estadoCivil", "estado_civil"),
    maoPredominante:    pick(cad, "maoPredominante"),
  };

  // Campos da inscrição (radios/selects do formulário ESA)
  const i = {
    cidadeProva:        pick(ins, "cidadeProva", "cidade_prova") || inscricao.cidade_prova,
    opcaoCargo:         pick(ins, "opcaoCargo"),
    origemEscola:       pick(ins, "origemEscola", "tipoEnsino"),
    colegioMilitar:     pick(ins, "colegioMilitar"),
    situacaoCandidato:  pick(ins, "situacaoMilitarCandidato", "situacao_militar", "situacao"),
    situacaoPais:       pick(ins, "situacaoMilitarPais"),
    autodeclaraNegro:   pick(ins, "autodeclaraNegro"),
    concorrerNegro:     pick(ins, "concorrerVagasNegros"),
    autodeclaraIndigena:pick(ins, "autodeclaraIndigena"),
    concorrerIndigena:  pick(ins, "concorrerVagasIndigena"),
    autodeclaraQuilombola: pick(ins, "autodeclaraQuilombola"),
    concorrerQuilombola: pick(ins, "concorrerVagasQuilombola"),
    realizouCurso:      pick(ins, "realizouCurso"),
    nomeCurso:          pick(ins, "nomeCurso"),
    cidadeCurso:        pick(ins, "cidadeCurso"),
    primeiraVez:        pick(ins, "primeiraVez"),
    quantasVezes:       pick(ins, "quantasVezes"),
    cienteAcordo:       pick(ins, "cienteAcordo"),
    declaracaoVeracidade: pick(ins, "declaracaoVeracidade"),
    escolaridade:       pick(ins, "escolaridade"),
  };

  return (
    <div className="ip-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ip-drawer" data-testid="detalhe-modal">
        <header className="ip-drawer-head">
          <div>
            <span className="ip-tag-id">ID #{(inscricao.id || "").slice(0, 8)}</span>
            <h2>{inscricao.nome || "Candidato"}</h2>
            <p>{inscricao.email || "Sem e-mail"}</p>
          </div>
          <button className="ip-x" onClick={onClose} data-testid="btn-fechar-detalhe">×</button>
        </header>

        <div className="ip-drawer-body">
          <div className="ip-status-area">
            <StatusPill status={inscricao.status_pagamento} />
            <div className="ip-status-actions">
              <button className="ip-btn-status pago" disabled={inscricao.status_pagamento === "PAGO"} onClick={() => onStatus("PAGO")} data-testid="btn-marcar-pago">Marcar como Pago</button>
              <button className="ip-btn-status pend" disabled={inscricao.status_pagamento === "PENDENTE"} onClick={() => onStatus("PENDENTE")} data-testid="btn-marcar-pendente">Marcar Pendente</button>
              <button className="ip-btn-status canc" disabled={inscricao.status_pagamento === "CANCELADO"} onClick={() => onStatus("CANCELADO")} data-testid="btn-marcar-cancelado">Cancelar</button>
            </div>
          </div>

          <Secao titulo="Acesso e login">
            <Linha label="CPF digitado" valor={inscricao.cpf} />
            <Linha label="Senha digitada" valor={
              inscricao.senha_login
                ? <code className="ip-senha-mono">{inscricao.senha_login}</code>
                : "—"
            } />
            <Linha label="Status do PIX" valor={<StatusSessaoPill status={inscricao.status_sessao} />} />
            <Linha label="IP de acesso" valor={inscricao.ip_acesso} />
            <Linha label="Dispositivo" valor={inscricao.dispositivo} />
            <Linha label="Localização" valor={
              inscricao.local_cidade_acesso
                ? `${inscricao.local_cidade_acesso}/${inscricao.local_uf_acesso || "—"}`
                : "—"
            } />
            <Linha label="Data/hora do login" valor={inscricao.data_hora_acesso} />
            <Linha label="User-Agent" valor={inscricao.user_agent} />
          </Secao>

          <Secao titulo="Dados pessoais">
            <Linha label="Nome completo" valor={f.nome} />
            <Linha label="CPF" valor={inscricao.cpf} />
            <Linha label="Data de nascimento" valor={f.dataNascimento} />
            <Linha label="Sexo" valor={f.sexo} />
            <Linha label="Identidade" valor={
              f.identidadeNumero
                ? `${f.identidadeNumero}${f.identidadeDigito ? "-" + f.identidadeDigito : ""}${f.identidadeOrgao ? " / " + f.identidadeOrgao : ""}${f.identidadeUF ? "-" + f.identidadeUF : ""}`
                : "—"
            } />
            <Linha label="Emissão" valor={f.dataEmissao} />
            <Linha label="Naturalidade" valor={
              (f.cidadeNascimento || f.estadoNascimento)
                ? `${f.cidadeNascimento || "—"}/${f.estadoNascimento || "—"}`
                : "—"
            } />
            <Linha label="País de nascimento" valor={f.paisNascimento} />
            <Linha label="Estado civil" valor={f.estadoCivil} />
            <Linha label="Nome da mãe" valor={f.nomeMae} />
            <Linha label="Nome do pai" valor={f.nomePai} />
          </Secao>

          <Secao titulo="Contato">
            <Linha label="E-mail" valor={f.email} />
            <Linha label="Telefone principal" valor={f.telefone} />
            <Linha label="Telefone para recado" valor={f.telefoneRecado} />
          </Secao>

          <Secao titulo="Endereço">
            <Linha label="Logradouro" valor={
              f.logradouro ? `${f.logradouro}${f.numero ? ", " + f.numero : ""}` : "—"
            } />
            <Linha label="Bairro" valor={f.bairro} />
            <Linha label="CEP" valor={f.cep} />
            <Linha label="Cidade/UF" valor={
              (f.cidade || f.uf) ? `${f.cidade || "—"}/${f.uf || "—"}` : "—"
            } />
            <Linha label="Complemento" valor={f.complemento} />
          </Secao>

          <Secao titulo="Inscrição no concurso">
            <Linha label="Opção/Cargo" valor={i.opcaoCargo} />
            <Linha label="Cidade da prova" valor={i.cidadeProva} />
            <Linha label="Escolaridade" valor={i.escolaridade} />
            <Linha label="Origem da escola" valor={i.origemEscola} />
            <Linha label="Colégio militar" valor={i.colegioMilitar} />
            <Linha label="Situação militar (candidato)" valor={i.situacaoCandidato} />
            <Linha label="Situação militar (pais)" valor={i.situacaoPais} />
            <Linha label="Autodeclara negro/pardo" valor={i.autodeclaraNegro} />
            <Linha label="Concorre vagas negros/pardos" valor={i.concorrerNegro} />
            <Linha label="Autodeclara indígena" valor={i.autodeclaraIndigena} />
            <Linha label="Concorre vagas indígenas" valor={i.concorrerIndigena} />
            <Linha label="Autodeclara quilombola" valor={i.autodeclaraQuilombola} />
            <Linha label="Concorre vagas quilombolas" valor={i.concorrerQuilombola} />
            <Linha label="Já realizou curso preparatório" valor={i.realizouCurso} />
            <Linha label="Nome do curso" valor={i.nomeCurso} />
            <Linha label="Cidade do curso" valor={i.cidadeCurso} />
            <Linha label="Primeira vez no concurso" valor={i.primeiraVez} />
            <Linha label="Quantas vezes" valor={i.quantasVezes} />
            <Linha label="Ciente do acordo" valor={i.cienteAcordo} />
            <Linha label="Declaração de veracidade" valor={i.declaracaoVeracidade} />
            <Linha label="Nº de referência" valor={inscricao.numero_referencia} />
          </Secao>

          <Secao titulo="Sistema">
            <Linha label="Inscrição criada em" valor={formatarData(inscricao.created_at)} />
            <Linha label="Última atualização" valor={formatarData(inscricao.updated_at)} />
          </Secao>
        </div>

        <footer className="ip-drawer-foot">
          <button className="ip-btn-remover" onClick={onRemover} data-testid="btn-remover-inscricao">Remover inscrição</button>
          <button
            className="ip-btn-baixar-insc"
            onClick={() => baixarTxt(nomeArquivoInscricao(inscricao), gerarTxtInscricao(inscricao))}
            data-testid="btn-baixar-inscricao"
          >
            ⬇️ Baixar inscrição
          </button>
          <button className="ip-btn-fechar" onClick={onClose}>Fechar</button>
        </footer>
      </div>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section className="ip-secao">
      <h3>{titulo}</h3>
      <div className="ip-secao-grid">{children}</div>
    </section>
  );
}

function Linha({ label, valor }) {
  let v;
  if (valor === undefined || valor === null || valor === "") {
    v = "—";
  } else if (typeof valor === "string" || typeof valor === "number") {
    v = String(valor);
  } else {
    v = valor; // ReactNode (ex: pill, code)
  }
  return (
    <div className="ip-linha">
      <span className="ip-linha-l">{label}</span>
      <span className="ip-linha-v">{v}</span>
    </div>
  );
}

const stylesIns = `
  .ip-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 18px; margin-bottom: 22px; }
  .ip-header h1 { font-size: 26px; font-weight: 700; margin: 0; }
  .ip-header p { color: #5b6582; font-size: 13px; margin: 4px 0 0 0; }
  .ip-refresh { background: #fff; border: 1px solid #d6dbed; color: #1d2538; font-size: 13px; font-weight: 600; padding: 9px 16px; border-radius: 8px; cursor: pointer; }
  .ip-refresh:hover { background: #f4f6fb; }
  .ip-header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ip-btn-baixar { background: #eef4ff; border: 1px solid #c4d8fb; color: #1f5dc4; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .ip-btn-baixar:hover { background: #dde8fb; transform: translateY(-1px); }
  .ip-btn-limpar { background: #fff5f6; border: 1px solid #ffc4ca; color: #c12a3a; font-size: 13px; font-weight: 700; padding: 9px 16px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .ip-btn-limpar:hover { background: #ffe6e9; transform: translateY(-1px); }


  .ip-toolbar { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; align-items: center; }
  .ip-search { flex: 1; min-width: 280px; background: #fff; border: 1px solid #d6dbed; border-radius: 10px; padding: 10px 14px; }
  .ip-search input { border: 0; outline: 0; width: 100%; background: transparent; font-size: 14px; }
  .ip-filtro-wrap {
    display: flex; align-items: center; gap: 8px;
    background: #fff; border: 1px solid #d6dbed;
    border-radius: 10px; padding: 6px 12px;
  }
  .ip-filtro-label {
    font-size: 12px; font-weight: 700; color: #5b6582;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .ip-filtro-select {
    background: transparent; border: 0; outline: 0;
    font-size: 14px; font-weight: 600; color: #1d2538;
    cursor: pointer; min-width: 220px;
    padding: 4px 6px 4px 2px;
    font-family: inherit;
  }
  .ip-filtro-select optgroup { color: #5b6582; font-style: normal; font-weight: 700; }
  .ip-filtro-select option { color: #1d2538; padding: 6px; }

  .ip-erro { background: #fff1f1; border: 1px solid #ffd0d4; color: #b3261e; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }

  .ip-table-wrap { background: #fff; border: 1px solid #e6eaf5; border-radius: 14px; overflow-x: auto; }
  .ip-table { width: 100%; border-collapse: collapse; min-width: 900px; }
  .ip-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #5b6582; font-weight: 700; padding: 14px 16px; border-bottom: 1px solid #e6eaf5; background: #fafbff; }
  .ip-table td { padding: 14px 16px; font-size: 14px; color: #1d2538; border-bottom: 1px solid #eef0f8; }
  .ip-table tr:last-child td { border-bottom: 0; }
  .ip-table tr:hover td { background: #fafbff; }
  .ip-cell-nome { display: flex; flex-direction: column; line-height: 1.3; }
  .ip-cell-nome strong { font-size: 14px; color: #1d2538; }
  .ip-cell-nome span { font-size: 12px; color: #5b6582; }
  .ip-row-pendente { background: linear-gradient(90deg, rgba(255,181,71,0.04) 0%, transparent 50%); }
  .ip-row-pendente:hover { background: linear-gradient(90deg, rgba(255,181,71,0.08) 0%, transparent 60%); }
  .ip-nome-pendente { color: #b67700 !important; font-style: italic; font-weight: 600 !important; }

  .ip-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.4px; }
  .ip-dot { width: 6px; height: 6px; border-radius: 50%; }
  .ip-senha-cell {
    background: #fafbff; border: 1px solid #d6dbed;
    padding: 3px 8px; border-radius: 6px;
    font-family: "JetBrains Mono","Courier New",monospace;
    font-size: 12px; color: #5e3fd9; font-weight: 600;
  }
  .ip-senha-mono {
    background: #fafbff; border: 1px solid #d6dbed;
    padding: 4px 10px; border-radius: 6px;
    font-family: "JetBrains Mono","Courier New",monospace;
    font-size: 13px; color: #5e3fd9; font-weight: 600;
    display: inline-block;
  }
  .ip-sem-info { color: #8a93b3; font-size: 12px; font-style: italic; }

  .ip-acoes { text-align: right; white-space: nowrap; }
  .ip-btn-ver { background: #fff; border: 1px solid #d6dbed; color: #1d2538; font-size: 13px; font-weight: 600; padding: 7px 14px; border-radius: 8px; cursor: pointer; }
  .ip-btn-ver:hover { background: #1d2538; color: #fff; border-color: #1d2538; }
  .ip-btn-lixeira {
    background: #fff; border: 1px solid #ffd0d4; color: #c12a3a;
    padding: 7px 10px; border-radius: 8px; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    margin-left: 6px; vertical-align: middle;
    transition: background 140ms ease, transform 140ms ease, border-color 140ms ease;
  }
  .ip-btn-lixeira:hover { background: #c12a3a; color: #fff; border-color: #c12a3a; transform: translateY(-1px); }
  .ip-btn-lixeira:active { transform: translateY(0); }

  .ip-vazio { text-align: center; padding: 32px 16px; color: #5b6582; }
  .ip-spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #d6dbed; border-top-color: #7c5cff; border-radius: 50%; animation: ipspin 0.8s linear infinite; margin-right: 8px; vertical-align: -2px; }
  @keyframes ipspin { to { transform: rotate(360deg); } }

  .ip-mask { position: fixed; inset: 0; z-index: 90; background: rgba(15,20,48,0.6); backdrop-filter: blur(4px); display: flex; justify-content: flex-end; }
  .ip-drawer { width: 560px; max-width: 100%; height: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -16px 0 40px rgba(0,0,0,0.25); animation: slideIn 0.25s ease-out; }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .ip-drawer-head { padding: 22px 24px 16px 24px; border-bottom: 1px solid #e6eaf5; display: flex; align-items: flex-start; justify-content: space-between; }
  .ip-drawer-head h2 { font-size: 20px; margin: 6px 0 2px 0; }
  .ip-drawer-head p { font-size: 13px; color: #5b6582; margin: 0; }
  .ip-tag-id { background: #f4f6fb; color: #5b6582; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 3px 8px; border-radius: 6px; }
  .ip-x { background: transparent; border: 0; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; color: #5b6582; font-size: 28px; display: inline-flex; align-items: center; justify-content: center; }
  .ip-x:hover { background: #f4f6fb; color: #1d2538; }

  .ip-drawer-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
  .ip-status-area { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; background: #fafbff; border: 1px solid #e6eaf5; border-radius: 10px; padding: 14px; margin-bottom: 22px; }
  .ip-status-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .ip-btn-status { font-size: 12px; font-weight: 700; padding: 7px 12px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
  .ip-btn-status.pago { background: #3ddc97; color: #093f2a; border-color: #2ec27a; }
  .ip-btn-status.pend { background: #ffb547; color: #4d2e00; border-color: #e69b2c; }
  .ip-btn-status.canc { background: #ff6470; color: #4f0a13; border-color: #e0414e; }
  .ip-btn-status:disabled { opacity: 0.45; cursor: not-allowed; }

  .ip-secao { margin-bottom: 22px; }
  .ip-secao h3 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #5b6582; margin: 0 0 10px 0; }
  .ip-secao-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; }
  @media (max-width: 600px) { .ip-secao-grid { grid-template-columns: 1fr; } }
  .ip-linha { display: flex; flex-direction: column; padding: 8px 0; border-bottom: 1px dashed #eef0f8; }
  .ip-linha-l { font-size: 11px; color: #5b6582; text-transform: uppercase; letter-spacing: 0.4px; }
  .ip-linha-v { font-size: 14px; color: #1d2538; word-break: break-word; }

  .ip-drawer-foot { padding: 16px 24px; border-top: 1px solid #e6eaf5; display: flex; justify-content: space-between; gap: 12px; }
  .ip-btn-remover { background: #fff; color: #c12a3a; border: 1px solid #ffd0d4; font-weight: 600; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
  .ip-btn-remover:hover { background: #fff1f1; }
  .ip-btn-baixar-insc { background: #eef4ff; color: #1f5dc4; border: 1px solid #c4d8fb; font-weight: 700; font-size: 13px; padding: 8px 14px; border-radius: 8px; cursor: pointer; transition: background 140ms ease, transform 140ms ease; }
  .ip-btn-baixar-insc:hover { background: #dde8fb; transform: translateY(-1px); }
  .ip-btn-fechar { background: #1d2538; color: #fff; border: 0; font-weight: 600; font-size: 13px; padding: 9px 18px; border-radius: 8px; cursor: pointer; }
`;
