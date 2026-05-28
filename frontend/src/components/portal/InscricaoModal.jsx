import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

const initial = {
  nomeCompleto: "",
  cpf: "",
  rg: "",
  dataNascimento: "",
  sexo: "",
  email: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  escolaridade: "",
  poloProva: "",
  necessidadesEspeciais: "nao",
  aceiteTermos: false,
};

export default function InscricaoModal({ onClose }) {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [protocolo, setProtocolo] = useState("");

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const maskCPF = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2");

  const maskTel = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");

  const maskCEP = (v) =>
    v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

  const next = (e) => {
    e.preventDefault();
    setStep((s) => Math.min(3, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const submit = (e) => {
    e.preventDefault();
    const proto =
      "ESA-" +
      Math.random().toString(36).slice(2, 8).toUpperCase() +
      "-" +
      new Date().getFullYear();
    setProtocolo(proto);
    setSubmitted(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
      data-testid="inscricao-modal"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-3xl shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-lg"
          style={{ background: "#1351b4", color: "white" }}
        >
          <h3 className="font-bold text-lg" data-testid="inscricao-title">
            {submitted
              ? "Inscrição enviada"
              : "Inscrição — Concurso CFGS/ESA 2026"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="hover:opacity-80"
            data-testid="inscricao-close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {submitted ? (
            <SuccessView protocolo={protocolo} onClose={onClose} />
          ) : (
            <>
              <Stepper step={step} />

              {step === 1 && (
                <form
                  onSubmit={next}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                >
                  <Field label="Nome completo *" col2>
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.nomeCompleto}
                      onChange={(e) => update("nomeCompleto", e.target.value)}
                      data-testid="inp-nome"
                    />
                  </Field>
                  <Field label="CPF *">
                    <input
                      required
                      type="text"
                      placeholder="000.000.000-00"
                      className="inp"
                      value={form.cpf}
                      onChange={(e) => update("cpf", maskCPF(e.target.value))}
                      data-testid="inp-cpf"
                    />
                  </Field>
                  <Field label="RG *">
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.rg}
                      onChange={(e) => update("rg", e.target.value)}
                      data-testid="inp-rg"
                    />
                  </Field>
                  <Field label="Data de nascimento *">
                    <input
                      required
                      type="date"
                      className="inp"
                      value={form.dataNascimento}
                      onChange={(e) =>
                        update("dataNascimento", e.target.value)
                      }
                      data-testid="inp-nasc"
                    />
                  </Field>
                  <Field label="Sexo *">
                    <select
                      required
                      className="inp"
                      value={form.sexo}
                      onChange={(e) => update("sexo", e.target.value)}
                      data-testid="inp-sexo"
                    >
                      <option value="">Selecione...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                    </select>
                  </Field>
                  <Field label="E-mail *" col2>
                    <input
                      required
                      type="email"
                      className="inp"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      data-testid="inp-email"
                    />
                  </Field>
                  <Field label="Telefone *">
                    <input
                      required
                      type="text"
                      placeholder="(00) 00000-0000"
                      className="inp"
                      value={form.telefone}
                      onChange={(e) =>
                        update("telefone", maskTel(e.target.value))
                      }
                      data-testid="inp-tel"
                    />
                  </Field>

                  <FormFooter onCancel={onClose}>
                    <button
                      type="submit"
                      className="gov-btn-green"
                      data-testid="btn-next-1"
                    >
                      Avançar
                    </button>
                  </FormFooter>
                </form>
              )}

              {step === 2 && (
                <form
                  onSubmit={next}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"
                >
                  <Field label="CEP *">
                    <input
                      required
                      type="text"
                      placeholder="00000-000"
                      className="inp"
                      value={form.cep}
                      onChange={(e) => update("cep", maskCEP(e.target.value))}
                      data-testid="inp-cep"
                    />
                  </Field>
                  <Field label="Endereço *" col2>
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.endereco}
                      onChange={(e) => update("endereco", e.target.value)}
                      data-testid="inp-endereco"
                    />
                  </Field>
                  <Field label="Número *">
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.numero}
                      onChange={(e) => update("numero", e.target.value)}
                      data-testid="inp-numero"
                    />
                  </Field>
                  <Field label="Complemento" col2>
                    <input
                      type="text"
                      className="inp"
                      value={form.complemento}
                      onChange={(e) => update("complemento", e.target.value)}
                      data-testid="inp-complemento"
                    />
                  </Field>
                  <Field label="Bairro *">
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.bairro}
                      onChange={(e) => update("bairro", e.target.value)}
                      data-testid="inp-bairro"
                    />
                  </Field>
                  <Field label="Cidade *">
                    <input
                      required
                      type="text"
                      className="inp"
                      value={form.cidade}
                      onChange={(e) => update("cidade", e.target.value)}
                      data-testid="inp-cidade"
                    />
                  </Field>
                  <Field label="Estado (UF) *">
                    <select
                      required
                      className="inp"
                      value={form.estado}
                      onChange={(e) => update("estado", e.target.value)}
                      data-testid="inp-uf"
                    >
                      <option value="">UF...</option>
                      {[
                        "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
                        "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
                        "RS","RO","RR","SC","SP","SE","TO",
                      ].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </Field>

                  <FormFooter onCancel={onClose}>
                    <button
                      type="button"
                      onClick={prev}
                      className="gov-btn-outline"
                      data-testid="btn-prev-2"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="gov-btn-green"
                      data-testid="btn-next-2"
                    >
                      Avançar
                    </button>
                  </FormFooter>
                </form>
              )}

              {step === 3 && (
                <form
                  onSubmit={submit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                >
                  <Field label="Escolaridade *" col2>
                    <select
                      required
                      className="inp"
                      value={form.escolaridade}
                      onChange={(e) => update("escolaridade", e.target.value)}
                      data-testid="inp-escolaridade"
                    >
                      <option value="">Selecione...</option>
                      <option value="medio-completo">Ensino Médio Completo</option>
                      <option value="medio-cursando">Ensino Médio Cursando</option>
                      <option value="superior">Ensino Superior</option>
                    </select>
                  </Field>
                  <Field label="Polo de prova *" col2>
                    <select
                      required
                      className="inp"
                      value={form.poloProva}
                      onChange={(e) => update("poloProva", e.target.value)}
                      data-testid="inp-polo"
                    >
                      <option value="">Selecione um polo...</option>
                      <option value="tres-coracoes-mg">Três Corações - MG</option>
                      <option value="rio-de-janeiro-rj">Rio de Janeiro - RJ</option>
                      <option value="sao-paulo-sp">São Paulo - SP</option>
                      <option value="brasilia-df">Brasília - DF</option>
                      <option value="recife-pe">Recife - PE</option>
                      <option value="manaus-am">Manaus - AM</option>
                      <option value="porto-alegre-rs">Porto Alegre - RS</option>
                      <option value="salvador-ba">Salvador - BA</option>
                      <option value="fortaleza-ce">Fortaleza - CE</option>
                      <option value="belem-pa">Belém - PA</option>
                    </select>
                  </Field>

                  <Field label="Possui necessidade especial? *" col2>
                    <div className="flex gap-6 mt-1">
                      <label className="flex items-center gap-2 text-sm" style={{ color: "#333" }}>
                        <input
                          type="radio"
                          name="ne"
                          checked={form.necessidadesEspeciais === "nao"}
                          onChange={() => update("necessidadesEspeciais", "nao")}
                          data-testid="rdo-ne-nao"
                        />
                        Não
                      </label>
                      <label className="flex items-center gap-2 text-sm" style={{ color: "#333" }}>
                        <input
                          type="radio"
                          name="ne"
                          checked={form.necessidadesEspeciais === "sim"}
                          onChange={() => update("necessidadesEspeciais", "sim")}
                          data-testid="rdo-ne-sim"
                        />
                        Sim
                      </label>
                    </div>
                  </Field>

                  <div className="md:col-span-2 mt-2">
                    <label className="flex items-start gap-2 text-sm" style={{ color: "#333" }}>
                      <input
                        type="checkbox"
                        required
                        checked={form.aceiteTermos}
                        onChange={(e) => update("aceiteTermos", e.target.checked)}
                        className="mt-1"
                        data-testid="chk-termos"
                      />
                      <span>
                        Declaro que li e aceito os termos do{" "}
                        <a href="#" className="underline" style={{ color: "#1351b4" }}>
                          Edital do Concurso
                        </a>{" "}
                        e do{" "}
                        <a href="#" className="underline" style={{ color: "#1351b4" }}>
                          Manual do Candidato
                        </a>
                        , bem como autorizo o tratamento dos meus dados pessoais
                        conforme a LGPD.
                      </span>
                    </label>
                  </div>

                  <FormFooter onCancel={onClose}>
                    <button
                      type="button"
                      onClick={prev}
                      className="gov-btn-outline"
                      data-testid="btn-prev-3"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="gov-btn-green"
                      data-testid="btn-submit"
                    >
                      Enviar inscrição
                    </button>
                  </FormFooter>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .inp {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          font-size: 14px;
          color: #1f2937;
          background: #fff;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children, col2 }) {
  return (
    <div className={col2 ? "md:col-span-2" : ""}>
      <label
        className="block text-[13px] font-semibold mb-1"
        style={{ color: "#1f1f1f" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FormFooter({ children, onCancel }) {
  return (
    <div className="md:col-span-3 mt-4 flex flex-wrap gap-3 justify-between items-center pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-medium hover:underline"
        style={{ color: "#666" }}
        data-testid="btn-cancel"
      >
        Cancelar
      </button>
      <div className="flex gap-3">{children}</div>
    </div>
  );
}

function Stepper({ step }) {
  const items = [
    { n: 1, label: "Dados pessoais" },
    { n: 2, label: "Endereço" },
    { n: 3, label: "Concurso" },
  ];
  return (
    <div className="flex items-center gap-2 md:gap-4">
      {items.map((it, idx) => {
        const active = step === it.n;
        const done = step > it.n;
        return (
          <React.Fragment key={it.n}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: done || active ? "#1351b4" : "#e5e7eb",
                  color: done || active ? "white" : "#6b7280",
                }}
              >
                {it.n}
              </div>
              <span
                className="text-[13px] font-medium"
                style={{ color: active || done ? "#1351b4" : "#6b7280" }}
              >
                {it.label}
              </span>
            </div>
            {idx < items.length - 1 && (
              <div
                className="flex-1 h-px"
                style={{ background: step > it.n ? "#1351b4" : "#e5e7eb" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function SuccessView({ protocolo, onClose }) {
  return (
    <div className="text-center py-8" data-testid="success-view">
      <div className="flex justify-center mb-4">
        <CheckCircle2 size={72} color="#168821" />
      </div>
      <h4 className="text-xl font-bold mb-2" style={{ color: "#1f1f1f" }}>
        Inscrição enviada com sucesso!
      </h4>
      <p className="text-sm mb-4" style={{ color: "#444" }}>
        Anote o seu número de protocolo. Ele será necessário para
        acompanhamento e geração do boleto via PagTesouro.
      </p>
      <div
        className="inline-block px-6 py-3 rounded-md font-mono text-lg font-bold"
        style={{ background: "#eaf3ff", color: "#1351b4" }}
        data-testid="protocolo"
      >
        {protocolo}
      </div>
      <div className="mt-6">
        <button
          onClick={onClose}
          className="gov-btn-green"
          data-testid="btn-close-success"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
