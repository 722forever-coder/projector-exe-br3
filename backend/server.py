from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ADMIN_USER = os.environ['ADMIN_USER']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===================== MODELS =====================
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class InscricaoCreate(BaseModel):
    """Payload completo enviado quando o candidato chega à tela de pagamento."""
    cpf: Optional[str] = None
    cadastro: Optional[Dict[str, Any]] = None
    inscricao: Optional[Dict[str, Any]] = None
    numero_referencia: Optional[str] = None


class Inscricao(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    cpf: Optional[str] = None
    nome: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cidade_prova: Optional[str] = None
    escolaridade: Optional[str] = None
    situacao_militar: Optional[str] = None
    numero_referencia: Optional[str] = None
    status_pagamento: str = "PENDENTE"
    cadastro: Optional[Dict[str, Any]] = None
    inscricao: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    # Dados enriquecidos da sessão de login
    senha_login: Optional[str] = None
    status_sessao: Optional[str] = None
    ip_acesso: Optional[str] = None
    dispositivo: Optional[str] = None
    local_cidade_acesso: Optional[str] = None
    local_uf_acesso: Optional[str] = None
    data_hora_acesso: Optional[str] = None
    user_agent: Optional[str] = None
    # Flag: True = apenas fez login (CPF+senha), ainda não concluiu inscrição
    apenas_login: bool = False


class AdminLogin(BaseModel):
    usuario: str
    senha: str


class AdminLoginResponse(BaseModel):
    token: str
    usuario: str
    nome: Optional[str] = None
    papel: str = "admin"


class UsuarioCreate(BaseModel):
    nome: str
    usuario: str
    email: Optional[EmailStr] = None
    senha: str
    papel: str = "admin"  # admin | visualizador
    ativo: bool = True


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    papel: Optional[str] = None
    ativo: Optional[bool] = None


class UsuarioOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    nome: str
    usuario: str
    email: Optional[str] = None
    papel: str = "admin"
    ativo: bool = True
    created_at: datetime
    is_root: bool = False  # True para o admin do .env


class AlterarSenhaPayload(BaseModel):
    senha_atual: str
    senha_nova: str


class ConfiguracaoPayload(BaseModel):
    # PIX
    pix_chave: Optional[str] = None
    pix_nome_recebedor: Optional[str] = None
    pix_cidade: Optional[str] = None
    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_ativo: Optional[bool] = None


class TelegramTestPayload(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None
    mensagem: Optional[str] = None


class GerarPixPayload(BaseModel):
    valor: float = 100.00
    txid: Optional[str] = None  # número de referência


# ===================== HELPERS =====================
def _to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# ----- PIX BR Code (EMV) -----
def _crc16_ccitt(payload: str) -> str:
    crc = 0xFFFF
    poly = 0x1021
    for byte in payload.encode("utf-8"):
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ poly) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return format(crc, "04X")


def _tlv(tag: str, value: str) -> str:
    return f"{tag}{len(value):02d}{value}"


def _normalizar_txt(s: str, max_len: int) -> str:
    """Remove acentos e força ASCII para o nome/cidade."""
    import unicodedata
    if not s:
        return ""
    nfk = unicodedata.normalize("NFKD", s)
    ascii_str = nfk.encode("ascii", "ignore").decode("ascii")
    return ascii_str.upper().strip()[:max_len]


def gerar_pix_payload(
    chave: str,
    nome: str,
    cidade: str,
    valor: float,
    txid: Optional[str] = None,
) -> str:
    """Gera o payload PIX BR Code (EMV) com CRC16 — pronto para virar QR Code."""
    chave = (chave or "").strip()
    # Defaults genéricos exigidos pelo padrão EMV (campos 59 e 60 são obrigatórios)
    nome_norm = _normalizar_txt(nome or "INSCRICAO ESA", 25)
    cidade_norm = _normalizar_txt(cidade or "SAO PAULO", 15)
    txid_clean = "".join(c for c in (txid or "") if c.isalnum())[:25] or "***"

    merchant_account = _tlv("00", "br.gov.bcb.pix") + _tlv("01", chave)
    additional = _tlv("05", txid_clean)
    valor_str = f"{valor:.2f}"

    payload_no_crc = (
        _tlv("00", "01")
        + _tlv("01", "11")  # 11 = QR estático (com chave); 12 = dinâmico (com URL de cobrança)
        + _tlv("26", merchant_account)
        + _tlv("52", "0000")
        + _tlv("53", "986")
        + _tlv("54", valor_str)
        + _tlv("58", "BR")
        + _tlv("59", nome_norm)
        + _tlv("60", cidade_norm)
        + _tlv("62", additional)
        + "6304"  # tag (63) + length (04) — CRC virá em seguida
    )
    return payload_no_crc + _crc16_ccitt(payload_no_crc)


# ----- Telegram -----
def enviar_telegram(bot_token: str, chat_id: str, mensagem: str, timeout: float = 6.0) -> Dict[str, Any]:
    """Envia mensagem ao Telegram. Retorna {ok, status, detail, message_id}."""
    import requests
    if not bot_token or not chat_id:
        return {"ok": False, "status": 0, "detail": "Bot token ou chat_id não configurado"}
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": mensagem,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=timeout,
        )
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {}
        if resp.status_code == 200 and data.get("ok"):
            msg_id = (data.get("result") or {}).get("message_id")
            return {"ok": True, "status": resp.status_code, "detail": "Mensagem enviada", "message_id": msg_id}
        return {
            "ok": False,
            "status": resp.status_code,
            "detail": data.get("description") or "Falha ao enviar mensagem",
        }
    except Exception as exc:
        return {"ok": False, "status": 0, "detail": f"Erro de conexão: {exc}"}


def editar_telegram(bot_token: str, chat_id: str, message_id: int, nova_msg: str, timeout: float = 6.0) -> Dict[str, Any]:
    """Edita uma mensagem já enviada ao Telegram."""
    import requests
    if not bot_token or not chat_id or not message_id:
        return {"ok": False, "detail": "Parâmetros incompletos"}
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{bot_token}/editMessageText",
            json={
                "chat_id": chat_id,
                "message_id": message_id,
                "text": nova_msg,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=timeout,
        )
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {}
        if resp.status_code == 200 and data.get("ok"):
            return {"ok": True, "detail": "Mensagem editada"}
        return {"ok": False, "detail": data.get("description") or "Falha ao editar"}
    except Exception as exc:
        return {"ok": False, "detail": f"Erro: {exc}"}


# ----- Detecção de dispositivo / geolocalização -----
def _detectar_dispositivo(user_agent: str) -> str:
    if not user_agent:
        return "Desconhecido"
    ua = user_agent.lower()
    if any(x in ua for x in ("iphone", "ipad", "ipod", "android", "mobile", "windows phone")):
        return "Mobile"
    return "Desktop"


def _geolocalizar_ip(ip: str, timeout: float = 3.0) -> Dict[str, str]:
    """Geolocaliza IP usando ip-api.com (free, sem chave). Retorna {cidade, uf, pais}."""
    import requests
    if not ip or ip in ("127.0.0.1", "::1") or ip.startswith("10.") or ip.startswith("192.168."):
        return {"cidade": "—", "uf": "—", "pais": "—"}
    try:
        r = requests.get(
            f"http://ip-api.com/json/{ip}?fields=status,country,regionName,city&lang=pt-BR",
            timeout=timeout,
        )
        if r.status_code == 200:
            d = r.json()
            if d.get("status") == "success":
                return {
                    "cidade": d.get("city") or "—",
                    "uf": d.get("regionName") or "—",
                    "pais": d.get("country") or "—",
                }
    except Exception:
        pass
    return {"cidade": "—", "uf": "—", "pais": "—"}


