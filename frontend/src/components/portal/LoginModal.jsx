import React, { useState } from "react";
import { X, User } from "lucide-react";

export default function LoginModal({ onClose, onCreateAccount }) {
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");

  const maskCPF = (v) =>
    v
      .replace(/\D/g, "")
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2");

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="login-modal"
    >
      <div
        className="bg-white rounded-lg w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 rounded-t-lg"
          style={{ background: "#1351b4", color: "white" }}
        >
          <h3 className="font-bold text-lg flex items-center gap-2">
            <User size={20} /> Entrar com gov.br
          </h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            data-testid="login-close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm mb-4" style={{ color: "#333" }}>
            Use sua conta <strong>gov.br</strong> para acessar o Portal do
            Candidato.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert(
                "Login simulado. Em produção, este fluxo redirecionaria para o gov.br para autenticação OAuth."
              );
              onClose();
            }}
            className="space-y-4"
          >
            <div>
              <label
                className="block text-[13px] font-semibold mb-1"
                style={{ color: "#1f1f1f" }}
              >
                CPF
              </label>
              <input
                type="text"
                required
                placeholder="000.000.000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={cpf}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                data-testid="login-cpf"
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-semibold mb-1"
                style={{ color: "#1f1f1f" }}
              >
                Senha
              </label>
              <input
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                data-testid="login-senha"
              />
            </div>

            <button
              type="submit"
              className="w-full gov-btn-green"
              data-testid="login-submit"
            >
              Entrar
            </button>
          </form>

          <div className="text-center mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm mb-2" style={{ color: "#444" }}>
              Ainda não tem uma conta?
            </p>
            <button
              onClick={onCreateAccount}
              className="text-sm font-semibold hover:underline"
              style={{ color: "#1351b4" }}
              data-testid="login-create"
            >
              Criar conta gov.br
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
