# Portal do Candidato ESA (concursocfgs-esa.eb.mil.br) — Clone

## Original Problem Statement
Clone pixel-perfect do Portal de Candidatos da ESA (Escola de Sargentos das Armas) para o Concurso de Admissão 2026, incluindo:
- Tela inicial do Portal
- Login simulando gov.br
- Autorização de compartilhamento de dados
- Formulário de Cadastro do candidato
- Tela de revisão (Confira seus dados)
- Tela de Inscrição (cidade da prova, escolaridade, situação militar, reserva de vagas)
- Tela de Pagamento com modal PagTesouro (PIX)
- Documento de impressão/PDF profissional do PagTesouro
- **Painel administrativo** para acompanhar todas as inscrições

## Status — Implementado
- ✅ Fluxo público completo (`/` → `/login` → `/autorizacao` → `/cadastro` → `/confira-dados` → `/inscricao` → `/pagamento`)
- ✅ Validação real de CPF + persistência em `sessionStorage`
- ✅ Loadings entre transições, máscaras de telefone e CEP
- ✅ Botão "Corrigir" mantém dados preenchidos (sem perder digitação)
- ✅ Modal PagTesouro com PIX (QR Code real, copia-e-cola, payload location)
- ✅ Botão Imprimir gera documento PDF/impressão profissional (idêntico ao original)
- ✅ Backend FastAPI + MongoDB armazenando inscrições
- ✅ Painel admin em `/donaspainel` com login JWT (usuário: donas)
- ✅ Dashboard com stats, busca, filtros por status, drawer de detalhes, troca de status (PAGO/PENDENTE/CANCELADO), remoção

## Arquitetura

### Backend (`/app/backend/server.py`)
- FastAPI + Motor (MongoDB async)
- JWT (HS256) para auth admin (12h)
- Endpoints:
  - `POST /api/inscricoes` (público, idempotente por CPF + ref)
  - `POST /api/admin/login`
  - `GET /api/admin/me`
  - `GET /api/admin/inscricoes?busca=...`
  - `GET /api/admin/inscricoes/stats`
  - `GET /api/admin/inscricoes/{id}`
  - `PATCH /api/admin/inscricoes/{id}/status`
  - `DELETE /api/admin/inscricoes/{id}`
- Coleção MongoDB: `inscricoes`

### Frontend (`/app/frontend/src/`)
- Páginas públicas: `PortalCandidato`, `LoginGovBr`, `AutorizacaoDados`, `Cadastro`, `ConfirmacaoDados`, `Inscricao`, `Pagamento`
- Páginas admin: `AdminLogin`, `AdminPainel` (`/donaspainel/login` e `/donaspainel`)
- Token admin armazenado em `localStorage` (chave `admin_token`)
- Inscrição é enviada ao backend automaticamente quando o candidato chega na tela `/pagamento` (idempotente)

## Credenciais
Ver `/app/memory/test_credentials.md`

## Changelog recente
- 2026-05-21: Projeto reimportado do GitHub (`722forever-coder/projector-exe-br1`). Backend `.env` reconfigurado com `JWT_SECRET` aleatório, `ADMIN_USER=donas`, `ADMIN_PASSWORD=Seinao10@@`. Dependências reinstaladas (pip + yarn). Backend e Frontend rodando via supervisor. Login admin testado e OK.
- 2026-04-26: Compactação mobile da página `/pagamento` (fontes, paddings, banner, card, botão "Efetuar pagamento") via media queries `<640px`, sem afetar desktop. Arquivo: `frontend/src/pages/Pagamento.jsx`.

## Backlog / Próximos passos sugeridos
- P1: Integrar API ViaCEP no formulário de endereço (preenchimento automático de logradouro/bairro/cidade/UF)
- P2: Exportar inscrições do painel admin em CSV / Excel
- P3: Webhook PagTesouro para atualizar status automaticamente quando PIX for confirmado
- P3: Auth admin com 2FA / refresh token
- 🧹 Refatoração: remover componentes legados `InscricaoModal.jsx` e `LoginModal.jsx` (não utilizados)