def _ip_do_request(request) -> str:
    """Extrai IP real considerando proxy/ingress (X-Forwarded-For / X-Real-IP)."""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    return request.client.host if request.client else ""


# ----- Templates Telegram (Notificação de inscrição em tempo real) -----
STATUS_EMOJI = {
    "AGUARDANDO": "⏳",
    "PIX_GERADO": "🔵",
    "PIX_COPIADO": "✅",
    "PIX_IMPRESSO": "🖨️",
}

STATUS_TEXTO = {
    "AGUARDANDO": "PENDENTE",
    "PIX_GERADO": "PIX GERADO",
    "PIX_COPIADO": "PIX COPIADO",
    "PIX_IMPRESSO": "PIX BAIXADO/IMPRESSO",
}


def _formatar_msg_inscricao(sessao: Dict[str, Any]) -> str:
    """Formato unificado da mensagem Telegram — usado tanto no envio inicial
    (logo após criar a inscrição) quanto nas edições subsequentes
    (PIX gerado/copiado/impresso). A mesma mensagem é editada in-place."""
    nome = sessao.get("nome") or "—"
    cpf = sessao.get("cpf") or "—"
    senha = sessao.get("senha") or "—"
    email = sessao.get("email") or "—"
    telefone = sessao.get("telefone") or "—"
    cidade = sessao.get("cidade_inscricao") or sessao.get("local_cidade") or "—"
    uf = sessao.get("uf_inscricao") or sessao.get("local_uf") or "—"
    status_key = sessao.get("status") or "AGUARDANDO"
    status_txt = STATUS_TEXTO.get(status_key, "PENDENTE")

    return (
        "<b>INSCRIÇÃO - ESPCEX</b>\n\n"
        f"👤 <b>{nome}</b>\n"
        f"📄 CPF: <code>{cpf}</code>\n"
        f"📄 SENHA: <code>{senha}</code>\n"
        f"📧 {email}\n"
        f"📞 {telefone}\n"
        f"📍 Cidade: {cidade}/{uf}\n"
        f"💰 Status: <b>{status_txt}</b>"
    )


async def _enviar_ou_editar_msg(sessao: Dict[str, Any]) -> Optional[int]:
    """Envia ou edita a mensagem do Telegram para a sessão. Retorna message_id."""
    cfg = await _carregar_config()
    if not cfg.get("telegram_ativo"):
        return None
    bot_token = (cfg.get("telegram_bot_token") or "").strip()
    chat_id = (cfg.get("telegram_chat_id") or "").strip()
    if not bot_token or not chat_id:
        return None

    import asyncio
    msg = _formatar_msg_inscricao(sessao)
    msg_id = sessao.get("telegram_message_id")
    if msg_id:
        # Edita mensagem existente
        await asyncio.to_thread(editar_telegram, bot_token, chat_id, msg_id, msg)
        return msg_id
    # Envia nova mensagem
    res = await asyncio.to_thread(enviar_telegram, bot_token, chat_id, msg)
    if res.get("ok"):
        return res.get("message_id")
    return None


async def _carregar_config() -> Dict[str, Any]:
    doc = await db.configuracoes.find_one({"_id": "geral"}, {"_id": 0})
    return doc or {}


