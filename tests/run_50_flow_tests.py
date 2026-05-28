"""
Executa 50 testes simulando os fluxos reais do Portal ESA via API.

Distribuição:
  - 20 testes: somente Login gov.br
  - 10 testes: Login gov.br + Inscrição
  - 10 testes: Login gov.br + Inscrição + Gerar PIX
  - 10 testes: Login gov.br + Inscrição + Gerar PIX + Copiar PIX
"""

import os
import random
import time
import string
import requests
from collections import Counter

API = os.environ.get("API_URL") or "https://afternoon-friend-1.preview.emergentagent.com"
TIMEOUT = 30


# -------------------- helpers --------------------
def gerar_cpf_valido() -> str:
    """Gera um CPF válido (com dígitos verificadores corretos)."""
    n = [random.randint(0, 9) for _ in range(9)]
    s = sum(n[i] * (10 - i) for i in range(9))
    d1 = 0 if (s * 10) % 11 in (10, 11) else (s * 10) % 11
    n.append(d1)
    s = sum(n[i] * (11 - i) for i in range(10))
    d2 = 0 if (s * 10) % 11 in (10, 11) else (s * 10) % 11
    n.append(d2)
    digitos = "".join(map(str, n))
    return f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"


CIDADES_PROVA = [
    "São Paulo - SP", "Rio de Janeiro - RJ", "Belo Horizonte - MG",
    "Brasília - DF", "Salvador - BA", "Fortaleza - CE", "Manaus - AM",
    "Curitiba - PR", "Recife - PE", "Porto Alegre - RS",
]
ESCOLARIDADE = ["ENSINO_MEDIO_COMPLETO", "ENSINO_MEDIO_CURSANDO", "ENSINO_SUPERIOR"]
SITUACAO = ["CIVIL", "MILITAR_ATIVA", "RESERVISTA"]

NOMES = [
    "João Silva", "Maria Souza", "Pedro Oliveira", "Ana Santos", "Carlos Lima",
    "Beatriz Costa", "Rafael Pereira", "Juliana Ribeiro", "Lucas Almeida",
    "Mariana Ferreira", "Bruno Carvalho", "Gabriela Martins", "Felipe Rocha",
    "Camila Gomes", "Diego Araújo", "Larissa Nunes", "Thiago Barbosa",
    "Patrícia Cardoso", "Marcos Mendes", "Fernanda Ramos",
]
CIDADES_UF = [
    ("São Paulo", "SP"), ("Rio de Janeiro", "RJ"), ("Belo Horizonte", "MG"),
    ("Brasília", "DF"), ("Salvador", "BA"), ("Fortaleza", "CE"),
    ("Manaus", "AM"), ("Curitiba", "PR"), ("Recife", "PE"), ("Porto Alegre", "RS"),
]


def fake_email(nome: str) -> str:
    base = nome.lower().replace(" ", ".").replace("ç", "c")
    base = "".join(c for c in base if c in string.ascii_lowercase + ".")
    return f"{base}{random.randint(10, 9999)}@teste.com"


def fake_telefone() -> str:
    return f"(11) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"


def fake_senha() -> str:
    return f"Senha{random.randint(1000, 9999)}@"


