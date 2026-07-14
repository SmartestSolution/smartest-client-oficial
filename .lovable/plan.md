# Plano: 8 novas features no SmartestClient

Vou implementar em **4 fases** para manter qualidade e permitir validação parcial. Cada fase é independente e pode ser revisada antes da próxima.

## Fase 1 — Base + UX rápida
**1. Busca Global (Cmd+K / Ctrl+K)**
- Componente `GlobalSearchDialog` usando `cmdk` (já vem com shadcn `Command`).
- Busca em paralelo: `projects`, `documents`, `support_tickets`, `chat_messages` (respeitando RLS — admin vê tudo, cliente só os seus).
- Atalho global `Cmd/Ctrl+K` registrado no `AppLayout`.
- Resultados agrupados por tipo, com ícone e link de navegação.

**2. Atalhos de teclado**
- Hook `useKeyboardShortcuts` central.
- Atalhos: `g d` (Dashboard), `g p` (Projetos), `g c` (Chat), `g s` (SAC), `g a` (Agenda), `?` (modal de ajuda), `Cmd+K` (busca).
- Modal `KeyboardShortcutsDialog` listando todos.

**3. Onboarding guiado**
- Lib `driver.js` (leve, ~10kb, sem dependências).
- Flag `onboarding_completed` em `profiles` (nova coluna boolean).
- Tour roda na primeira visita ao Dashboard: highlight em Sidebar > Dashboard, Projetos, Chat, SAC, sino de notificações, busca.
- Botão "Refazer tour" no perfil.

## Fase 2 — Chat melhorado
**4. Presença online/ausente**
- Supabase Realtime Presence channel `presence:global`.
- Cada cliente faz `track({ user_id, status, last_seen })` ao entrar.
- Status: `online` (ativo), `away` (5 min sem atividade), `offline` (desconectado).
- Indicador (bolinha verde/amarela/cinza) nos avatares do chat e listas.

**5. Reações em mensagens**
- Nova tabela `chat_message_reactions (id, message_id, user_id, emoji, created_at)`.
- Botão "+" ao passar mouse na mensagem → popover com 6 emojis (👍 ✅ ❤️ 🎉 👀 🙏).
- Agregação visual: `👍 3` clicável (toggle).
- Realtime nas reações.

## Fase 3 — Documentos colaborativos
**6. Comentários em documentos**
- Nova tabela `document_comments (id, document_id, user_id, parent_id, content, created_at, updated_at)`.
- Botão "Comentários (N)" em cada documento → drawer lateral com thread.
- Threads aninhadas 1 nível (reply).
- Notificação automática ao autor do doc quando alguém comenta (trigger).

## Fase 4 — Produtividade admin
**7. Templates de projeto**
- Novas tabelas: `project_templates`, `project_template_stages`, `project_template_stage_items`, `project_template_milestones`.
- Tela `/admin/templates` (CRUD).
- Ao criar projeto no admin: dropdown "Criar a partir de template" → copia stages, items e milestones para o novo projeto.
- Botão "Salvar como template" em projeto existente.

**8. Logs de auditoria**
- Nova tabela `audit_logs (id, user_id, action, resource_type, resource_id, metadata jsonb, ip, user_agent, created_at)`.
- Triggers nas tabelas chave (`documents`, `videos`, `projects`, `support_tickets`) para INSERT/UPDATE/DELETE.
- Função RPC `log_download(doc_id)` chamada no front quando baixa arquivo.
- Tela `/admin/audit` com filtros (usuário, ação, recurso, data) e paginação.

---

## Detalhes técnicos

**Migrations necessárias** (1 por fase):
- F1: `profiles.onboarding_completed boolean default false`.
- F2: `chat_message_reactions` + RLS + GRANTs + ADD TO publication realtime.
- F3: `document_comments` + RLS + GRANTs + trigger de notificação.
- F4: 4 tabelas `project_template_*`, `audit_logs` + RLS + GRANTs + triggers de auditoria.

**Dependências novas**:
- `cmdk` (já presente via shadcn) — verificar.
- `driver.js` — `bun add driver.js`.

**Arquivos novos** (~estimativa):
- `src/components/search/GlobalSearchDialog.tsx`
- `src/components/shortcuts/KeyboardShortcutsDialog.tsx`
- `src/hooks/useKeyboardShortcuts.ts`
- `src/hooks/usePresence.ts`
- `src/hooks/useOnboardingTour.ts`
- `src/components/chat/MessageReactions.tsx`
- `src/components/documentos/DocumentComments.tsx`
- `src/pages/admin/Templates.tsx`
- `src/pages/admin/AuditLogs.tsx`
- Updates em `AppLayout`, `Sidebar`, `ChatMessages`, `DocumentList`, `Dashboard`.

**Estimativa**: ~25 arquivos novos/editados + 4 migrations. Vou entregar uma fase por turno para você validar antes da próxima.

---

## Pergunta antes de começar
Posso seguir essa ordem (F1 → F4) entregando uma fase por turno, ou prefere outra prioridade? Se quiser, começo já pela Fase 1 agora.