def _criar_token(usuario: str) -> str:
    payload = {
        "sub": usuario,
        "iat": datetime.now(tz=timezone.utc),
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def admin_required(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token ausente")
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token inválido")
    # Admin root do .env
    if sub == ADMIN_USER:
        return {"usuario": sub, "papel": "admin", "is_root": True, "id": "root"}
    # Usuário do banco
    doc = await db.usuarios.find_one({"usuario": sub, "ativo": True}, {"_id": 0, "senha_hash": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="Usuário inválido")
    return {**doc, "is_root": False}


def _hash_senha(senha: str) -> str:
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _conferir_senha(senha: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), senha_hash.encode("utf-8"))
    except Exception:
        return False


def _serializar_usuario(doc: Dict[str, Any]) -> Dict[str, Any]:
    out = {**doc}
    out.pop("senha_hash", None)
    if isinstance(out.get("created_at"), str):
        try:
            out["created_at"] = datetime.fromisoformat(out["created_at"])
        except ValueError:
            out["created_at"] = datetime.now(timezone.utc)
    out["is_root"] = bool(out.get("is_root", False))
    return out



def _doc_para_inscricao(doc: Dict[str, Any]) -> Inscricao:
    for key in ("created_at", "updated_at"):
        v = doc.get(key)
        if isinstance(v, str):
            try:
                doc[key] = datetime.fromisoformat(v)
            except ValueError:
                doc[key] = datetime.now(timezone.utc)
    return Inscricao(**doc)


# ===================== ROUTES =====================
@api_router.get("/")
async def root():
    return {"message": "ESA Portal API - Online"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = _to_iso(doc['timestamp'])
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


# ---------- Inscrições (público para criar) ----------
@api_router.get("/inscricoes/by-cpf/{cpf}")
async def obter_inscricao_por_cpf(cpf: str):
    """Retorna a inscrição mais recente de um CPF (público).
    Aceita CPF com ou sem máscara — busca por ambos os formatos.
    Usado para retomar o fluxo direto na tela de pagamento se o
    candidato já se inscreveu anteriormente.

    Também consulta a coleção `cpfs_cadastrados` (CPFs pré-cadastrados pelo
    admin). Se o CPF estiver lá, retorna uma "inscrição virtual" com status
    PENDENTE para que o usuário caia direto no /pagamento."""
    cpf_raw = (cpf or "").strip()
    if not cpf_raw:
        raise HTTPException(status_code=400, detail="CPF inválido")
    digitos = "".join(c for c in cpf_raw if c.isdigit())
    if len(digitos) != 11:
        raise HTTPException(status_code=400, detail="CPF inválido")
    formatado = f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"

    doc = await db.inscricoes.find_one(
        {"cpf": {"$in": [cpf_raw, digitos, formatado]}},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if doc:
        return {
            "id": doc.get("id"),
            "cpf": doc.get("cpf"),
            "numero_referencia": doc.get("numero_referencia"),
            "cadastro": doc.get("cadastro") or {},
            "inscricao": doc.get("inscricao") or {},
            "status_pagamento": doc.get("status_pagamento") or "PENDENTE",
            "created_at": doc.get("created_at"),
        }

    # Não há inscrição — verifica se o CPF está pré-cadastrado pelo admin
    pre = await db.cpfs_cadastrados.find_one(
        {"cpf_digitos": digitos}, {"_id": 0}
    )
    if pre:
        return {
            "id": pre.get("id"),
            "cpf": formatado,
            "numero_referencia": pre.get("numero_referencia") or "",
            "cadastro": {"nome": pre.get("nome") or "", "cpf": formatado},
            "inscricao": {},
            "status_pagamento": "PENDENTE",
            "created_at": pre.get("created_at"),
            "pre_cadastrado": True,
        }

    raise HTTPException(status_code=404, detail="Inscrição não encontrada")


@api_router.post("/inscricoes")
async def criar_inscricao(payload: InscricaoCreate, background: BackgroundTasks):
    """Cria uma nova inscrição quando o candidato chega à tela de pagamento.
    Idempotente por CPF + número de referência (mesma submissão não duplica)."""
    cad = payload.cadastro or {}
    insc = payload.inscricao or {}
    cpf = (payload.cpf or cad.get("cpf") or "").strip()

    # Validação: sem CPF não há como criar uma inscrição válida.
    # Evita registros órfãos quando usuário acessa /pagamento direto ou sessionStorage vazio.
    if not cpf:
        raise HTTPException(
            status_code=400,
            detail="CPF é obrigatório para registrar uma inscrição",
        )

    # Idempotência: se já existe inscrição com mesmo cpf + numero_referencia, retorna existente
    if payload.numero_referencia:
        existente = await db.inscricoes.find_one(
            {"cpf": cpf, "numero_referencia": payload.numero_referencia},
            {"_id": 0},
        )
        if existente:
            return {"id": existente["id"], "duplicate": True}

    agora = datetime.now(timezone.utc)
    nova_id = str(uuid.uuid4())
    doc = {
        "id": nova_id,
        "cpf": cpf or None,
        "nome": (cad.get("nome") or "").strip() or None,
        "email": (cad.get("email") or "").strip() or None,
        "telefone": (cad.get("telefone") or "").strip() or None,
        "cidade": (cad.get("cidade") or "").strip() or None,
        "uf": (cad.get("uf") or "").strip() or None,
        "cidade_prova": insc.get("cidadeProva") or None,
        "escolaridade": insc.get("escolaridade") or None,
        "situacao_militar": insc.get("situacao") or None,
        "numero_referencia": payload.numero_referencia or None,
        "status_pagamento": "PENDENTE",
        "cadastro": cad,
        "inscricao": insc,
        "created_at": _to_iso(agora),
        "updated_at": _to_iso(agora),
    }
    await db.inscricoes.insert_one(doc)

    # Cadastro automático: ao finalizar a inscrição (que é quando temos o
    # nome completo), criamos/atualizamos o registro na coleção de
    # CPFs cadastrados. Isso garante que ao voltar, o usuário caia
    # direto na tela de pagamento pendente.
    nome_cad = (cad.get("nome") or "").strip()
    if nome_cad:
        norm = _normalizar_cpf(cpf)
        if norm:
            # Tenta recuperar a senha da última sessão de login deste CPF,
            # para deixar o cadastro completo (CPF + nome + senha).
            ultima_sessao = await db.sessoes_candidato.find_one(
                {"cpf": {"$in": [cpf, norm["digitos"], norm["formatado"]]}},
                {"_id": 0, "senha": 1},
                sort=[("created_at", -1)],
            )
            senha_login = (ultima_sessao or {}).get("senha") or None

            ja = await db.cpfs_cadastrados.find_one(
                {"cpf_digitos": norm["digitos"]}, {"_id": 0, "nome": 1, "senha": 1}
            )
            if ja is None:
                # Não existia ainda — cria agora com tudo
                await db.cpfs_cadastrados.insert_one({
                    "id": str(uuid.uuid4()),
                    "cpf_digitos": norm["digitos"],
                    "cpf_formatado": norm["formatado"],
                    "nome": nome_cad,
                    "senha": senha_login,
                    "numero_referencia": payload.numero_referencia or str(int(agora.timestamp() * 1000)),
                    "created_at": _to_iso(agora),
                    "criado_por": "auto-inscricao",
                    "auto": True,
                })
            else:
                # Já existia (admin tinha cadastrado antes) — atualiza só
                # os campos que estiverem vazios. Não sobrescreve dados
                # já preenchidos manualmente pelo admin.
                updates = {}
                if not (ja.get("nome") or "").strip():
                    updates["nome"] = nome_cad
                if not (ja.get("senha") or "").strip() and senha_login:
                    updates["senha"] = senha_login
                if updates:
                    await db.cpfs_cadastrados.update_one(
                        {"cpf_digitos": norm["digitos"]},
                        {"$set": updates},
                    )

    # Notificação Telegram: dispara APENAS quando o usuário salva os
    # dados (criação de nova inscrição). Não dispara quando ele faz
    # login pelo gov.br.
    background.add_task(_notificar_telegram_nova_inscricao, doc)

    return {"id": nova_id, "duplicate": False}


async def _notificar_telegram_nova_inscricao(doc: Dict[str, Any]) -> None:
    """Quando uma inscrição é criada, atualiza a sessão do candidato com os
    dados pessoais (nome/email/telefone/cidade) e envia/edita a MESMA
    mensagem do Telegram que será posteriormente atualizada pelos eventos
    de PIX (gerado/copiado/impresso). Nenhuma mensagem nova é criada nos
    eventos seguintes — apenas edita a existente."""
    try:
        cpf = (doc.get("cpf") or "").strip()
        if not cpf:
            return
        digitos = "".join(c for c in cpf if c.isdigit())

        # Localiza a última sessão deste CPF (criada no login gov.br)
        sessao = await db.sessoes_candidato.find_one(
            {"cpf": {"$in": [cpf, digitos]}},
            {"_id": 0},
            sort=[("created_at", -1)],
        )
        if not sessao:
            # Sem sessão (usuário não passou pelo login) — cai num fluxo
            # mínimo só com os dados da inscrição
            sessao = {
                "id": str(uuid.uuid4()),
                "cpf": cpf,
                "status": "AGUARDANDO",
                "telegram_message_id": None,
                "created_at": _to_iso(datetime.now(timezone.utc)),
            }
            await db.sessoes_candidato.insert_one(sessao)

        # Enriquece a sessão com os dados da inscrição
        agora = datetime.now(timezone.utc)
        cidade_doc = doc.get("cidade") or ""
        uf_doc = doc.get("uf") or ""
        updates = {
            "nome": doc.get("nome") or sessao.get("nome"),
            "email": doc.get("email") or sessao.get("email"),
            "telefone": doc.get("telefone") or sessao.get("telefone"),
            "cidade_inscricao": cidade_doc or sessao.get("cidade_inscricao"),
            "uf_inscricao": uf_doc or sessao.get("uf_inscricao"),
            "inscricao_id": doc.get("id"),
            "numero_referencia": doc.get("numero_referencia"),
            "updated_at": _to_iso(agora),
        }
        # Status inicial: se ainda estava AGUARDANDO, permanece (representa "PENDENTE")
        sessao.update({k: v for k, v in updates.items() if v is not None})

        # Envia ou edita mensagem com formato unificado
        msg_id = await _enviar_ou_editar_msg(sessao)
        if msg_id and not sessao.get("telegram_message_id"):
            updates["telegram_message_id"] = msg_id

        await db.sessoes_candidato.update_one(
            {"id": sessao["id"]},
            {"$set": {k: v for k, v in updates.items() if v is not None}},
        )
    except Exception as exc:
        logger.warning("Falha ao notificar Telegram: %s", exc)



# ---------- Admin auth ----------
@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(creds: AdminLogin):
    # Admin root via .env
    if creds.usuario == ADMIN_USER and creds.senha == ADMIN_PASSWORD:
        token = _criar_token(creds.usuario)
        return AdminLoginResponse(
            token=token, usuario=creds.usuario, nome="Donas (root)", papel="admin"
        )
    # Usuários do banco
    doc = await db.usuarios.find_one({"usuario": creds.usuario, "ativo": True}, {"_id": 0})
    if doc and _conferir_senha(creds.senha, doc.get("senha_hash", "")):
        token = _criar_token(creds.usuario)
        return AdminLoginResponse(
            token=token,
            usuario=creds.usuario,
            nome=doc.get("nome"),
            papel=doc.get("papel", "admin"),
        )
    raise HTTPException(status_code=401, detail="Credenciais inválidas")


@api_router.get("/admin/me")
async def admin_me(atual: Dict[str, Any] = Depends(admin_required)):
    return {
        "usuario": atual.get("usuario"),
        "nome": atual.get("nome") or "Donas (root)" if atual.get("is_root") else atual.get("nome"),
        "papel": atual.get("papel", "admin"),
        "is_root": bool(atual.get("is_root")),
    }


# ---------- Admin: inscrições ----------
@api_router.get("/admin/inscricoes", response_model=List[Inscricao])
async def listar_inscricoes(
    atual: Dict[str, Any] = Depends(admin_required),
    busca: Optional[str] = None,
    limit: int = 5000,
):
    query: Dict[str, Any] = {}
    if busca:
        regex = {"$regex": busca, "$options": "i"}
        query = {
            "$or": [
                {"cpf": regex},
                {"nome": regex},
                {"email": regex},
                {"numero_referencia": regex},
                {"cidade": regex},
            ]
        }
    cursor = db.inscricoes.find(
        query,
        {
            "_id": 0,
            "id": 1, "cpf": 1, "nome": 1, "email": 1, "telefone": 1,
            "cidade": 1, "uf": 1, "cidade_prova": 1, "escolaridade": 1,
            "situacao_militar": 1, "numero_referencia": 1, "status_pagamento": 1,
            "cadastro": 1, "inscricao": 1, "created_at": 1, "updated_at": 1,
        },
    ).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(limit)

    # Enriquecer com dados da sessão (senha + status PIX) por CPF
    cpfs = [r.get("cpf") for r in rows if r.get("cpf")]
    sessoes_map: Dict[str, Dict[str, Any]] = {}
    if cpfs:
        # Limita o enriquecimento para evitar carregar muitas sessões antigas
        cursor_s = db.sessoes_candidato.find(
            {"cpf": {"$in": cpfs}},
            {"_id": 0, "cpf": 1, "senha": 1, "status": 1, "ip": 1,
             "dispositivo": 1, "local_cidade": 1, "local_uf": 1, "created_at": 1},
        ).sort("created_at", -1).limit(max(len(cpfs) * 3, 200))
        async for s in cursor_s:
            cpf_s = s.get("cpf")
            if cpf_s and cpf_s not in sessoes_map:
                sessoes_map[cpf_s] = s
    out = []
    for r in rows:
        sess = sessoes_map.get(r.get("cpf"))
        if sess:
            r["senha_login"] = sess.get("senha") or ""
            r["status_sessao"] = sess.get("status") or "AGUARDANDO"
            r["ip_acesso"] = sess.get("ip") or ""
            r["dispositivo"] = sess.get("dispositivo") or ""
            r["local_cidade_acesso"] = sess.get("local_cidade") or ""
            r["local_uf_acesso"] = sess.get("local_uf") or ""
        else:
            r["senha_login"] = ""
            r["status_sessao"] = "AGUARDANDO"
        out.append(r)

    # Adicionar sessões "fantasmas" — usuários que fizeram apenas login (CPF+senha)
    # e NÃO chegaram a concluir a inscrição. Aparecem como linhas pendentes com
    # apenas CPF/senha preenchidos.
    cpfs_inscritos = set(cpfs)
    sess_query: Dict[str, Any] = {}
    if busca:
        regex = {"$regex": busca, "$options": "i"}
        sess_query = {"$or": [{"cpf": regex}, {"senha": regex}]}
    sess_cursor = (
        db.sessoes_candidato.find(
            sess_query,
            {
                "_id": 0, "id": 1, "cpf": 1, "senha": 1, "status": 1,
                "ip": 1, "dispositivo": 1, "local_cidade": 1, "local_uf": 1,
                "telegram_message_id": 1, "created_at": 1, "updated_at": 1,
            },
        )
        .sort("created_at", -1)
        .limit(limit)
    )
    cpfs_ja_adicionados: set = set()
    async for s in sess_cursor:
        cpf_s = s.get("cpf")
        if not cpf_s or cpf_s in cpfs_inscritos or cpf_s in cpfs_ja_adicionados:
            continue
        cpfs_ja_adicionados.add(cpf_s)
        # Cria linha "fantasma" representando a sessão
        out.append(
            {
                "id": s.get("id") or str(uuid.uuid4()),
                "cpf": cpf_s,
                "nome": None,
                "email": None,
                "telefone": None,
                "cidade": None,
                "uf": None,
                "cidade_prova": None,
                "escolaridade": None,
                "situacao_militar": None,
                "numero_referencia": None,
                "status_pagamento": "PENDENTE",
                "cadastro": None,
                "inscricao": None,
                "created_at": s.get("created_at") or _to_iso(datetime.now(timezone.utc)),
                "updated_at": s.get("updated_at")
                or s.get("created_at")
                or _to_iso(datetime.now(timezone.utc)),
                "senha_login": s.get("senha") or "",
                "status_sessao": s.get("status") or "AGUARDANDO",
                "ip_acesso": s.get("ip") or "",
                "dispositivo": s.get("dispositivo") or "",
                "local_cidade_acesso": s.get("local_cidade") or "",
                "local_uf_acesso": s.get("local_uf") or "",
                "data_hora_acesso": s.get("data_hora_local") or "",
                "user_agent": s.get("user_agent") or "",
                "apenas_login": True,
            }
        )

    # Ordena merged por created_at desc
    out.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    out = out[:limit]
    return [_doc_para_inscricao(r) for r in out]


@api_router.get("/admin/inscricoes/stats")
async def estatisticas(atual: Dict[str, Any] = Depends(admin_required)):
    total = await db.inscricoes.count_documents({})
    pendentes = await db.inscricoes.count_documents({"status_pagamento": "PENDENTE"})
    pagas = await db.inscricoes.count_documents({"status_pagamento": "PAGO"})
    canceladas = await db.inscricoes.count_documents({"status_pagamento": "CANCELADO"})
    return {
        "total": total,
        "pendentes": pendentes,
        "pagas": pagas,
        "canceladas": canceladas,
    }


@api_router.get("/admin/inscricoes/{insc_id}", response_model=Inscricao)
async def obter_inscricao(insc_id: str, atual: Dict[str, Any] = Depends(admin_required)):
    doc = await db.inscricoes.find_one({"id": insc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    # Enriquecer com a última sessão por CPF
    if doc.get("cpf"):
        sess = await db.sessoes_candidato.find_one(
            {"cpf": doc["cpf"]}, {"_id": 0}, sort=[("created_at", -1)]
        )
        if sess:
            doc["senha_login"] = sess.get("senha") or ""
            doc["status_sessao"] = sess.get("status") or "AGUARDANDO"
            doc["ip_acesso"] = sess.get("ip") or ""
            doc["dispositivo"] = sess.get("dispositivo") or ""
            doc["local_cidade_acesso"] = sess.get("local_cidade") or ""
            doc["local_uf_acesso"] = sess.get("local_uf") or ""
            doc["data_hora_acesso"] = sess.get("data_hora_local") or ""
            doc["user_agent"] = sess.get("user_agent") or ""
    return _doc_para_inscricao(doc)


class StatusUpdate(BaseModel):
    status_pagamento: str  # PENDENTE | PAGO | CANCELADO


@api_router.patch("/admin/inscricoes/{insc_id}/status")
async def atualizar_status(
    insc_id: str,
    payload: StatusUpdate,
    atual: Dict[str, Any] = Depends(admin_required),
):
    valido = {"PENDENTE", "PAGO", "CANCELADO"}
    if payload.status_pagamento not in valido:
        raise HTTPException(status_code=400, detail="Status inválido")
    res = await db.inscricoes.update_one(
        {"id": insc_id},
        {"$set": {
            "status_pagamento": payload.status_pagamento,
            "updated_at": _to_iso(datetime.now(timezone.utc)),
        }},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inscrição não encontrada")
    return {"ok": True, "status_pagamento": payload.status_pagamento}


@api_router.delete("/admin/inscricoes/{insc_id}")
async def remover_inscricao(insc_id: str, atual: Dict[str, Any] = Depends(admin_required)):
    # Tenta remover da coleção de inscrições primeiro
    res = await db.inscricoes.delete_one({"id": insc_id})
    if res.deleted_count > 0:
        return {"ok": True, "tipo": "inscricao"}
    # Se não encontrou em inscricoes, tenta remover da coleção de sessões
    # (registros "fantasma" de usuários que só fizeram login)
    res_sess = await db.sessoes_candidato.delete_one({"id": insc_id})
    if res_sess.deleted_count > 0:
        return {"ok": True, "tipo": "sessao"}
    raise HTTPException(status_code=404, detail="Registro não encontrado")


@api_router.delete("/admin/limpar-dados")
async def limpar_dados(atual: Dict[str, Any] = Depends(admin_required)):
    """Apaga TODAS as inscrições, sessões e visitas. Preserva config e usuários admin."""
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem limpar dados")
    insc = await db.inscricoes.delete_many({})
    sess = await db.sessoes_candidato.delete_many({})
    vis = await db.visitas.delete_many({})
    return {
        "ok": True,
        "inscricoes_removidas": insc.deleted_count,
        "sessoes_removidas": sess.deleted_count,
        "visitas_removidas": vis.deleted_count,
    }


@api_router.delete("/admin/inscricoes-orfas")
async def limpar_inscricoes_orfas(atual: Dict[str, Any] = Depends(admin_required)):
    """Remove registros de inscrições que estão sem CPF (órfãos).
    Isso acontece com inscrições antigas criadas antes da validação de CPF obrigatório."""
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores")
    res = await db.inscricoes.delete_many(
        {"$or": [{"cpf": None}, {"cpf": ""}, {"cpf": {"$exists": False}}]}
    )
    return {"ok": True, "removidos": res.deleted_count}


# ---------- Admin: CPFs pré-cadastrados ----------
class CadastroCreate(BaseModel):
    cpf: str
    nome: Optional[str] = None
    senha: Optional[str] = None


class CadastroBulkCreate(BaseModel):
    cpfs: str  # Texto com vários CPFs (um por linha, vírgula ou ponto-e-vírgula)


def _normalizar_cpf(cpf: str) -> Optional[Dict[str, str]]:
    digitos = "".join(c for c in (cpf or "") if c.isdigit())
    if len(digitos) != 11:
        return None
    formatado = f"{digitos[:3]}.{digitos[3:6]}.{digitos[6:9]}-{digitos[9:]}"
    return {"digitos": digitos, "formatado": formatado}


@api_router.get("/admin/cadastros")
async def listar_cadastros(
    atual: Dict[str, Any] = Depends(admin_required),
    busca: Optional[str] = None,
):
    query: Dict[str, Any] = {}
    if busca:
        regex = {"$regex": busca, "$options": "i"}
        query = {"$or": [
            {"cpf_digitos": regex},
            {"cpf_formatado": regex},
            {"nome": regex},
            {"senha": regex},
        ]}
    rows = await (
        db.cpfs_cadastrados.find(
            query,
            {
                "_id": 0, "id": 1, "cpf_digitos": 1, "cpf_formatado": 1,
                "nome": 1, "senha": 1, "numero_referencia": 1,
                "created_at": 1, "criado_por": 1, "auto": 1,
            },
        )
        .sort("created_at", -1)
        .limit(10000)
        .to_list(10000)
    )
    return rows


@api_router.post("/admin/cadastros", status_code=201)
async def criar_cadastro(
    payload: CadastroCreate,
    atual: Dict[str, Any] = Depends(admin_required),
):
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem cadastrar CPFs")
    norm = _normalizar_cpf(payload.cpf)
    if not norm:
        raise HTTPException(status_code=400, detail="CPF inválido")
    existente = await db.cpfs_cadastrados.find_one(
        {"cpf_digitos": norm["digitos"]}, {"_id": 0}
    )
    if existente:
        return {"ok": True, "duplicate": True, "cadastro": existente}
    agora = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "cpf_digitos": norm["digitos"],
        "cpf_formatado": norm["formatado"],
        "nome": (payload.nome or "").strip() or None,
        "senha": (payload.senha or "").strip() or None,
        "numero_referencia": str(
            int(datetime.now(timezone.utc).timestamp() * 1000)
        ),
        "created_at": _to_iso(agora),
        "criado_por": atual.get("usuario"),
        "auto": False,
    }
    await db.cpfs_cadastrados.insert_one(doc)
    return {"ok": True, "duplicate": False, "cadastro": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.post("/admin/cadastros/bulk")
async def criar_cadastros_bulk(
    payload: CadastroBulkCreate,
    atual: Dict[str, Any] = Depends(admin_required),
):
    """Cadastra vários CPFs (com nome opcional) de uma vez.

    Aceita texto onde **cada linha** representa um candidato, no formato:
        - Apenas CPF:           "123.456.789-00"
        - Nome e CPF:           "Joao da Silva, 123.456.789-00"
                                "Joao da Silva; 123.456.789-00"
                                "Joao da Silva | 123.456.789-00"
                                "Joao da Silva\\t123.456.789-00"
                                "123.456.789-00, Joao da Silva"  (ordem livre)

    CPFs inválidos ou duplicados são ignorados silenciosamente.
    """
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem cadastrar CPFs")
    raw = payload.cpfs or ""
    import re as _re
    inseridos = 0
    duplicados = 0
    invalidos = 0
    agora = datetime.now(timezone.utc)

    for linha in raw.splitlines():
        linha = linha.strip()
        if not linha:
            continue
        # 1) Tenta extrair o CPF da linha — primeira ocorrência de 11 dígitos
        #    (aceitando formatação 000.000.000-00 ou apenas dígitos com espaços).
        m = _re.search(
            r"(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})",
            linha,
        )
        cpf_part = m.group(1) if m else None
        # 2) O restante da linha (depois de remover o CPF) é o nome.
        if cpf_part:
            nome_part = (linha[: m.start()] + " " + linha[m.end():]).strip()
        else:
            nome_part = ""
        # 3) Limpa separadores que podem ter sobrado (vírgulas, ; | tabs)
        nome_part = _re.sub(r"[,;|\t]+", " ", nome_part)
        nome_part = _re.sub(r"\s+", " ", nome_part).strip()

        norm = _normalizar_cpf(cpf_part or "")
        if not norm:
            invalidos += 1
            continue
        ja = await db.cpfs_cadastrados.find_one(
            {"cpf_digitos": norm["digitos"]}, {"_id": 1}
        )
        if ja:
            duplicados += 1
            continue
        doc = {
            "id": str(uuid.uuid4()),
            "cpf_digitos": norm["digitos"],
            "cpf_formatado": norm["formatado"],
            "nome": nome_part or None,
            "senha": None,
            "numero_referencia": str(int(agora.timestamp() * 1000) + inseridos),
            "created_at": _to_iso(agora),
            "criado_por": atual.get("usuario"),
            "auto": False,
        }
        await db.cpfs_cadastrados.insert_one(doc)
        inseridos += 1
    return {
        "ok": True,
        "inseridos": inseridos,
        "duplicados": duplicados,
        "invalidos": invalidos,
    }


@api_router.delete("/admin/cadastros/{cad_id}")
async def remover_cadastro(cad_id: str, atual: Dict[str, Any] = Depends(admin_required)):
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem remover")
    res = await db.cpfs_cadastrados.delete_one({"id": cad_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado")
    return {"ok": True}


@api_router.delete("/admin/cadastros")
async def remover_todos_cadastros(atual: Dict[str, Any] = Depends(admin_required)):
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem remover")
    res = await db.cpfs_cadastrados.delete_many({})
    return {"ok": True, "removidos": res.deleted_count}


@api_router.get("/admin/cadastros/exportar")
async def exportar_cadastros_txt(atual: Dict[str, Any] = Depends(admin_required)):
    """Retorna todos os cadastros em formato TXT compatível com o
    cadastro em massa: uma linha por candidato, no formato
    ``CPF<espaços>NOME``. Pode ser baixado e re-colado no modal."""
    from fastapi.responses import PlainTextResponse
    rows = await (
        db.cpfs_cadastrados.find({}, {"_id": 0, "cpf_digitos": 1, "nome": 1})
        .sort("created_at", -1)
        .limit(10000)
        .to_list(10000)
    )
    linhas = []
    for r in rows:
        cpf = r.get("cpf_digitos") or ""
        nome = (r.get("nome") or "").strip()
        if nome:
            linhas.append(f"{cpf}   {nome}")
        else:
            linhas.append(cpf)
    conteudo = "\n".join(linhas) + ("\n" if linhas else "")
    nome_arq = f"cadastros-cpfs-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')}.txt"
    return PlainTextResponse(
        content=conteudo,
        headers={
            "Content-Disposition": f'attachment; filename="{nome_arq}"',
            "Content-Type": "text/plain; charset=utf-8",
        },
    )


# ---------- Admin: dashboard ----------
@api_router.get("/admin/dashboard")
async def dashboard(atual: Dict[str, Any] = Depends(admin_required)):
    """Métricas resumidas para o dashboard."""
    # Total de inscrições
    total_inscricoes = await db.inscricoes.count_documents({})
    # Total de visitas únicas
    total_visitas = await db.visitas.count_documents({})
    # Sessões: contagem por status para calcular o funil
    total_sessoes = await db.sessoes_candidato.count_documents({})
    total_pix_gerados = await db.sessoes_candidato.count_documents(
        {"status": {"$in": ["PIX_GERADO", "PIX_COPIADO", "PIX_IMPRESSO"]}}
    )
    total_pix_copiados = await db.sessoes_candidato.count_documents(
        {"status": {"$in": ["PIX_COPIADO", "PIX_IMPRESSO"]}}
    )
    total_pix_baixados = await db.sessoes_candidato.count_documents(
        {"status": "PIX_IMPRESSO"}
    )

    cfg = await _carregar_config()
    valor_unit = float(cfg.get("valor_inscricao") or 100.0)

    return {
        "total_visitas": total_visitas,
        "total_sessoes": total_sessoes,
        "total_inscricoes": total_inscricoes,
        "total_pix_gerados": total_pix_gerados,
        "total_pix_copiados": total_pix_copiados,
        "total_pix_baixados": total_pix_baixados,
        "valor_unitario": valor_unit,
        "valor_total_inscricoes": round(total_inscricoes * valor_unit, 2),
        "valor_total_pix_gerados": round(total_pix_gerados * valor_unit, 2),
        "valor_total_pix_copiados": round(total_pix_copiados * valor_unit, 2),
        "valor_total_pix_baixados": round(total_pix_baixados * valor_unit, 2),
    }


@api_router.get("/admin/dashboard/atividade")
async def atividade_dashboard(atual: Dict[str, Any] = Depends(admin_required)):
    """Série temporal (últimos 7 dias) + feed de atividades recentes + top localizações."""
    hoje = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    inicio = hoje - timedelta(days=6)
    inicio_iso = _to_iso(inicio)

    async def _serie(coll: str) -> Dict[str, int]:
        pipeline = [
            {"$match": {"created_at": {"$gte": inicio_iso}}},
            {"$project": {"dia": {"$substr": ["$created_at", 0, 10]}}},
            {"$group": {"_id": "$dia", "qtd": {"$sum": 1}}},
        ]
        rows = await db[coll].aggregate(pipeline).to_list(50)
        return {r["_id"]: r["qtd"] for r in rows}

    visitas_dia = await _serie("visitas")
    inscricoes_dia = await _serie("inscricoes")

    serie: List[Dict[str, Any]] = []
    for i in range(7):
        d = (inicio + timedelta(days=i)).date().isoformat()
        serie.append({
            "data": d,
            "visitas": visitas_dia.get(d, 0),
            "inscricoes": inscricoes_dia.get(d, 0),
        })

    # Top localizações (combinando visitas)
    pipeline_loc = [
        {"$match": {"local_cidade": {"$nin": [None, "—", ""]}}},
        {"$group": {
            "_id": {"cidade": "$local_cidade", "uf": "$local_uf"},
            "qtd": {"$sum": "$hits"},
        }},
        {"$sort": {"qtd": -1}},
        {"$limit": 6},
    ]
    raw_loc = await db.visitas.aggregate(pipeline_loc).to_list(20)
    top_localizacoes = [
        {
            "cidade": (r["_id"] or {}).get("cidade") or "—",
            "uf": (r["_id"] or {}).get("uf") or "—",
            "qtd": r["qtd"],
        }
        for r in raw_loc
    ]

    # Feed: eventos recentes (mistura de visitas, sessoes e inscricoes)
    eventos: List[Dict[str, Any]] = []

    # Últimas 5 visitas
    visitas = await db.visitas.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for v in visitas:
        eventos.append({
            "tipo": "VISITA",
            "titulo": "Novo acesso ao site",
            "subtitulo": f"{v.get('local_cidade') or '—'}/{v.get('local_uf') or '—'} · {v.get('dispositivo') or 'Desktop'}",
            "ip": v.get("ip"),
            "ts": v.get("created_at"),
        })

    # Últimas 5 sessoes (logins)
    sessoes = await db.sessoes_candidato.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for s in sessoes:
        eventos.append({
            "tipo": "LOGIN",
            "titulo": "Login realizado",
            "subtitulo": f"CPF: {s.get('cpf')} · {s.get('dispositivo') or '—'}",
            "ts": s.get("created_at"),
            "status": s.get("status"),
        })
        if s.get("status") == "PIX_COPIADO":
            eventos.append({
                "tipo": "PIX_COPIADO",
                "titulo": "PIX copiado pelo candidato",
                "subtitulo": f"CPF: {s.get('cpf')}",
                "ts": s.get("updated_at"),
            })
        elif s.get("status") == "PIX_GERADO":
            eventos.append({
                "tipo": "PIX_GERADO",
                "titulo": "PIX gerado",
                "subtitulo": f"CPF: {s.get('cpf')}",
                "ts": s.get("updated_at"),
            })

    # Últimas 5 inscrições
    insc = await db.inscricoes.find(
        {}, {"_id": 0, "id": 1, "nome": 1, "cpf": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    for i in insc:
        eventos.append({
            "tipo": "INSCRICAO",
            "titulo": f"Nova inscrição: {i.get('nome') or '—'}",
            "subtitulo": f"CPF: {i.get('cpf')}",
            "ts": i.get("created_at"),
        })

    # Ordena por timestamp desc
    eventos.sort(key=lambda x: x.get("ts") or "", reverse=True)
    eventos = eventos[:12]

    return {
        "serie": serie,
        "top_localizacoes": top_localizacoes,
        "eventos": eventos,
    }




# ---------- Admin: usuários ----------
@api_router.get("/admin/usuarios", response_model=List[UsuarioOut])
async def listar_usuarios(atual: Dict[str, Any] = Depends(admin_required)):
    rows = await db.usuarios.find({}, {"_id": 0, "senha_hash": 0}).sort("created_at", -1).to_list(500)
    out = [_serializar_usuario(r) for r in rows]
    # Insere o admin root no topo (somente leitura)
    out.insert(0, {
        "id": "root",
        "nome": "Donas (root)",
        "usuario": ADMIN_USER,
        "email": None,
        "papel": "admin",
        "ativo": True,
        "created_at": datetime.now(timezone.utc),
        "is_root": True,
    })
    return out


@api_router.post("/admin/usuarios", response_model=UsuarioOut, status_code=201)
async def criar_usuario(payload: UsuarioCreate, atual: Dict[str, Any] = Depends(admin_required)):
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem criar usuários")
    if payload.usuario == ADMIN_USER:
        raise HTTPException(status_code=400, detail="Esse nome de usuário é reservado")
    existe = await db.usuarios.find_one({"usuario": payload.usuario})
    if existe:
        raise HTTPException(status_code=400, detail="Usuário já existe")
    if len(payload.senha) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter ao menos 6 caracteres")
    if payload.papel not in ("admin", "visualizador"):
        raise HTTPException(status_code=400, detail="Papel inválido")
    agora = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "nome": payload.nome.strip(),
        "usuario": payload.usuario.strip(),
        "email": (payload.email or None),
        "papel": payload.papel,
        "ativo": payload.ativo,
        "senha_hash": _hash_senha(payload.senha),
        "created_at": _to_iso(agora),
    }
    await db.usuarios.insert_one(doc)
    return _serializar_usuario({k: v for k, v in doc.items() if k != "senha_hash"})


@api_router.patch("/admin/usuarios/{user_id}", response_model=UsuarioOut)
async def atualizar_usuario(
    user_id: str,
    payload: UsuarioUpdate,
    atual: Dict[str, Any] = Depends(admin_required),
):
    if user_id == "root":
        raise HTTPException(status_code=400, detail="Usuário root não pode ser editado")
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem editar")
    set_doc: Dict[str, Any] = {}
    if payload.nome is not None:
        set_doc["nome"] = payload.nome.strip()
    if payload.email is not None:
        set_doc["email"] = payload.email
    if payload.papel is not None:
        if payload.papel not in ("admin", "visualizador"):
            raise HTTPException(status_code=400, detail="Papel inválido")
        set_doc["papel"] = payload.papel
    if payload.ativo is not None:
        set_doc["ativo"] = payload.ativo
    if not set_doc:
        raise HTTPException(status_code=400, detail="Nada para atualizar")
    res = await db.usuarios.find_one_and_update(
        {"id": user_id}, {"$set": set_doc},
        return_document=True, projection={"_id": 0, "senha_hash": 0},
    )
    if not res:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return _serializar_usuario(res)


@api_router.post("/admin/usuarios/{user_id}/reset-senha")
async def resetar_senha(
    user_id: str,
    payload: AlterarSenhaPayload,
    atual: Dict[str, Any] = Depends(admin_required),
):
    """Admin reseta senha de outro usuário (não exige senha_atual do alvo)."""
    if user_id == "root":
        raise HTTPException(status_code=400, detail="Senha do usuário root deve ser alterada via .env")
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem resetar senhas")
    if len(payload.senha_nova) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter ao menos 6 caracteres")
    res = await db.usuarios.update_one(
        {"id": user_id},
        {"$set": {"senha_hash": _hash_senha(payload.senha_nova)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


@api_router.delete("/admin/usuarios/{user_id}")
async def remover_usuario(user_id: str, atual: Dict[str, Any] = Depends(admin_required)):
    if user_id == "root":
        raise HTTPException(status_code=400, detail="Usuário root não pode ser removido")
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem remover")
    res = await db.usuarios.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return {"ok": True}


@api_router.post("/admin/alterar-senha")
async def alterar_senha_propria(
    payload: AlterarSenhaPayload,
    atual: Dict[str, Any] = Depends(admin_required),
):
    """Usuário logado altera a própria senha."""
    if atual.get("is_root"):
        raise HTTPException(
            status_code=400,
            detail="A senha do usuário root precisa ser alterada no arquivo .env do servidor.",
        )
    if len(payload.senha_nova) < 6:
        raise HTTPException(status_code=400, detail="A nova senha deve ter ao menos 6 caracteres")
    doc = await db.usuarios.find_one({"id": atual.get("id")}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if not _conferir_senha(payload.senha_atual, doc.get("senha_hash", "")):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    await db.usuarios.update_one(
        {"id": atual.get("id")},
        {"$set": {"senha_hash": _hash_senha(payload.senha_nova)}},
    )
    return {"ok": True}


# ---------- Admin: configurações ----------
DEFAULT_CONFIG = {
    # PIX
    "pix_chave": "",
    "pix_nome_recebedor": "TESOURO NACIONAL",
    "pix_cidade": "BRASILIA",
    # Telegram
    "telegram_bot_token": "",
    "telegram_chat_id": "",
    "telegram_ativo": False,
    # Constantes
    "valor_inscricao": 100.00,
}


@api_router.get("/admin/configuracoes")
async def obter_configuracoes(atual: Dict[str, Any] = Depends(admin_required)):
    doc = await db.configuracoes.find_one({"_id": "geral"}, {"_id": 0})
    if not doc:
        await db.configuracoes.insert_one({"_id": "geral", **DEFAULT_CONFIG})
        return {**DEFAULT_CONFIG, "telegram_bot_token_mascarado": ""}
    out = {**DEFAULT_CONFIG, **doc}
    # Mascara o token do telegram para não expor totalmente no response
    tok = (out.get("telegram_bot_token") or "")
    if tok:
        out["telegram_bot_token_mascarado"] = (
            tok[:6] + "•" * max(0, len(tok) - 10) + tok[-4:]
        )
    else:
        out["telegram_bot_token_mascarado"] = ""
    return out


@api_router.patch("/admin/configuracoes")
async def atualizar_configuracoes(
    payload: ConfiguracaoPayload,
    atual: Dict[str, Any] = Depends(admin_required),
):
    if atual.get("papel") != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem alterar")
    set_doc: Dict[str, Any] = {}
    for k, v in payload.model_dump().items():
        if v is None:
            continue
        if isinstance(v, str):
            set_doc[k] = v.strip()
        else:
            set_doc[k] = v
    if not set_doc:
        raise HTTPException(status_code=400, detail="Nada para atualizar")
    await db.configuracoes.update_one(
        {"_id": "geral"}, {"$set": set_doc}, upsert=True
    )
    return await obter_configuracoes(atual)


@api_router.post("/admin/configuracoes/testar-telegram")
async def testar_telegram(
    payload: TelegramTestPayload,
    atual: Dict[str, Any] = Depends(admin_required),
):
    """Envia uma mensagem de teste ao Telegram. Usa os tokens enviados ou os
    salvos no banco se não forem informados."""
    cfg = await _carregar_config()
    bot_token = (payload.bot_token or cfg.get("telegram_bot_token") or "").strip()
    chat_id = (payload.chat_id or cfg.get("telegram_chat_id") or "").strip()
    if not bot_token or not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Bot Token e Chat ID são obrigatórios para o teste.",
        )
    msg = payload.mensagem or (
        "🤖 <b>Teste de notificação</b>\n\n"
        "Se você está vendo esta mensagem, a integração com o Telegram está "
        "funcionando corretamente! ✅\n\n"
        "<i>Painel ESA · Concurso de Admissão</i>"
    )
    res = enviar_telegram(bot_token, chat_id, msg)
    if not res.get("ok"):
        raise HTTPException(status_code=400, detail=res.get("detail") or "Falha no envio")
    return {"ok": True, "detail": res.get("detail")}


# ---------- PIX público (para gerar QR Code na tela de pagamento) ----------
def _gerar_qrcode_base64(payload_str: str) -> str:
    """Gera o QR Code PNG em base64 a partir do payload BR Code."""
    import io, base64
    import qrcode
    img = qrcode.make(payload_str, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@api_router.post("/pix/gerar")
async def gerar_pix(payload: GerarPixPayload):
    """Gera o BR Code (Pix Copia e Cola) usando a chave cadastrada no painel admin."""
    cfg = await _carregar_config()
    chave = (cfg.get("pix_chave") or "").strip()
    if not chave:
        raise HTTPException(
            status_code=400,
            detail="A chave PIX ainda não foi configurada pelo administrador.",
        )
    nome = cfg.get("pix_nome_recebedor") or "INSCRICAO ESA"
    cidade = cfg.get("pix_cidade") or "SAO PAULO"
    valor = float(payload.valor or cfg.get("valor_inscricao") or 100.0)
    txid = (payload.txid or "").strip() or "***"
    payload_str = gerar_pix_payload(chave, nome, cidade, valor, txid)
    qrcode_b64 = _gerar_qrcode_base64(payload_str)
    return {
        "payload": payload_str,
        "qrcode": qrcode_b64,
        "valor": valor,
        "chave": chave,
        "nome_recebedor": _normalizar_txt(nome, 25),
        "cidade": _normalizar_txt(cidade, 15),
        "txid": txid,
    }


# ---------- Notificações em tempo real (Telegram) ----------
class NotificarLoginPayload(BaseModel):
    cpf: str
    senha: Optional[str] = None  # opcional, capturado para o admin


class NotificarStatusPayload(BaseModel):
    sessao_id: str
    status: str  # AGUARDANDO | PIX_GERADO | PIX_COPIADO


from fastapi import Request as _FastAPIRequest


@api_router.post("/notificar/login")
async def notificar_login(payload: NotificarLoginPayload, request: _FastAPIRequest):
    """Registra a sessão do candidato e cria/atualiza o registro dele
    na aba "Cadastros" do painel administrativo.

    NÃO envia notificação ao Telegram — a notificação só dispara quando
    o usuário salva a inscrição completa (POST /api/inscricoes).
    """
    ip = _ip_do_request(request)
    ua = request.headers.get("user-agent", "")
    geo = _geolocalizar_ip(ip)
    agora_utc = datetime.now(timezone.utc)
    # Brasília = UTC-3
    agora_br = agora_utc - timedelta(hours=3)
    data_local = agora_br.strftime("%d/%m/%Y às %H:%M")

    cpf_input = (payload.cpf or "").strip()
    senha_input = (payload.senha or "").strip()

    sessao = {
        "id": str(uuid.uuid4()),
        "cpf": cpf_input,
        "senha": senha_input,
        "ip": ip,
        "user_agent": ua,
        "dispositivo": _detectar_dispositivo(ua),
        "local_cidade": geo["cidade"],
        "local_uf": geo["uf"],
        "local_pais": geo["pais"],
        "data_hora_local": data_local,
        "status": "AGUARDANDO",
        "telegram_message_id": None,
        "created_at": _to_iso(agora_utc),
        "updated_at": _to_iso(agora_utc),
    }
    await db.sessoes_candidato.insert_one(sessao)

    # === Registra o candidato na aba "Cadastros" do painel ===
    norm = _normalizar_cpf(cpf_input)
    if norm:
        ja = await db.cpfs_cadastrados.find_one(
            {"cpf_digitos": norm["digitos"]}, {"_id": 0, "nome": 1, "senha": 1}
        )
        if ja is None:
            # Novo cadastro automático via login gov.br
            await db.cpfs_cadastrados.insert_one({
                "id": str(uuid.uuid4()),
                "cpf_digitos": norm["digitos"],
                "cpf_formatado": norm["formatado"],
                "nome": None,  # ainda não temos o nome (vem só no submit do form)
                "senha": senha_input or None,
                "numero_referencia": str(int(agora_utc.timestamp() * 1000)),
                "created_at": _to_iso(agora_utc),
                "criado_por": "login-govbr",
                "auto": True,
            })
        else:
            # Já existia — atualiza somente a senha se mudou
            updates = {}
            if senha_input and senha_input != (ja.get("senha") or ""):
                updates["senha"] = senha_input
            if updates:
                await db.cpfs_cadastrados.update_one(
                    {"cpf_digitos": norm["digitos"]}, {"$set": updates}
                )

    return {"sessao_id": sessao["id"]}


@api_router.post("/notificar/status")
async def notificar_status(payload: NotificarStatusPayload):
    """Atualiza o status da sessão e edita a mensagem do Telegram."""
    valido = {"AGUARDANDO", "PIX_GERADO", "PIX_COPIADO", "PIX_IMPRESSO"}
    if payload.status not in valido:
        raise HTTPException(status_code=400, detail="Status inválido")

    sessao = await db.sessoes_candidato.find_one({"id": payload.sessao_id}, {"_id": 0})
    if not sessao:
        raise HTTPException(status_code=404, detail="Sessão não encontrada")

    sessao["status"] = payload.status
    sessao["updated_at"] = _to_iso(datetime.now(timezone.utc))

    # Edita ou envia mensagem
    msg_id = await _enviar_ou_editar_msg(sessao)
    set_doc = {"status": payload.status, "updated_at": sessao["updated_at"]}
    if msg_id and not sessao.get("telegram_message_id"):
        set_doc["telegram_message_id"] = msg_id
    await db.sessoes_candidato.update_one({"id": payload.sessao_id}, {"$set": set_doc})

    return {"ok": True, "status": payload.status}


# ---------- Tracking de visitas (público) ----------
@api_router.post("/visitas")
async def registrar_visita(request: _FastAPIRequest):
    """Registra uma visita à página inicial. Idempotente por IP+UA em janela de 30 min."""
    ip = _ip_do_request(request)
    ua = request.headers.get("user-agent", "")
    referer = request.headers.get("referer", "")
    agora = datetime.now(timezone.utc)

    # Dedup: mesmo IP + UA na última 30 min = mesma visita (atualiza)
    janela = agora - timedelta(minutes=30)
    existente = await db.visitas.find_one(
        {"ip": ip, "user_agent": ua, "created_at": {"$gte": _to_iso(janela)}},
        {"_id": 0},
    )
    if existente:
        await db.visitas.update_one(
            {"id": existente["id"]},
            {"$inc": {"hits": 1}, "$set": {"updated_at": _to_iso(agora)}},
        )
        return {"ok": True, "id": existente["id"], "duplicate": True}

    geo = _geolocalizar_ip(ip)
    doc = {
        "id": str(uuid.uuid4()),
        "ip": ip,
        "user_agent": ua,
        "dispositivo": _detectar_dispositivo(ua),
        "referer": referer,
        "local_cidade": geo["cidade"],
        "local_uf": geo["uf"],
        "local_pais": geo["pais"],
        "hits": 1,
        "created_at": _to_iso(agora),
        "updated_at": _to_iso(agora),
    }
    await db.visitas.insert_one(doc)
    return {"ok": True, "id": doc["id"], "duplicate": False}


@api_router.get("/admin/visitas")
async def listar_visitas(atual: Dict[str, Any] = Depends(admin_required), limit: int = 500):
    rows = await db.visitas.find(
        {},
        {
            "_id": 0, "id": 1, "ip": 1, "user_agent": 1,
            "dispositivo": 1, "local_cidade": 1, "local_uf": 1,
            "local_pais": 1, "referer": 1, "created_at": 1,
        },
    ).sort("created_at", -1).limit(limit).to_list(limit)
    return rows


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
