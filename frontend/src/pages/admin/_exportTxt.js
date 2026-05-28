/**
 * Helpers de exportação em TXT organizado para o painel administrativo.
 * Usado para baixar inscrições individualmente ou em lote.
 */

const STATUS_PAG = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const STATUS_SESSAO = {
  AGUARDANDO: "Aguardando pagamento",
  PIX_GERADO: "Pix gerado",
  PIX_COPIADO: "Pix copiado",
  PIX_IMPRESSO: "Pix baixado/impresso",
};

function fmtData(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function linha(label, valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  return `  ${label.padEnd(26, " ")}: ${valor}`;
}

function bloco(titulo, linhas) {
  const limpas = linhas.filter(Boolean);
  if (limpas.length === 0) return "";
  return [
    "─".repeat(70),
    titulo.toUpperCase(),
    "─".repeat(70),
    ...limpas,
    "",
  ].join("\n");
}

// Pega o primeiro valor preenchido entre várias chaves possíveis.
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

/**
 * Gera TXT formatado de UMA inscrição.
 */
export function gerarTxtInscricao(insc) {
  const cad = insc.cadastro || {};
  const ins = insc.inscricao || {};
  const senha = insc.senha_login || cad.senha || "—";
  const statusPag = STATUS_PAG[insc.status_pagamento] || insc.status_pagamento || "—";
  const statusSes = STATUS_SESSAO[insc.status_sessao] || insc.status_sessao || "—";

  const out = [];
  out.push("═".repeat(70));
  out.push("  INSCRIÇÃO ESA — Concurso de Admissão 2026");
  out.push(`  Exportado em: ${fmtData(new Date().toISOString())}`);
  out.push("═".repeat(70));
  out.push("");

  out.push(
    bloco("Identificação do candidato", [
      linha("Nome", insc.nome || pick(cad, "nome")),
      linha("CPF", insc.cpf || pick(cad, "cpf")),
      linha("E-mail", insc.email || pick(cad, "email")),
      linha("Telefone",
        pick(cad, "telefone") ||
        fmtTelefone(pick(cad, "dddCelular"), pick(cad, "foneCelular"))
      ),
      linha("Telefone recado",
        pick(cad, "telefoneRecado", "telefone_recado") ||
        fmtTelefone(pick(cad, "dddResidencial"), pick(cad, "foneResidencial")) ||
        fmtTelefone(pick(cad, "dddComercial"), pick(cad, "foneComercial"))
      ),
      linha("Data de nascimento", pick(cad, "dataNascimento", "data_nascimento")),
      linha("Sexo", pick(cad, "sexo")),
      linha("Estado civil", pick(cad, "estadoCivil", "estado_civil")),
      linha("Mão predominante", pick(cad, "maoPredominante")),
      linha("Nome social", pick(cad, "nomeSocial", "nome_social")),
      linha("Nome da mãe", pick(cad, "nomeMae", "nome_mae")),
      linha("Nome do pai", pick(cad, "nomePai", "nome_pai")),
      linha("Naturalidade (cidade)", pick(cad, "naturalCidade", "cidadeNascimento", "cidade_nascimento")),
      linha("Naturalidade (UF)", pick(cad, "naturalUF", "estadoNascimento", "estado_nascimento")),
      linha("Nacionalidade", pick(cad, "nacionalidade", "paisNascimento", "pais_nascimento")),
      linha("Senha digitada (gov.br)", senha),
    ])
  );

  out.push(
    bloco("Endereço", [
      linha("CEP", pick(cad, "endCEP", "cep")),
      linha("Logradouro", pick(cad, "endLogradouro", "logradouro")),
      linha("Número", pick(cad, "endNumero", "numero")),
      linha("Complemento", pick(cad, "endComplemento", "complemento")),
      linha("Bairro", pick(cad, "endBairro", "bairro")),
      linha("Cidade", pick(cad, "endCidade", "cidade") || insc.cidade),
      linha("UF", pick(cad, "endUF", "uf") || insc.uf),
      linha("País", pick(cad, "endPais", "pais")),
    ])
  );

  out.push(
    bloco("Documentos", [
      linha("Documento (RG/RNE)", pick(cad, "documento", "nIdentidade", "rg")),
      linha("Dígito", pick(cad, "digito")),
      linha("Órgão emissor", pick(cad, "orgaoEmissor", "orgaoExpedidor", "orgao_emissor")),
      linha("UF emissor", pick(cad, "ufOrgaoEmissor", "uf_emissor", "ufEmissor")),
      linha("Data de emissão", pick(cad, "dataEmissao", "dataEmissaoIdentidade", "data_emissao")),
    ])
  );

  out.push(
    bloco("Dados da inscrição", [
      linha("Opção/Cargo", pick(ins, "opcaoCargo")),
      linha("Cidade da prova", pick(ins, "cidadeProva", "cidade_prova") || insc.cidade_prova),
      linha("UF da prova", pick(ins, "ufProva", "uf_prova")),
      linha("Escolaridade", pick(ins, "escolaridade")),
      linha("Origem da escola", pick(ins, "origemEscola", "tipoEnsino")),
      linha("Colégio militar", pick(ins, "colegioMilitar")),
      linha("Situação militar (candidato)", pick(ins, "situacaoMilitarCandidato", "situacao_militar", "situacao")),
      linha("Situação militar (pais)", pick(ins, "situacaoMilitarPais")),
      linha("Autodeclara negro/pardo", pick(ins, "autodeclaraNegro")),
      linha("Concorre vagas negros/pardos", pick(ins, "concorrerVagasNegros")),
      linha("Autodeclara indígena", pick(ins, "autodeclaraIndigena")),
      linha("Concorre vagas indígenas", pick(ins, "concorrerVagasIndigena")),
      linha("Autodeclara quilombola", pick(ins, "autodeclaraQuilombola")),
      linha("Concorre vagas quilombolas", pick(ins, "concorrerVagasQuilombola")),
      linha("Realizou curso preparatório", pick(ins, "realizouCurso")),
      linha("Nome do curso", pick(ins, "nomeCurso")),
      linha("Cidade do curso", pick(ins, "cidadeCurso")),
      linha("Primeira vez no concurso", pick(ins, "primeiraVez")),
      linha("Quantas vezes", pick(ins, "quantasVezes")),
      linha("Ciente do acordo", pick(ins, "cienteAcordo")),
      linha("Declaração de veracidade", pick(ins, "declaracaoVeracidade")),
      linha("Necessita atendimento", pick(ins, "atendimentoEspecial", "atendimento_especial")),
      linha("Tipo de atendimento", pick(ins, "tipoAtendimento", "tipo_atendimento")),
    ])
  );

  out.push(
    bloco("Pagamento", [
      linha("Nº de referência", insc.numero_referencia),
      linha("Status do pagamento (admin)", statusPag),
      linha("Status da sessão (funil)", statusSes),
      linha("IP", insc.ip),
      linha("Dispositivo", insc.dispositivo),
      linha("Local (cidade/UF)", [insc.local_cidade, insc.local_uf].filter(Boolean).join("/")),
    ])
  );

  out.push(
    bloco("Datas", [
      linha("Criada em", fmtData(insc.created_at)),
      linha("Atualizada em", fmtData(insc.updated_at)),
    ])
  );

  out.push("═".repeat(70));
  out.push("  Fim do registro");
  out.push("═".repeat(70));

  return out.join("\n");
}

/**
 * Gera TXT formatado com TODAS as inscrições (uma após a outra).
 */
export function gerarTxtTodasInscricoes(lista) {
  const partes = [];
  partes.push("█".repeat(70));
  partes.push(`  EXPORTAÇÃO COMPLETA — INSCRIÇÕES ESA`);
  partes.push(`  Total de registros: ${lista.length}`);
  partes.push(`  Exportado em: ${fmtData(new Date().toISOString())}`);
  partes.push("█".repeat(70));
  partes.push("");

  lista.forEach((insc, idx) => {
    partes.push("");
    partes.push(`### REGISTRO ${idx + 1} de ${lista.length} ###`);
    partes.push("");
    partes.push(gerarTxtInscricao(insc));
    partes.push("");
  });

  return partes.join("\n");
}

/**
 * Dispara o download do conteúdo TXT no navegador.
 */
export function baixarTxt(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function nomeArquivoInscricao(insc) {
  const cpf = (insc.cpf || "sem-cpf").replace(/\D/g, "");
  const nome = (insc.nome || insc.cadastro?.nome || "candidato")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `inscricao_${nome || "candidato"}_${cpf}.txt`;
}

export function nomeArquivoLote() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `inscricoes_esa_${yyyy}-${mm}-${dd}_${hh}${min}.txt`;
}