# -------------------- steps --------------------
def step_login(cpf: str, senha: str):
    r = requests.post(
        f"{API}/api/notificar/login",
        json={"cpf": cpf, "senha": senha},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json().get("sessao_id")


def step_inscricao(cpf: str, nome: str):
    cidade, uf = random.choice(CIDADES_UF)
    ref = str(int(time.time() * 1000)) + str(random.randint(100, 999))
    payload = {
        "cpf": cpf,
        "cadastro": {
            "nome": nome,
            "cpf": cpf,
            "email": fake_email(nome),
            "telefone": fake_telefone(),
            "cidade": cidade,
            "uf": uf,
        },
        "inscricao": {
            "cidadeProva": random.choice(CIDADES_PROVA),
            "escolaridade": random.choice(ESCOLARIDADE),
            "situacao": random.choice(SITUACAO),
        },
        "numero_referencia": ref,
    }
    r = requests.post(f"{API}/api/inscricoes", json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json().get("id")


def step_pix(valor: float = 95.0, txid: str = "***"):
    r = requests.post(
        f"{API}/api/pix/gerar",
        json={"valor": valor, "txid": txid},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json().get("payload")


def step_status(sessao_id: str, status: str):
    r = requests.post(
        f"{API}/api/notificar/status",
        json={"sessao_id": sessao_id, "status": status},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json()


# -------------------- runner --------------------
def run_scenario(idx: int, nome_cenario: str, etapas):
    """etapas = lista de strings: 'login', 'inscricao', 'pix', 'pix_gerado', 'pix_copiado'."""
    cpf = gerar_cpf_valido()
    nome = random.choice(NOMES)
    senha = fake_senha()
    resultado = {"idx": idx, "cenario": nome_cenario, "cpf": cpf, "ok": True, "erros": []}
    sessao_id = None
    try:
        if "login" in etapas:
            sessao_id = step_login(cpf, senha)
            resultado["sessao_id"] = sessao_id
        if "inscricao" in etapas:
            resultado["inscricao_id"] = step_inscricao(cpf, nome)
        if "pix_gerado" in etapas:
            payload = step_pix()
            resultado["pix_payload_len"] = len(payload or "")
            if sessao_id:
                step_status(sessao_id, "PIX_GERADO")
        if "pix_copiado" in etapas:
            if sessao_id:
                step_status(sessao_id, "PIX_COPIADO")
    except Exception as e:
        resultado["ok"] = False
        resultado["erros"].append(str(e))
    return resultado


def main():
    random.seed()
    print(f"API: {API}")
    print("=" * 80)
    plano = []
    for i in range(20):
        plano.append(("Login gov.br", ["login"]))
    for i in range(10):
        plano.append(("Login + Inscrição", ["login", "inscricao"]))
    for i in range(10):
        plano.append(("Login + Inscrição + Gerar PIX", ["login", "inscricao", "pix_gerado"]))
    for i in range(10):
        plano.append(("Login + Inscrição + Gerar PIX + Copiar PIX",
                      ["login", "inscricao", "pix_gerado", "pix_copiado"]))

    resultados = []
    contadores = Counter()
    for idx, (nome, etapas) in enumerate(plano, start=1):
        res = run_scenario(idx, nome, etapas)
        resultados.append(res)
        status = "OK " if res["ok"] else "FAIL"
        contadores[(nome, res["ok"])] += 1
        extra = ""
        if res.get("sessao_id"):
            extra += f" sess={res['sessao_id'][:8]}"
        if res.get("inscricao_id"):
            extra += f" insc={res['inscricao_id'][:8]}"
        if res.get("pix_payload_len"):
            extra += f" pix_len={res['pix_payload_len']}"
        if not res["ok"]:
            extra += f" ERR={res['erros']}"
        print(f"[{idx:02d}/50] {status} | {nome:<48} | cpf={res['cpf']}{extra}")
        # pequena pausa para não saturar telegram / backend
        time.sleep(0.25)

    print("=" * 80)
    print("Resumo:")
    grupos = {
        "Login gov.br": 20,
        "Login + Inscrição": 10,
        "Login + Inscrição + Gerar PIX": 10,
        "Login + Inscrição + Gerar PIX + Copiar PIX": 10,
    }
    total_ok = 0
    total_fail = 0
    for nome, qtd in grupos.items():
        ok = contadores[(nome, True)]
        fail = contadores[(nome, False)]
        total_ok += ok
        total_fail += fail
        print(f"  {nome:<48} {ok:>2} OK / {fail:>2} FAIL  (esperado: {qtd})")
    print(f"  TOTAL: {total_ok} OK / {total_fail} FAIL  (de 50)")


if __name__ == "__main__":
    main()
