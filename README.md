# DECK 03 — Financeiro

Sistema de controle financeiro gerencial do DECK 03. **Fase 1 — Fundação do sistema**
(fundação, autenticação, permissões, RLS inicial, layout).

Este projeto foi gerado localmente. Você mesmo vai criar o repositório no GitHub,
o projeto no Supabase e conectar na Vercel, seguindo o passo a passo abaixo.

---

## 1. Pré-requisitos

- [Node.js](https://nodejs.org) 18 ou superior
- Uma conta no [Supabase](https://supabase.com)
- Uma conta no [GitHub](https://github.com)
- Uma conta na [Vercel](https://vercel.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, mas recomendado para rodar as migrations)

---

## 2. Criar o projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e clique em **New project**.
2. Escolha um nome (sugestão: `deck03-financeiro`), uma senha forte para o banco e a região mais próxima (ex.: São Paulo/`sa-east-1`, se disponível).
3. Aguarde a criação do projeto (leva 1–2 minutos).
4. Em **Project Settings → API**, copie:
   - **Project URL** → vai para `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → vai para `SUPABASE_SERVICE_ROLE_KEY` (⚠️ nunca exponha esta chave no frontend nem a coloque em repositórios públicos)

---

## 3. Rodar as migrations e o seed

Você tem duas opções.

### Opção A — pelo painel do Supabase (mais simples)

1. No painel do Supabase, vá em **SQL Editor**.
2. Rode, **nesta ordem**, colando o conteúdo de cada arquivo em uma nova query e clicando **Run**:
   1. `supabase/migrations/0001_fundacao.sql`
   2. `supabase/seed.sql`
   3. `supabase/migrations/0002_cadastros_financeiros.sql` (Fase 2)
   4. `supabase/seed_fase2.sql` (Fase 2 — plano de contas sugerido, centros de custo, contas C6, contrapartes dos agregadores e formas de pagamento)
   5. `supabase/migrations/0003_lancamentos_basicos.sql` (Fase 3 — contas a pagar/receber, liquidações, anexos)
   6. `supabase/migrations/0004_saldos_transferencias_fluxo.sql` (Fase 4 — saldos calculados, transferências, fluxo de caixa realizado)
   7. `supabase/migrations/0005_lancamentos_avancados.sql` (Fase 5 — pagamento/recebimento parcial, estorno, parcelamento, recorrência)
   8. `supabase/migrations/0006_ofx_conciliacao.sql` (Fase 9 — importação OFX e conciliação bancária)
   9. `supabase/migrations/0007_recibos_aluguel.sql` (Fase 10 — recibos de aluguel)
   10. `supabase/migrations/0008_relatorios_automaticos.sql` (Fase 11 — relatórios automáticos)
   11. `supabase/migrations/0009_exportacoes_auditoria_acabamento.sql` (Fase 12 — permissões restantes, imutabilidade dos logs de auditoria)

### Opção B — pela Supabase CLI (recomendado a partir de várias migrations)

```bash
# instalar a CLI (se ainda não tiver)
npm install -g supabase

# autenticar
supabase login

# vincular este projeto local ao projeto remoto do Supabase
supabase link --project-ref <SEU_PROJECT_REF>

# aplicar as migrations (0001 e 0002)
supabase db push

# rodar os seeds
supabase db execute -f supabase/seed.sql
supabase db execute -f supabase/seed_fase2.sql
```

> O `<SEU_PROJECT_REF>` fica em **Project Settings → General → Reference ID**.

---

## 4. Criar o primeiro administrador

As migrations e o seed criam a organização **DECK 03**, os papéis (`admin`, `operador`) e o
catálogo de permissões — mas **não criam usuários**, pois isso deve ser feito via Supabase Auth.

1. No painel do Supabase, vá em **Authentication → Users → Add user → Create new user**.
2. Informe o e-mail e a senha do administrador. Marque **Auto Confirm User** para não depender de confirmação por e-mail nesta etapa inicial.
3. Copie o **User UID** gerado.
4. Volte ao **SQL Editor** e rode (substituindo os valores):

```sql
insert into profiles (id, organization_id, full_name, email, role_key, is_active)
values (
  '<USER_UID_COPIADO>',
  '00000000-0000-0000-0000-000000000001', -- organização DECK 03 criada pelo seed
  'Seu Nome',
  'seu-email@exemplo.com',
  'admin',
  true
);
```

5. Repita o processo para criar um usuário **operador** (use `role_key = 'operador'`), se quiser testar as permissões restritas.

---

## 5. Rodar localmente

```bash
# instalar dependências
npm install

# copiar o exemplo de variáveis de ambiente
cp .env.example .env.local
```

Edite `.env.local` com os valores copiados no passo 2:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) e entre com o e-mail/senha do administrador criado no passo 4.

Para rodar os testes automatizados:

```bash
npm test
```

---

## 6. Criar o repositório no GitHub

```bash
cd deck03-financeiro
git init
git add .
git commit -m "Fase 1: fundação do sistema"
```

1. Crie um repositório vazio no GitHub (sem README, sem .gitignore — já temos um).
2. Conecte e envie:

```bash
git remote add origin https://github.com/<seu-usuario>/deck03-financeiro.git
git branch -M main
git push -u origin main
```

---

## 7. Deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório recém-criado no GitHub.
2. Em **Environment Variables**, adicione as mesmas três variáveis do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → use a URL final do seu projeto na Vercel (ex.: `https://deck03-financeiro.vercel.app`); você pode ajustar depois do primeiro deploy.
3. Clique em **Deploy**.
4. Depois do primeiro deploy, se o valor de `NEXT_PUBLIC_APP_URL` mudou, atualize a variável de ambiente na Vercel e faça um novo deploy (**Redeploy**).
5. No painel do Supabase, em **Authentication → URL Configuration**, adicione a URL da Vercel em **Site URL** e em **Redirect URLs** (necessário para o fluxo de recuperação de senha funcionar em produção).

---

## 8. O que foi entregue nesta fase

### Funcionalidades implementadas
- Autenticação (login, recuperação de senha, definição de nova senha)
- Perfis de usuário (Administrador / Operador)
- Estrutura inicial de permissões granulares (papel + overrides por usuário)
- Proteção de rotas via middleware + checagem em Server Components
- Layout principal com menu lateral (itens das fases futuras aparecem desabilitados)
- Tela de configurações básicas da organização (somente leitura para operador, editável para administrador)

### Telas criadas
- `/login`
- `/recuperar-senha`
- `/atualizar-senha`
- `/dashboard` (placeholder da Fase 1)
- `/configuracoes`

### Banco de dados
**Migration:** `supabase/migrations/0001_fundacao.sql`

**Tabelas criadas:** `organizations`, `organization_settings`, `profiles`, `roles`,
`permissions`, `role_permissions`, `user_permissions`, `audit_logs`

**Funções criadas:** `auth_organization_id()`, `auth_role_key()`, `has_permission(permission_key)`,
`set_updated_at()` (trigger)

**Índices:** `organization_id` em `profiles`; `organization_id`/`entity`/`created_at` em `audit_logs`

**Seed:** `supabase/seed.sql` — organização DECK 03, papéis, catálogo de permissões, permissões
padrão do operador

**Políticas de RLS criadas:** isolamento por `organization_id` em todas as tabelas; `profiles`
editável pelo próprio usuário ou por administrador da mesma organização; `role_permissions` e
`user_permissions` só editáveis por administrador; `audit_logs` legível apenas por quem tem a
permissão `visualizar_logs`.

### Variáveis de ambiente adicionadas
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`

### Dependências principais
`next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `tailwindcss`, `vitest`
— todas de uso amplamente consolidado; nenhuma dependência extra além do necessário para
autenticação, validação e estilo.

---

## 9. Como testar (roteiro)

1. Rode `npm install`, configure `.env.local` e rode `npm run dev`.
2. Acesse `http://localhost:3000` sem estar logado → deve redirecionar para `/login`.
3. Tente acessar `http://localhost:3000/dashboard` diretamente sem login → deve redirecionar para `/login`.
4. Entre com o e-mail/senha do administrador criado no passo 4 → deve cair no `/dashboard` e mostrar seu nome e papel.
5. Acesse `/configuracoes` como administrador → deve conseguir editar e salvar.
6. Saia (**Sair**) e entre com o usuário operador (se criado) → acesse `/configuracoes` → os campos devem aparecer desabilitados (sem a permissão `alterar_configuracoes`).
7. Em `/login`, clique em **Esqueci minha senha**, informe um e-mail cadastrado → deve mostrar mensagem de confirmação genérica (não revela se o e-mail existe).
8. Rode `npm test` → os 9 testes de validação devem passar.
9. Rode `npm run build` → o build deve terminar sem erros.

---

## 10. Critérios de aceite

✅ Administrador consegue entrar
✅ Operador consegue entrar
✅ Usuário não autenticado não acessa áreas privadas
✅ Operador não altera configurações sem a permissão correspondente (bloqueado no backend via RLS + checagem na Server Action, não apenas escondido na interface)
✅ Dados ficam isolados por organização (toda política de RLS filtra por `organization_id`)
✅ Sistema funciona localmente
✅ Sistema pronto para funcionar na Vercel (build de produção testado localmente sem erros)

---

## 11. Pendências / limitações conhecidas desta fase

- O menu lateral já lista os itens das fases futuras (desabilitados) para dar visibilidade do roadmap, mas nenhuma dessas telas existe ainda.
- Os tipos TypeScript do banco (`lib/types/database.ts`) foram escritos manualmente para a Fase 1. A partir da Fase 2, recomenda-se gerar os tipos reais com `supabase gen types typescript` e substituir este arquivo.
- Não há testes end-to-end (Playwright) ainda — apenas testes unitários de validação. Testes end-to-end entram conforme lançamentos financeiros existirem (Fase 3 em diante).
- Confirmação de e-mail está desabilitada na criação manual do primeiro administrador (`Auto Confirm User`) para simplificar o setup inicial; revisar esse fluxo antes de convidar mais usuários.

## 12. Próxima fase sugerida

**Fase 2 — Cadastros financeiros**: famílias, categorias, subcategorias, centros de custo,
contas bancárias, contrapartes, formas de pagamento e configurações dos dados do DECK 03.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 2 — Cadastros financeiros

## O que foi entregue

### Funcionalidades implementadas
- Plano de contas (Famílias → Categorias → Subcategorias), com definição de comportamento
  na DRE e no fluxo de caixa por categoria
- Centros de custo (com centro de custo padrão)
- Contas bancárias, com separação clara entre contas empresariais e pessoais
- Contrapartes (com múltiplos tipos por cadastro: locatário, fornecedor, agregador, sócio, etc.)
- Formas de pagamento
- Inativação (em vez de exclusão definitiva) em todos os cadastros

### Telas criadas
- `/cadastros/plano-de-contas`
- `/cadastros/centros-de-custo`
- `/cadastros/contas-bancarias`
- `/cadastros/contrapartes`
- `/cadastros/formas-pagamento`

### Banco de dados
**Migration:** `supabase/migrations/0002_cadastros_financeiros.sql`
**Seed:** `supabase/seed_fase2.sql`

**Tabelas criadas:** `chart_account_families`, `chart_account_categories`,
`chart_account_subcategories`, `cost_centers`, `bank_accounts`, `counterparties`,
`payment_methods`

**Novas permissões:** `alterar_centros_de_custo`, `alterar_formas_pagamento`
(as demais — `alterar_plano_de_contas`, `alterar_contas_bancarias`, `criar_contrapartes`,
`editar_contrapartes` — já existiam desde a Fase 1)

**Políticas de RLS:** leitura liberada para qualquer usuário autenticado da mesma organização;
escrita exige a permissão granular correspondente; contas bancárias com `ownership = 'pessoa_fisica'`
só aparecem para quem tem a permissão `visualizar_contas_pessoais`.

### Decisões tomadas nesta fase
- **Sem exclusão definitiva**: todos os cadastros usam inativação (ativo/inativo). Evita o
  problema de excluir um cadastro que já tenha lançamentos vinculados (o sistema ainda não
  tem lançamentos — essa regra já vem pronta para quando a Fase 3 chegar).
- **Comportamento de DRE/fluxo de caixa vive na Categoria**, não na Família nem na
  Subcategoria. A família só agrupa; a subcategoria herda o comportamento da categoria-mãe.
  Isso evita a inconsistência entre níveis que o escopo original proíbe (seção 39).
- **Tipos de contraparte como array** (`text[]`) em vez de tabela de junção separada — mais
  simples de administrar, mantendo a regra de que uma contraparte pode ter mais de um tipo.

## Como testar

1. Rode a migration e o seed da Fase 2 (seção 3 acima) e depois `npm run build` / `npm test`
   localmente (ou apenas acompanhe o deploy automático na Vercel).
2. Como administrador, acesse **Plano de contas** — deve aparecer a estrutura sugerida
   (Receitas operacionais, Despesas, Investimentos, Movimentações de sócios, etc.) já populada
   pelo seed.
3. Crie uma nova família, depois uma categoria vinculada a ela, depois uma subcategoria — confira
   que aparecem na tabela correspondente.
4. Em **Contas bancárias**, confirme que "C6 – DECK" aparece em "Contas empresariais" e "C6 –
   Pessoa Física" aparece em "Contas pessoais" (separados).
5. Como operador (sem a permissão `visualizar_contas_pessoais`), confirme que a seção de contas
   pessoais nem aparece na tela.
6. Em **Contrapartes**, confirme que Wellhub, TotalPass e ClassPass já aparecem cadastrados
   como "Agregador".
7. Clique em "Inativar" em qualquer cadastro e confirme que o status muda para "Inativo" sem
   removê-lo da lista.

## Critérios de aceite

✅ Administrador consegue criar, editar (via inativação/reativação) e inativar cadastros
✅ Operador respeita as permissões configuradas (RLS + checagem em Server Action)
✅ É possível cadastrar C6 – DECK
✅ É possível cadastrar C6 – Pessoa Física
✅ Contas empresariais e pessoais ficam separadas na tela
✅ Categorias permitem definir o comportamento na DRE
✅ Categorias permitem definir o comportamento no fluxo de caixa

## Pendências desta fase

- Edição de campos existentes (além de ativar/inativar) ainda não tem tela própria — para
  corrigir um cadastro, é necessário inativar e criar novamente por enquanto. Uma tela de edição
  completa pode ser adicionada quando fizer sentido, sem bloquear o restante do sistema.
- Reordenação manual (arrastar e soltar) do plano de contas e centros de custo não foi implementada;
  a ordem exibida segue `display_order` definido no seed.
- Dados bancários da contraparte (campo `bank_details`) existem no banco mas ainda não têm campo
  no formulário — serão usados a partir da Fase 10 (recibos).

## Próxima fase sugerida

**Fase 3 — Lançamentos financeiros básicos**: conta a pagar, conta a receber, receita já
recebida, despesa já paga, busca, filtros básicos, anexos, pagamento e recebimento integrais,
cancelamento.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 3 — Lançamentos financeiros básicos

## O que foi entregue

### Funcionalidades implementadas
- Criação de conta a pagar e conta a receber, com opção de marcar como já paga/recebida
  no próprio momento da criação
- Pagamento e recebimento integral (liquidação) de lançamentos em aberto
- Cancelamento de lançamentos (somente antes de qualquer liquidação)
- Busca por descrição e filtro por status
- Anexos (upload, listagem e download via link assinado, arquivo guardado em bucket privado)
- Histórico de liquidações por lançamento
- Totalizadores (total em aberto / total pago ou recebido) nas listas

### Telas criadas
- `/contas-a-pagar` (lista) e `/contas-a-pagar/nova` e `/contas-a-pagar/[id]` (detalhe)
- `/contas-a-receber` (lista) e `/contas-a-receber/nova` e `/contas-a-receber/[id]` (detalhe)

### Banco de dados
**Migration:** `supabase/migrations/0003_lancamentos_basicos.sql` (sem seed nesta fase)

**Tabelas criadas:** `financial_entries`, `financial_settlements`, `attachments`

**Funções SQL criadas** (centralizam as regras financeiras, usadas por todas as telas):
- `entry_remaining_balance(entry_id)` — saldo restante de um lançamento
- `bank_account_balance(account_id)` — saldo atual de uma conta bancária
- `settle_entry(...)` — liquida um lançamento (valor integral), atualiza status, registra auditoria
- `cancel_entry(...)` — cancela um lançamento (somente antes de liquidação), registra auditoria

**Storage:** bucket privado `attachments`, com política de acesso baseada no caminho
`{organization_id}/{entry_id}/{arquivo}` — nenhuma organização enxerga arquivo de outra.

**Permissões usadas:** todas já existiam desde a Fase 1 (`criar_lancamentos`,
`editar_lancamentos_em_aberto`, `cancelar_lancamentos`, `registrar_pagamentos`,
`registrar_recebimentos`, `anexar_documentos`, `visualizar_lancamentos`) — nenhuma nova
permissão foi necessária.

### Decisões tomadas nesta fase
- **Liquidação sempre pelo valor integral** nesta fase — a estrutura de `financial_settlements`
  já suporta múltiplas liquidações parciais por lançamento, mas a interface só permite uma
  liquidação de valor cheio. Pagamento/recebimento parcial entram na Fase 5.
- **Cancelamento só antes de liquidação.** Um lançamento já pago/recebido não pode ser
  cancelado pela interface — precisa de estorno, que é uma funcionalidade da Fase 5. Isso evita
  que um cancelamento indevido derrube o saldo de uma conta sem deixar rastro.
- **Regras de cálculo em funções SQL** (`settle_entry`, `cancel_entry`, `entry_remaining_balance`,
  `bank_account_balance`) em vez de replicadas em cada tela — para não haver divergência de
  valores entre dashboard, listagens e futuros relatórios (exigência da seção 39 do escopo).
- **Edição de lançamento em aberto** (a permissão `editar_lancamentos_em_aberto` já existe e é
  checada na política de RLS) ainda não tem tela própria nesta fase — fica para quando a
  necessidade aparecer, sem bloquear o restante.

## Como testar

1. Rode a migration `0003_lancamentos_basicos.sql` (seção 3 acima). Não há seed nesta fase.
2. Acesse **Contas a pagar → Nova conta a pagar**. Preencha descrição, valor, vencimento e
   categoria (obrigatórios) e salve sem marcar "já foi pago" — deve aparecer na lista como
   "Em aberto".
3. Clique no lançamento criado, escolha uma conta bancária e registre o pagamento — o status
   deve mudar para "Pago" e uma liquidação deve aparecer no histórico.
4. Crie uma nova conta a pagar marcando "já foi pago" — confira que ela já nasce com status
   "Pago" e a liquidação já aparece no histórico, sem precisar de uma ação extra.
5. Repita os passos 2 a 4 em **Contas a receber**, conferindo que o status vira "Recebido".
6. Crie um lançamento em aberto e clique em **Cancelar lançamento** — confirme que o status
   muda para "Cancelado". Tente cancelar um lançamento já pago — o botão de cancelar não deve
   aparecer.
7. Abra um lançamento, anexe um PDF ou imagem pequena, confirme que aparece na lista de anexos
   e que o botão "Baixar" funciona.
8. Use a busca por descrição e o filtro por status nas listas — confirme que os resultados
   batem com o que foi digitado/selecionado.
9. Como operador (sem a permissão `cancelar_lancamentos`, que não é concedida por padrão),
   confirme que a seção de cancelamento não aparece na tela de detalhe.

## Critérios de aceite

✅ Operador consegue criar conta a pagar
✅ Operador consegue criar conta a receber
✅ Operador consegue registrar pagamento
✅ Operador consegue registrar recebimento
✅ O saldo da conta é atualizado corretamente (via `bank_account_balance`, considerando apenas
   liquidações válidas)
✅ Lançamentos cancelados não alteram o saldo (cancelamento só é permitido antes de qualquer
   liquidação)
✅ Permissões são respeitadas no backend (RLS + checagem dentro das funções SQL)

## Pendências desta fase

- Não há tela dedicada para exibir o saldo calculado da conta bancária (`bank_account_balance`)
  ainda — isso será natural na Fase 4 (Saldos, transferências e fluxo realizado).
- "Vencido" não é destacado nas listas ainda — o cálculo de vencido (data de vencimento no
  passado + saldo em aberto) é responsabilidade da Fase 5, conforme planejado desde a Fase 0.
- Ações em lote, modelos de lançamento e edição de lançamentos em aberto ficam para quando
  fizerem falta — não bloqueiam o uso básico.
- O upload de anexos aceita PDF, PNG, JPG e WEBP até 10 MB — outros formatos foram deixados de
  fora deliberadamente para reduzir superfície de risco.

## Próxima fase sugerida

**Fase 4 — Saldos, transferências e fluxo de caixa realizado**: saldo calculado por conta,
extrato, fluxo de caixa realizado (entradas/saídas por período), transferências internas e
entre conta empresarial/pessoal, conferência manual de saldo.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 4 — Saldos, transferências e fluxo de caixa realizado

## O que foi entregue

### Funcionalidades implementadas
- Saldo calculado por conta (inicial + liquidações + transferências), exibido na lista de
  contas bancárias e na tela de detalhe de cada conta
- Extrato por conta: histórico cronológico de pagamentos, recebimentos e transferências, com
  saldo corrente
- Transferências internas (entre duas contas DECK 03) e entre conta empresarial/pessoal — estas
  últimas exigem uma classificação específica (nunca "transferência interna")
- Fluxo de caixa realizado por período: saldo inicial, entradas, saídas, saldo final,
  composição das entradas e das saídas por categoria
- Filtro para incluir ou não contas pessoais no fluxo de caixa (fora por padrão)
- Conferência manual de saldo bancário (compara saldo calculado com saldo informado pelo banco,
  sem ajuste automático)

### Telas criadas
- `/transferencias` (lista + criação)
- `/cadastros/contas-bancarias/[id]` (detalhe da conta: saldo atual, extrato, conferência)
- `/fluxo-de-caixa/realizado`

### Telas alteradas
- `/cadastros/contas-bancarias`: agora mostra saldo atual calculado (em vez de só o saldo
  inicial) e linka para o detalhe/extrato de cada conta

### Banco de dados
**Migration:** `supabase/migrations/0004_saldos_transferencias_fluxo.sql`

**Tabelas criadas:** `transfers`, `bank_balance_snapshots`

**Funções SQL criadas/atualizadas:**
- `bank_account_balance(account_id)` — **atualizada** para incluir transferências, além das
  liquidações já usadas na Fase 3
- `bank_account_balance_at(account_id, data)` — saldo da conta em uma data específica (usado
  pelo fluxo de caixa realizado; será reaproveitado pela Fase 6, fluxo projetado)
- `create_transfer(...)` — cria a transferência de forma atômica, valida permissão e a regra de
  classificação, registra auditoria
- Trigger `validate_transfer()` — impede que uma transferência entre contas de titularidades
  diferentes (empresarial ↔ pessoal) seja lançada como "transferência interna comum"

**Permissões usadas:** `criar_transferencias` e `visualizar_saldos` já existiam desde a Fase 1;
a conferência de saldo reaproveita a permissão `alterar_contas_bancarias` (decisão abaixo).

### Decisões tomadas nesta fase
- **Transferências nunca passam por `financial_entries`** — vivem em uma tabela própria
  (`transfers`), então estruturalmente não têm como aparecer como receita ou despesa, nem
  entrar na composição do fluxo de caixa operacional. Isso atende a exigência da seção 16 do
  escopo sem precisar de nenhuma regra "escondendo" a transferência em telas específicas.
- **"Não alteram o caixa consolidado"** foi implementado deixando o saldo de cada conta refletir
  a transferência normalmente (a conta de origem cai, a de destino sobe) — quando as duas contas
  estão dentro do mesmo conjunto considerado (ex.: duas contas empresariais no fluxo de caixa),
  o efeito líquido soma zero automaticamente, sem precisar de exceção manual no cálculo.
- **Conferência de saldo reaproveita a permissão `alterar_contas_bancarias`** em vez de criar
  uma permissão nova — é uma ação administrativa sobre a conta bancária, então fez sentido
  usar a mesma permissão já existente em vez de aumentar o catálogo sem necessidade.
- **Sem edição/estorno de transferência nesta fase** — uma transferência lançada errada por
  enquanto precisa ser compensada com uma transferência reversa manual. Edição/estorno de
  transferência pode ser adicionado numa fase futura se a necessidade aparecer.

## Como testar

1. Rode a migration `0004_saldos_transferencias_fluxo.sql` (seção 3 acima).
2. Em **Contas bancárias**, confirme que agora aparece "Saldo atual" (não mais só o saldo
   inicial) — se você já pagou/recebeu algo na Fase 3, o valor deve refletir isso.
3. Clique no nome de uma conta para abrir o detalhe — confira o extrato com as movimentações
   que você já tinha lançado nas fases anteriores.
4. Em **Transferências**, registre uma transferência entre "C6 – DECK" e "C6 – Pessoa Física"
   tentando deixar a classificação como "Transferência interna" — o sistema deve rejeitar e
   pedir uma classificação específica (ex.: "Retirada de sócio").
5. Repita a transferência escolhendo "Retirada de sócio" — deve ser aceita. Confira que o saldo
   de cada uma das duas contas mudou corretamente no extrato.
6. Crie uma transferência entre duas contas empresariais (transferência interna) e confirme, no
   **Fluxo de caixa realizado**, que ela não aparece nem em "Entradas" nem em "Saídas".
7. Em **Fluxo de caixa realizado**, ajuste o período e confirme que os totais mudam de acordo. 
8. Como usuário sem a permissão `visualizar_contas_pessoais`, confirme que a opção "Incluir
   contas pessoais" nem aparece no filtro do fluxo de caixa.
9. Na tela de detalhe de uma conta, registre uma conferência de saldo com um valor diferente
   do saldo calculado — confirme que a diferença aparece destacada na tabela de conferências.

## Critérios de aceite

✅ Transferência não aparece como receita ou despesa (nunca passa por `financial_entries`)
✅ Transferência não altera o caixa consolidado (efeito líquido zero quando ambas as contas
   estão no mesmo conjunto considerado)
✅ Transferência altera corretamente cada conta (saldo de origem cai, saldo de destino sobe)
✅ Saldo empresarial não mistura valores pessoais (contas pessoais fora por padrão no fluxo de
   caixa e nos totais; nunca somadas automaticamente)
✅ Fluxo realizado considera apenas valores liquidados (usa `financial_settlements`, nunca o
   valor original do lançamento)
✅ Diferenças de saldo ficam registradas (conferência manual, sem ajuste automático/silencioso)

## Pendências desta fase

- Não há paginação no extrato da conta — para o volume de uso do DECK 03 (uma operação,
  poucas contas) isso não deve ser um problema tão cedo, mas pode ser revisitado se a lista
  crescer muito.
- Fluxo de caixa realizado não tem exportação (CSV/Excel/PDF) ainda — isso é Fase 12
  (Exportações), conforme planejado desde o início.
- Transferências não têm edição nem estorno nesta fase (ver decisão acima).

## Próxima fase sugerida

**Fase 5 — Contas a pagar e receber avançadas**: pagamento e recebimento parcial, juros,
multas, descontos, acréscimos, parcelamento, recorrência, agendamento, estorno, identificação
de vencidos, ações em lote, modelos de lançamentos.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 5 — Contas a pagar e receber avançadas

## O que foi entregue

### Funcionalidades implementadas
- Pagamento e recebimento **parcial**, com opção de incluir juros, multa, desconto e acréscimo
  em cada liquidação
- **Estorno** de uma liquidação específica (o lançamento volta a "em aberto" ou "parcialmente
  liquidado", conforme o que restar)
- **Parcelamento**: cria várias parcelas vinculadas de uma vez, com ajuste de arredondamento
  concentrado na última parcela e escolha de reconhecimento gerencial (competência original,
  por parcela, ou conforme pagamento)
- **Recorrência**: cria uma regra e já gera as ocorrências dos próximos 12 meses; permite gerar
  mais ocorrências sob demanda e cancelar por escopo (só uma ocorrência, esta e as futuras, ou
  toda a recorrência)
- **Identificação de vencidos**: lançamentos em aberto (ou parcialmente liquidados) com
  vencimento no passado aparecem como "Vencido" em toda a interface — calculado na hora, nunca
  armazenado
- Novo filtro "Vencido" e indicador "Total vencido" nas listas de contas a pagar/receber

### Telas criadas
- `/recorrencias` (lista de regras, geração de ocorrências, cancelamento por escopo)

### Telas alteradas
- `/contas-a-pagar/nova` e `/contas-a-receber/nova`: agora têm três abas — Lançamento único,
  Parcelado e Recorrente
- Detalhe do lançamento (`/contas-a-pagar/[id]` e `/contas-a-receber/[id]`): liquidação parcial
  com encargos, estorno por liquidação, saldo restante, informações de parcelamento (com link
  para as parcelas irmãs) e de recorrência

### Banco de dados
**Migration:** `supabase/migrations/0005_lancamentos_avancados.sql`

**Tabelas criadas:** `installment_groups`, `recurring_rules`
**Colunas adicionadas:** `financial_settlements.addition`; `financial_entries.installment_group_id`,
`installment_number`, `installment_total`, `recurring_rule_id`

**Funções SQL criadas/atualizadas:**
- `entry_remaining_balance(entry_id)` — **atualizada** para considerar juros/multa/acréscimo
  (aumentam o saldo em aberto) e desconto (reduz sem mover caixa)
- `settle_entry(...)` — **reescrita** para aceitar valor parcial e encargos; escolhe
  automaticamente entre "pago"/"parcialmente pago" (ou os equivalentes de receita) conforme o
  que restar
- `reverse_settlement(...)` — estorna uma liquidação e recalcula o status do lançamento
- `create_installment_plan(...)` — cria o grupo de parcelas e as N parcelas de uma vez, em uma
  única transação (nunca fica parcelamento pela metade)
- `generate_recurring_instances(...)` — gera ocorrências futuras (até 12 meses), sempre
  continuando da última já gerada — nunca duplica
- `cancel_recurring_occurrences(...)` — cancela por escopo (uma / futuras / toda)

**Permissões usadas:** todas já existiam desde a Fase 1 (`pagamentos_parciais`,
`recebimentos_parciais`, `criar_lancamentos`, `cancelar_lancamentos`) — nenhuma nova permissão
foi criada.

### Decisões tomadas nesta fase
- **Estorno reaproveita a permissão `cancelar_lancamentos`** em vez de criar uma permissão
  nova — como só o administrador tem essa permissão por padrão, o comportamento already reflete
  a intenção do escopo original (seção 7.1: "Estornar lançamentos" é uma capacidade do
  administrador).
- **Recorrência gera no máximo 12 meses de cada vez**, sempre sob comando explícito (ao criar a
  regra, e depois manualmente pela tela de Recorrências) — evita gerar milhares de lançamentos
  futuros desnecessários, como o próprio escopo pede na seção 15. Não há agendamento automático
  (cron) rodando isso sozinho ainda; isso fica mais natural quando a Fase 11 trouxer a
  infraestrutura de rotinas agendadas para os relatórios automáticos.
- **Editar um lançamento gerado por recorrência individualmente não está disponível nesta
  fase** — o controle de escopo foi implementado para *cancelamento* (uma / futuras / toda),
  que é a operação mais crítica de acertar; edição de campos (valor, categoria, etc.) por
  ocorrência pode ser adicionada depois sem exigir mudança de schema.
- **Ações em lote e modelos de lançamento foram deixados de fora desta fase** — são melhorias
  de produtividade operacional que não afetam a integridade dos números, e a fase já reunia
  parcelamento, recorrência, liquidação parcial e estorno de uma vez.
- **"Vencido" continua sendo calculado, nunca armazenado** (decisão original da Fase 0),
  centralizado em uma única função TypeScript (`getEffectiveStatus`) usada por toda a interface,
  para nunca haver divergência entre telas sobre o que conta como vencido.

## Como testar

1. Rode a migration `0005_lancamentos_avancados.sql` (seção 3 acima).
2. Abra uma conta a pagar em aberto e registre um **pagamento parcial** (marque a caixinha
   "Liquidar apenas parte do valor") — confirme que o status muda para "Parcialmente pago" e
   que o saldo restante exibido está correto.
3. Registre o restante — o status deve virar "Pago".
4. Em uma nova conta a pagar, registre o pagamento incluindo **juros e multa** — confirme que
   o valor que sai da conta bancária (no extrato, Fase 4) é maior que o valor original do
   lançamento, refletindo os encargos.
5. No histórico de liquidações de um lançamento pago, clique em **Estornar** em uma liquidação —
   confirme que o status do lançamento volta para "Em aberto" (ou "Parcialmente pago", se havia
   mais de uma liquidação).
6. Crie uma **conta a pagar parcelada** em 3x — confirme que aparecem 3 lançamentos separados,
   cada um com "Parcela X de 3" e links entre eles.
7. Crie uma **recorrência mensal** — confirme que várias ocorrências futuras já aparecem em
   **Contas a pagar** (ou a receber) imediatamente após criar.
8. Na tela de **Recorrências**, cancele "esta e as próximas" a partir de uma ocorrência
   específica — confirme que só as ocorrências anteriores àquela data continuam em aberto.
9. Crie um lançamento com vencimento no passado e deixe em aberto — confirme que ele aparece
   como "Vencido" na lista e no filtro "Total vencido".

## Critérios de aceite

✅ Saldo restante é calculado corretamente (considera principal, juros, multa, desconto e
   acréscimo de todas as liquidações válidas)
✅ Estorno recompõe corretamente os valores (a liquidação estornada sai do cálculo, e o status
   do lançamento é recalculado a partir do que sobrou)
✅ Parcelas não são duplicadas (todas as parcelas de um plano são criadas em uma única
   transação/chamada)
✅ Recorrências são geradas corretamente (sempre continuam da última ocorrência já existente,
   nunca reiniciam do começo)
✅ Alterações de recorrência respeitam o escopo selecionado (cancelamento por uma ocorrência,
   futuras, ou toda a regra)

## Pendências desta fase

- Ações em lote (selecionar vários lançamentos e agir de uma vez) — deixadas de fora,
  conforme decisão acima.
- Modelos de lançamento (salvar um lançamento como modelo reutilizável) — deixados de fora,
  conforme decisão acima.
- Edição de campos (valor, categoria, etc.) de uma ocorrência recorrente já gerada — só
  cancelamento está disponível nesta fase.
- Sem geração automática/agendada de novas ocorrências de recorrência — precisa visitar a tela
  de Recorrências e clicar em "Gerar próximas ocorrências" de tempos em tempos, até a Fase 11
  trazer rotinas agendadas.

## Próxima fase sugerida

**Fase 6 — Fluxo de caixa projetado**: projeção de caixa considerando contas a receber/pagar
em aberto, agendadas, vencidas e recorrências futuras; projeções de 7/15/30/60/90 dias; menor
saldo projetado e data; drill-down até os lançamentos de origem.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 6 — Fluxo de caixa projetado

## O que foi entregue

### Funcionalidades implementadas
- Projeção de caixa a partir do saldo atual (já calculado desde a Fase 4) somado ao saldo
  restante de todos os lançamentos em aberto, agendados, parcialmente liquidados e vencidos
- Horizontes de 7, 15, 30, 60 ou 90 dias, ou uma data personalizada
- Menor saldo projetado no período e a data em que ocorre
- Contagem de dias com saldo projetado negativo
- Entradas e saídas previstas, separadas
- Lançamentos que mais impactam o caixa (maiores valores restantes), cada um linkando direto
  para o lançamento de origem
- Evolução do saldo projetado dia a dia (mostrado como tabela, não gráfico — ver decisão abaixo)
- Filtro por conta específica e opção de incluir contas pessoais (fora por padrão)

### Telas alteradas
- `/fluxo-de-caixa/projetado`: deixou de ser um placeholder desabilitado no menu e ganhou a
  implementação completa

### Banco de dados
**Nenhuma migration nova nesta fase.** Toda a projeção foi construída reaproveitando o que já
existia: a função `bank_account_balance` (Fase 4) para o saldo atual, e a mesma fórmula de
saldo restante da Fase 5 (`entry_remaining_balance`), replicada em TypeScript
(`lib/finance/remaining.ts`) para poder ser calculada em lote para várias dezenas de
lançamentos de uma vez, sem uma chamada ao banco por lançamento.

### Decisões tomadas nesta fase
- **A fórmula de saldo restante foi replicada em TypeScript**, não chamada via RPC por
  lançamento — evita um problema de N+1 consultas ao projetar dezenas de lançamentos de uma
  vez. O arquivo `lib/finance/remaining.ts` deixa explícito que espelha a função SQL
  `entry_remaining_balance` e que as duas precisam mudar juntas se a regra mudar no futuro.
- **Lançamentos vencidos são "encostados" em hoje na projeção** — como não sabemos exatamente
  quando um lançamento atrasado será liquidado, ele entra no cálculo já a partir do primeiro
  dia do horizonte, em vez de aparecer na sua data de vencimento original (que já passou).
- **Recorrências futuras não precisaram de tratamento especial**: como a Fase 5 já gera as
  ocorrências futuras como lançamentos normais (`financial_entries` com `origin = 'recorrencia'`),
  elas aparecem automaticamente na projeção junto com qualquer outro lançamento em aberto —
  sem necessidade de uma consulta separada.
- **Evolução do saldo mostrada como tabela, não gráfico de linha.** Não instalamos nenhuma
  biblioteca de gráficos no projeto ainda, e o princípio do escopo é priorizar funcionalidade
  sobre efeito visual — uma tabela com data, movimentação e saldo acumulado é totalmente
  auditável (dá pra conferir cada linha) e comunica a mesma informação. Se mais adiante um
  gráfico for realmente necessário (ex.: Fase 7, dashboard executivo), avaliamos introduzir uma
  biblioteca então.
- **Lançamentos sem conta bancária definida** entram na projeção agregada (todas as contas)
  mas ficam de fora quando o filtro de "conta específica" é usado — like esperado, já que não
  têm como saber a qual conta pertencem antes de serem liquidados.

## Como testar

1. Nenhuma migration nova — não é necessário rodar nada no Supabase para esta fase.
2. Acesse **Fluxo de caixa projetado**. Confirme que "Saldo atual" bate com o saldo mostrado em
   Contas bancárias.
3. Crie (ou use lançamentos já existentes) uma conta a pagar com vencimento daqui a 10 dias e
   uma conta a receber com vencimento daqui a 20 dias, ambas em aberto.
4. No horizonte de "7 dias", confirme que nenhuma das duas aparece na tabela de evolução (estão
   fora da janela). Mude para "30 dias" — as duas devem aparecer, cada uma na data certa.
5. Confirme que o "Saldo projetado" no horizonte de 30 dias é igual ao saldo atual mais a
   receita menos a despesa lançadas.
6. Crie uma despesa grande o suficiente para deixar o saldo projetado negativo em algum
   momento — confirme que "Menor saldo projetado" e "Dias com saldo negativo" refletem isso
   corretamente.
7. Pague parcialmente uma conta a pagar em aberto (Fase 5) — confirme que, na projeção, o valor
   restante considerado é só o saldo que falta, não o valor original.
8. Clique em um lançamento na lista "Lançamentos que mais impactam o caixa" — confirme que abre
   o lançamento de origem.
9. Como usuário sem `visualizar_contas_pessoais`, confirme que a opção "Incluir contas
   pessoais" não aparece no filtro.

## Critérios de aceite

✅ Valores realizados não são duplicados (a projeção parte do saldo atual, que já reflete tudo
   que foi liquidado — só o saldo restante de lançamentos em aberto é somado por cima)
✅ Pagamentos parciais consideram apenas o saldo restante (mesma fórmula da Fase 5, replicada
   em lote)
✅ Filtros alteram corretamente a projeção (horizonte, conta específica, contas pessoais)
✅ Contas pessoais ficam fora por padrão
✅ Valores projetados podem ser rastreados até a origem (cada lançamento na lista de maior
   impacto linka direto para o lançamento correspondente)

## Pendências desta fase

- Sem gráfico de evolução — decisão consciente, ver acima. Pode ser adicionado depois sem
  quebrar nada, já que os dados (`checkpoints`) já estão estruturados para isso.
- A projeção considera todo lançamento em aberto igualmente provável de acontecer na data de
  vencimento — não há um conceito de "probabilidade" ou cenários otimista/pessimista.
- Filtro por família/categoria/centro de custo na projeção não foi incluído (o escopo original
  não exige isso especificamente aqui — esse tipo de recorte já existe no fluxo de caixa
  realizado, Fase 4, e pode ser adicionado aqui do mesmo jeito se fizer falta).

## Próxima fase sugerida

**Fase 7 — Dashboard do CEO**: visão executiva consolidando saldo, caixa projetado, contas a
pagar/receber, maiores entradas/saídas e alertas, priorizando os indicadores de caixa acima de
tudo.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 7 — Dashboard do CEO

## O que foi entregue

### Funcionalidades implementadas
- Dashboard executivo em `/dashboard`, organizado na mesma ordem de prioridade do escopo:
  1. **Alertas** (se houver, aparecem no topo — nunca escondidos)
  2. **Caixa**: saldo empresarial disponível, saldo por conta, saldo pessoal separado, geração
     de caixa no mês, caixa projetado em 7/30/90 dias, menor saldo projetado
  3. **Contas a pagar e a receber**: total em aberto e vencido de cada um
  4. **Maiores entradas e saídas do mês**
  5. **Indicadores secundários**: receita e despesa do mês (com variação percentual vs. mês
     anterior), resultado operacional preliminar, despesas por categoria, receitas por origem
- Todo card com valor é clicável e leva para a tela de origem daquele número (saldo → conta
  bancária, contas vencidas → lista filtrada, caixa projetado → tela de projeção)
- Alertas acionáveis: caixa projetado negativo nos próximos 30 dias, contas vencidas (a pagar e
  a receber), saldo de conta abaixo do mínimo configurado, diferença de conferência de saldo
  ainda não resolvida

### Banco de dados
**Nenhuma migration nova nesta fase.** O dashboard é inteiramente composto por dados já
existentes, consultados através das mesmas funções e regras das fases anteriores.

### Refatoração importante
A lógica de projeção de caixa (antes só dentro da tela de Fluxo de Caixa Projetado) foi extraída
para `lib/finance/projection-query.ts` e agora é usada tanto por aquela tela quanto pelo
dashboard. Isso garante que "caixa projetado em 30 dias" mostre exatamente o mesmo valor nos
dois lugares — sem essa extração, seria fácil as duas implementações divergirem com o tempo.

### Decisões tomadas nesta fase
- **Resultado operacional é "preliminar"** e está rotulado como tal na tela — usa o
  `dre_behavior` das categorias (já existente desde a Fase 2) para separar o que é operacional
  do que não é, mas ainda não é uma DRE completa (isso é a Fase 8). Serve como um indicador
  direcional, não definitivo.
- **Comparação com o mês anterior** é simples (mês atual até hoje vs. mês anterior completo) —
  não é a comparação trimestral rigorosa que o escopo pede na Fase 8; está claramente rotulada
  como indicador secundário.
- **Alertas implementados nesta fase**: caixa projetado negativo, contas vencidas, saldo abaixo
  do mínimo, diferença de conferência não resolvida. Alertas que dependem de funcionalidades
  ainda não construídas (conciliação bancária, importação OFX) ficam para as fases
  correspondentes — não fazia sentido simular um alerta para algo que o sistema ainda não faz.
- **Nenhuma biblioteca de gráficos foi adicionada** — mesma decisão da Fase 6, mantendo
  consistência. O dashboard comunica os números através de cards e listas, não gráficos.

## Como testar

1. Nenhuma migration nova — não precisa rodar nada no Supabase.
2. Acesse o **Dashboard**. Confirme que "Saldo empresarial disponível" bate com a soma das
   contas empresariais em Contas Bancárias.
3. Confirme que "Caixa projetado em 30 dias" é igual ao que aparece em Fluxo de Caixa
   Projetado com o horizonte de 30 dias selecionado.
4. Crie ou deixe um lançamento vencido em aberto — confirme que aparece um alerta vermelho no
   topo do dashboard, e que clicar nele leva para a lista filtrada por "Vencido".
5. Configure um "saldo mínimo desejado" numa conta bancária (Fase 2) maior que o saldo atual —
   confirme que aparece o alerta correspondente.
6. Registre uma conferência de saldo (Fase 4) com diferença — confirme que aparece o alerta de
   diferença não resolvida.
7. Como usuário sem `visualizar_contas_pessoais`, confirme que a seção "Saldo pessoal" não
   aparece.
8. Clique em um item de "Maiores entradas/saídas do mês" — hoje eles não linkam individualmente
   (ver pendências), mas confirme que os valores batem com o Fluxo de Caixa Realizado do mês.

## Critérios de aceite

✅ O CEO entende a posição financeira em poucos minutos (caixa em primeiro lugar, alertas no
   topo, tudo em uma tela)
✅ Os valores correspondem às telas de origem (mesma função de saldo da Fase 4, mesma lógica de
   projeção da Fase 6, extraída para um módulo compartilhado)
✅ Cards relevantes possuem detalhamento (praticamente todo card linka para a tela de origem)
✅ Alertas direcionam para os lançamentos relacionados

## Pendências desta fase

- Os itens de "Maiores entradas/saídas do mês" ainda não linkam individualmente para o
  lançamento — mostram a descrição e o valor, mas sem link direto (diferente dos cards
  principais, que já linkam). Pode ser ajustado numa passada futura sem mudança de schema.
- Alertas de conciliação bancária ("transação não conciliada") e de recorrência esperada não
  criada ficam para quando as funcionalidades correspondentes existirem (Fase 9 e melhorias
  futuras de recorrência).
- Sem opção de personalizar quais indicadores aparecem no dashboard — a ordem e a seleção
  seguem a priorização do escopo original.

## Próxima fase sugerida

**Fase 8 — DRE gerencial e comparação trimestral**: DRE por caixa e por competência, com
drill-down até os lançamentos; comparação trimestral rigorosa (trimestre atual vs. anterior, e
vs. mesmo trimestre do ano anterior).

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 8 — DRE gerencial e comparação trimestral

## O que foi entregue

### Funcionalidades implementadas
- **DRE gerencial** em `/dre`, com alternância entre regime de caixa e regime de competência,
  e período mensal, trimestral ou personalizado
- Estrutura da DRE: Receitas operacionais → Despesas operacionais (agrupadas por família do
  plano de contas) → Resultado operacional gerencial → Receitas/despesas financeiras →
  Resultado gerencial antes de investimentos → Investimentos (separados) → Movimentações de
  sócios e pessoa física (separadas, combinando lançamentos e transferências classificadas)
- **Drill-down**: toda linha da DRE é clicável e leva para a lista dos lançamentos que a
  compõem, em `/dre/detalhe`
- **Comparação trimestral** em `/comparacao-trimestral`: trimestre atual vs. anterior, vs.
  mesmo trimestre do ano anterior, ou dois trimestres escolhidos livremente — com variação em
  R$ e %, indicação de melhora/piora por cor, e as famílias de despesa que mais explicam a
  variação

### Telas criadas
- `/dre`
- `/dre/detalhe`
- `/comparacao-trimestral`

### Telas alteradas
- Dashboard: o card "Resultado operacional preliminar" agora linka para a DRE completa

### Banco de dados
**Nenhuma migration nova nesta fase.** A DRE inteira é composta a partir de campos que já
existiam desde a Fase 2 (`dre_behavior`, `managerial_nature` em cada categoria) e da fórmula de
liquidações da Fase 3/5 — não foi preciso mudar nada no banco.

### Decisões tomadas nesta fase
- **"Deduções gerenciais" (item 2 da estrutura do escopo) não foi implementada** — nenhuma
  categoria de dedução foi configurada até agora. Quando fizer sentido, dá pra adicionar
  reaproveitando o mesmo campo `dre_behavior`, sem mudança de schema.
- **Despesas operacionais são agrupadas por família do plano de contas**, não pelas 5 linhas
  fixas do escopo (Pessoal, Estrutura, Administrativo, Comercial, Outras) — como as famílias
  seedadas na Fase 2 já correspondem quase exatamente a essas categorias (Pessoal e
  prestadores, Estrutura, Administrativo...), o resultado prático é o mesmo, mas com a
  vantagem de refletir automaticamente qualquer família nova que o administrador criar.
- **Movimentações de sócios combinam duas fontes**: lançamentos categorizados com
  `managerial_nature = movimentacao_socios/pessoa_fisica` (raro, mas possível) e
  transferências com essa classificação (o caminho mais comum, construído na Fase 4). A DRE
  mostra as duas fontes juntas na mesma seção, para não haver um "buraco" caso a distribuição
  de lucros tenha sido feita por transferência em vez de lançamento.
- **Comparação trimestral usa sempre regime de caixa** — é o que reflete o que realmente
  aconteceu no caixa da empresa, coerente com a prioridade #1 do escopo. Não há alternância de
  regime nesta tela (diferente da DRE), para manter a comparação simples e direta.
- **"Inadimplência" não entrou na comparação trimestral** — calcular quanto estava vencido no
  final de um trimestre passado exigiria reconstruir o status histórico de cada lançamento
  (hoje só temos o status atual), o que não existe no sistema ainda. Fica documentado como
  limitação; se fizer falta, precisaria de uma tabela de histórico de status.

## Como testar

1. Nenhuma migration nova — não precisa rodar nada no Supabase.
2. Acesse a **DRE gerencial**. No regime de caixa, mês atual, confirme que "Receitas
   operacionais" bate com a soma das receitas do Fluxo de Caixa Realizado (Fase 4) no mesmo
   período.
3. Clique em "Receitas operacionais" — confirme que abre a lista de lançamentos que compõem
   aquele valor, e que a soma da lista bate com o valor mostrado na DRE.
4. Alterne para "Regime de competência" — confirme que os valores mudam (ou permanecem iguais,
   se não houver diferença entre pago e competência no período) e que o rótulo do regime muda
   visivelmente.
5. Crie uma transferência classificada como "Distribuição de lucros" (Fase 4) — confirme que
   ela aparece na seção "Movimentações de sócios" da DRE, e que "Resultado operacional
   gerencial" não muda por causa dela.
6. Mude o período para "Trimestral" — confirme que os valores mudam para refletir os três
   meses do trimestre selecionado.
7. Acesse **Comparação trimestral** — confirme que "Trimestre atual x anterior" mostra os dois
   trimestres corretos para a data de hoje, com variação em R$ e % calculada certinho.
8. Teste "dois trimestres específicos" escolhendo dois trimestres arbitrários.

## Critérios de aceite

✅ Valores podem ser rastreados até os lançamentos (drill-down em toda linha da DRE)
✅ Caixa e competência apresentam diferenças corretamente (fontes de dados distintas —
   liquidações vs. lançamentos por competência)
✅ Comparações mostram variações em reais e percentuais (com indicação visual de melhora/piora)
✅ Não há divergência entre DRE e detalhamento (o drill-down usa exatamente os mesmos critérios
   de classificação — `dre_behavior`, `managerial_nature`, família — usados para montar a DRE)

## Pendências desta fase

- Deduções gerenciais não configuradas (ver decisão acima).
- Inadimplência histórica não entra na comparação trimestral (ver decisão acima).
- Exportação da DRE (PDF/Excel) fica para a Fase 12 (Exportações), como planejado desde o
  início.
- O drill-down agrupa por família via correspondência de nome — funciona bem para o uso normal
  do sistema, mas duas famílias com nomes idênticos (o que a interface de cadastro não impede
  explicitamente) fariam o drill-down misturar as duas. Caso vire um problema real, dá pra
  trocar para agrupar por ID de família em vez de nome.

## Próxima fase sugerida

**Fase 9 — Importação OFX e conciliação**: upload de OFX (inicialmente C6 Bank),
pré-visualização, deduplicação, criação de lançamento a partir da transação bancária,
vinculação com lançamento existente, conciliação manual, desfazer conciliação.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 9 — Importação OFX e conciliação

## O que foi entregue

### Funcionalidades implementadas
- **Importação de OFX** em `/importacao-ofx`: upload do extrato, leitura no navegador (nenhum
  arquivo é enviado a serviços externos), pré-visualização de cada transação antes de importar
- **Deduplicação real**: cada transação é identificada pelo FITID do OFX quando disponível
  (ou por um hash de conta+data+valor+descrição como alternativa); o banco tem um índice único
  que impede duplicidade mesmo que a mesma transação apareça em dois arquivos diferentes
- **Conciliação manual** em `/conciliacao`: para cada transação não conciliada, é possível
  vincular a um lançamento em aberto já existente (com liquidação parcial se o valor não bater
  exatamente, reaproveitando a Fase 5), criar um lançamento novo direto a partir da transação,
  ou ignorar
- **Desfazer conciliação**: reverte a liquidação (reaproveitando o estorno da Fase 5) e volta a
  transação para "não conciliada"
- Histórico de transações conciliadas e ignoradas, com opção de reativar uma transação ignorada

### Telas criadas
- `/importacao-ofx`
- `/conciliacao`

### Banco de dados
**Migration:** `supabase/migrations/0006_ofx_conciliacao.sql`

**Tabelas criadas:** `import_batches`, `import_errors`, `bank_transactions`, `reconciliation_links`

**Índices únicos para deduplicação:** `(bank_account_id, ofx_transaction_id)` quando há FITID;
`(bank_account_id, transaction_hash)` quando não há — essa é a garantia final contra
duplicidade, no nível do banco, não só na tela.

**Funções SQL criadas** (todas reaproveitando `settle_entry`/`reverse_settlement` da Fase 5 —
nenhuma regra de liquidação foi duplicada):
- `reconcile_with_existing_entry(...)` — vincula a transação a um lançamento existente
- `reconcile_with_new_entry(...)` — cria o lançamento e concilia na mesma operação
- `undo_reconciliation(...)` — estorna a liquidação vinculada e reabre a transação
- `ignore_bank_transaction(...)` / `unignore_bank_transaction(...)`

**Permissões usadas:** `importar_ofx` e `realizar_conciliacao` já existiam desde a Fase 1 —
nenhuma nova permissão foi criada.

### Decisões tomadas nesta fase
- **Conciliação 1-para-1 nesta fase** — uma transação bancária vincula a um lançamento (e
  vice-versa). O escopo original também prevê conciliar uma transação com vários lançamentos e
  vários lançamentos com uma transação; isso fica para uma fase futura, se o uso real do
  sistema mostrar essa necessidade. O modelo de dados (`reconciliation_links`) já é uma tabela
  de ligação — dá para evoluir para muitos-para-muitos sem redesenhar do zero.
- **Parser de OFX escrito do zero, sem biblioteca externa** — o formato OFX 1.x (SGML, sem
  tags de fechamento) e OFX 2.x (XML) têm estruturas diferentes; o parser tenta os dois
  formatos automaticamente. Foi testado com 5 cenários incluindo arquivos malformados.
- **A leitura do arquivo acontece no navegador**, não no servidor — o arquivo OFX em si nunca é
  armazenado; só as transações já extraídas (data, valor, descrição, identificador) chegam ao
  Supabase.
- **Comparação entre saldo calculado e extrato bancário reaproveita a "Conferência de saldo" da
  Fase 4** em vez de criar uma tela nova — é exatamente a mesma necessidade, e duas telas
  fazendo a mesma coisa só criaria risco de divergência.

## Como testar

1. Rode a migration `0006_ofx_conciliacao.sql` (seção 3 acima).
2. Em **Contas bancárias**, confirme que a conta que você quer testar tem "Permitir importação
   OFX" habilitado (se não tiver, edite — ou recrie a conta com essa opção marcada).
3. Baixe um extrato OFX do seu banco (ou peça para eu gerar um arquivo de exemplo, se quiser
   testar sem esperar o próximo extrato real).
4. Acesse **Importação OFX**, selecione a conta, envie o arquivo — confirme que a
   pré-visualização aparece com cada transação marcada como "Nova".
5. Confirme a importação, vá para **Conciliação bancária** — as transações devem aparecer em
   "Não conciliadas".
6. Tente importar o **mesmo arquivo de novo** — na pré-visualização, todas as transações devem
   aparecer como "Já importada" e vir desmarcadas.
7. Em uma transação não conciliada, clique em "Vincular a lançamento" e escolha um lançamento
   em aberto compatível — confirme que ela move para "Conciliadas" e que o lançamento aparece
   como pago/recebido.
8. Em outra transação, clique em "Criar lançamento" — preencha a categoria e confirme — deve
   criar o lançamento já conciliado.
9. Clique em "Desfazer conciliação" em uma transação conciliada — confirme que ela volta para
   "Não conciliadas" e que o lançamento correspondente volta ao status anterior.
10. Clique em "Ignorar" em uma transação — confirme que ela aparece na aba "Ignoradas", e que
    "Reativar" a traz de volta.

## Critérios de aceite

✅ O mesmo arquivo não duplica transações (índice único no banco + pré-visualização avisando)
✅ Transações importadas anteriormente são identificadas (marcadas como "Já importada" na
   pré-visualização)
✅ O usuário consegue desfazer uma conciliação
✅ O saldo calculado pode ser comparado com o extrato (via Conferência de Saldo, Fase 4)

## Pendências desta fase

- Conciliação muitos-para-muitos não implementada (ver decisão acima).
- O parser de OFX não foi validado contra um arquivo real do C6 Bank ainda — a estrutura segue
  o padrão OFX genérico, que o C6 (como a maioria dos bancos brasileiros) segue, mas vale testar
  com um arquivo real assim que possível e me avisar se algo não for reconhecido corretamente.
- `import_errors` existe no banco mas a tela ainda não expõe os erros de importação
  individualmente — hoje eles só aparecem de forma agregada (contagem de transações
  ignoradas na pré-visualização). Pode ser refinado depois sem mudança de schema.

## Próxima fase sugerida

**Fase 10 — Recibos de aluguel**: dados dos locatários, configurações do emissor, numeração
sequencial, geração de recibo em PDF, armazenamento privado, download, envio por e-mail,
histórico.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 10 — Recibos de aluguel

## O que foi entregue

### Funcionalidades implementadas
- **Geração de recibo em PDF** a partir de um recebimento já confirmado (uma liquidação
  específica, não o lançamento inteiro — importante quando há recebimento parcial)
- **Numeração sequencial atômica**: reaproveita o prefixo e o contador já existentes em
  Configurações desde a Fase 1; dois recibos nunca saem com o mesmo número, mesmo gerados ao
  mesmo tempo
- **Valor por extenso em português**, calculado por uma função própria (sem depender de
  biblioteca externa), testada com 11 casos diferentes
- **Armazenamento privado** no Supabase Storage, com download via link assinado
- **Tela de Locatários**: visão dedicada dos contrapartes marcados como locatário, com atalho
  direto para emitir recibo do recebimento mais recente ainda sem recibo
- **Histórico de recibos** emitidos, ordenado por número
- Atalho "Emitir recibo" direto na liquidação de uma conta a receber

### Telas criadas
- `/recibos` (histórico)
- `/recibos/novo` (emissão)
- `/recibos/[id]` (detalhe + download)
- `/locatarios`

### Telas alteradas
- Detalhe de conta a receber: cada liquidação válida agora tem um link "Emitir recibo"

### Banco de dados
**Migration:** `supabase/migrations/0007_recibos_aluguel.sql`

**Tabela criada:** `rent_receipts`

**Funções SQL criadas:**
- `reserve_receipt_number()` — incrementa o contador de forma atômica (a trava vem do próprio
  `UPDATE`, que bloqueia a linha até o fim da transação)
- `create_rent_receipt(...)` — valida que a liquidação é de um recebimento confirmado, garante
  que não existe recibo duplicado para a mesma liquidação, e grava o recibo com o número
  reservado

**Storage:** bucket privado `receipts`, mesmo padrão de segurança por pasta (`{organization_id}/...`)
usado nos anexos desde a Fase 3.

**Permissão usada:** `gerar_recibos`, já existia desde a Fase 1.

**Dependência adicionada:** `pdf-lib` — biblioteca consolidada e leve para geração de PDF em
Node.js, escolhida em vez de `@react-pdf/renderer` por ter menor superfície de complexidade
para um documento de layout fixo como um recibo (decisão antecipada desde o diagnóstico da
Fase 0).

### Decisões tomadas nesta fase
- **Envio por e-mail ficou para a Fase 11** — foi avisado antes de começar. Enviar e-mail de
  verdade exige um provedor configurado (chave de API, domínio verificado, etc.), que é
  exatamente a infraestrutura que a Fase 11 (Relatórios automáticos) vai construir. Implementar
  isso agora seria antecipar trabalho de forma isolada, sem a camada correta por trás.
- **"Locatários" é uma visão especializada de Contrapartes**, não uma tabela nova — evita ter
  dois cadastros de pessoa/empresa que precisariam ficar sincronizados.
- **Configurações do emissor (logo) não ganharam upload de imagem nesta fase** — o PDF usa
  nome, CNPJ/CPF e endereço (já configuráveis desde a Fase 1), sem logo. A coluna `logo_url` já
  existe no banco desde então; dá para usar quando fizer sentido, sem mudança de schema.
- **Recibo vinculado à liquidação, não ao lançamento** — importante porque, com pagamento
  parcial (Fase 5), um mesmo lançamento pode ter várias liquidações ao longo do tempo; cada
  liquidação pode (ou não) ter seu próprio recibo.

## Como testar

1. Rode a migration `0007_recibos_aluguel.sql` (seção 3 acima).
2. Marque uma contraparte existente (ou crie uma nova) com o tipo "Locatário" em Contrapartes.
3. Registre um recebimento de uma conta a receber vinculada a essa contraparte (Fase 3/5).
4. Acesse **Locatários** — confirme que aparece o link "Emitir recibo" com o valor e a data do
   recebimento.
5. Clique nele, preencha período de referência e descrição do espaço, clique "Gerar recibo em
   PDF" — confirme que você é redirecionado para a tela do recibo com número sequencial (ex.:
   REC-000001).
6. Clique em "Baixar PDF" — confirme que o arquivo abre e mostra: nome do DECK 03, dados do
   locatário, valor em número e por extenso, data, e o aviso de que não é nota fiscal.
7. Tente emitir um segundo recibo para a mesma liquidação — confirme que o sistema avisa que já
   existe um recibo para ela e mostra o link para vê-lo.
8. Gere outro recibo (de outra liquidação) — confirme que o número sequencial avançou
   corretamente (ex.: REC-000002).
9. Acesse **Recibos** — confirme que o histórico lista os dois, mais recentes primeiro.

## Critérios de aceite

✅ Recibo é gerado a partir de recebimento confirmado (sempre vinculado a uma liquidação válida,
   nunca a um valor em aberto)
✅ PDF possui os dados necessários (emissor, locatário, valor e extenso, data, período, espaço,
   forma de pagamento, observações, código de verificação, aviso de não ser nota fiscal)
✅ Documento fica vinculado ao lançamento (e à liquidação específica)
✅ Recibo não é tratado como nota fiscal (aviso explícito no rodapé do PDF)
✅ Arquivo não fica público (bucket privado, acesso só via link assinado e permissão)

## Pendências desta fase

- Envio por e-mail (ver decisão acima — Fase 11).
- Sem upload de logo (ver decisão acima).
- Sem cancelamento/reemissão de recibo pela interface — o campo `status` já existe no banco
  (`ativo`/`cancelado`) para isso, mas a ação ainda não tem tela própria.
- O parser não valida CPF/CNPJ do locatário — assume o que já está cadastrado em Contrapartes.

## Próxima fase sugerida

**Fase 11 — Relatórios automáticos**: relatório semanal (para o administrador fiscalizar a
qualidade dos dados) e mensal (para o CEO), configuração de destinatários e horário, histórico
de envios, reenvio manual — e é aqui que o provedor de e-mail finalmente entra, permitindo
também o envio de recibos por e-mail.

Não inicie esta fase automaticamente — aguarde autorização.

---

# Fase 11 — Relatórios automáticos

## O que foi entregue

### Funcionalidades implementadas
- **Relatório semanal**: saldo empresarial, saldo por conta, saldo pessoal separado, caixa
  projetado (7/30/60/90 dias), entradas/saídas previstas para os próximos 7 dias, alertas
  (contas vencidas, transações não conciliadas, lançamentos sem conta bancária, diferenças de
  saldo)
- **Relatório mensal**: saldo inicial/final do mês anterior, geração de caixa, receita e
  resultado operacional (mesma DRE da Fase 8), contas a pagar/receber, inadimplência, caixa
  projetado, comparação com o mês anterior, maiores entradas/saídas, principais categorias
- **Configuração pela interface**: destinatários (texto livre, um por linha), dia da
  semana/mês, horário desejado, ativar/desativar — nada fixo no código
- **Histórico de envios** com status (enviado/erro) e mensagem de erro visível
- **Reenvio manual / "gerar agora"**: dispara o relatório imediatamente, sem esperar o
  agendamento
- **Rotina agendada real**, via Vercel Cron — não é só um botão manual

### Telas criadas
- `/relatorios`

### Banco de dados
**Migration:** `supabase/migrations/0008_relatorios_automaticos.sql`

**Tabelas criadas:** `report_configs`, `generated_reports`

**Permissão usada:** `alterar_configuracoes`, já existia desde a Fase 1.

### Infraestrutura nova
- **Camada de e-mail desacoplada** (`lib/email/`): uma interface `EmailProvider` com duas
  implementações — SMTP genérico (Gmail, Outlook, etc.) e Resend. O sistema escolhe
  automaticamente qual usar com base nas variáveis de ambiente configuradas (SMTP tem
  prioridade se as duas estiverem presentes). Trocar de provedor no futuro é mudar
  `lib/email/index.ts`, sem tocar nos relatórios nem nos recibos.
- **Rota agendada** `app/api/cron/send-reports/route.ts`, protegida por um segredo
  (`CRON_SECRET`), chamada uma vez por dia pelo **Vercel Cron** (configurado em `vercel.json`).
  Usa o cliente administrativo do Supabase (chave service role) porque roda sem nenhum usuário
  logado.
- Duas funções de cálculo já existentes (`computeCashflowProjection` e `fetchClassifiedItems`)
  ganharam um parâmetro opcional de organização, usado só nesse contexto sem sessão — o
  comportamento normal (autenticado, com RLS) não muda em nada.

### Decisões tomadas nesta fase
- **Granularidade do agendamento: uma vez por dia**, não por hora exata. O plano gratuito da
  Vercel só permite cron diário. Você configura o horário desejado normalmente (fica salvo e
  documentado), mas o disparo de verdade acontece no horário fixo do cron
  (aproximadamente 8h de Brasília). Se isso incomodar no uso real, dá para resolver com o
  plano Vercel Pro (cron mais flexível) sem mudar nada da lógica.
- **Provedor de e-mail: SMTP (Gmail/Outlook) ou Resend**, à escolha. Adicionei a opção SMTP
  depois da entrega inicial desta fase, especificamente para quem não tem (ou não quer, por
  enquanto) verificar um domínio próprio — usar uma conta de e-mail já existente com uma senha
  de app é mais rápido de configurar. Passo a passo das duas opções abaixo.
- **"Lançamento sem classificação" virou "lançamento sem conta bancária definida"** no alerta
  do relatório semanal — como a categoria já é obrigatória em todo lançamento desde a Fase 3,
  esse alerta específico do escopo original não tinha como ocorrer; troquei por uma checagem de
  qualidade equivalente que realmente pode acontecer no sistema.
- **Envio de recibos por e-mail (pendência da Fase 10) não foi conectado ainda** — a
  infraestrutura de e-mail já existe agora; conectar o botão "Enviar recibo por e-mail" é uma
  tarefa pequena que pode ser feita a qualquer momento, sem depender de mais nenhuma fase.

## Passo a passo: configurar o envio de e-mail

Você tem duas opções — escolha uma (ou configure as duas, o sistema usa SMTP automaticamente
se ambas estiverem presentes).

### Opção A — Gmail (ou outro e-mail comum), via SMTP — não exige domínio próprio

Essa é a opção mais simples se você não tem um domínio verificado ainda.

1. Use uma conta do Gmail que faça sentido para o DECK 03 (pode ser uma existente, ou criar uma
   nova, tipo `financeiro.deck03@gmail.com`).
2. Ative a **verificação em duas etapas** nessa conta, se ainda não estiver ativa: acesse
   [myaccount.google.com/security](https://myaccount.google.com/security) → **Verificação em
   duas etapas** → siga o passo a passo do Google.
3. Depois de ativada, ainda em **Segurança**, procure **Senhas de app** (ou acesse direto
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Crie uma nova senha de app — dê um nome tipo "DECK 03 Financeiro" — o Google vai gerar uma
   senha de 16 caracteres. **Copie essa senha** (ela só aparece uma vez).
5. Na Vercel, vá em **Settings → Environment Variables** e adicione:
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: o e-mail do Gmail (ex.: `financeiro.deck03@gmail.com`)
   - `SMTP_PASSWORD`: a senha de app de 16 caracteres gerada no passo 4 (não é a senha normal
     da conta)
   - `EMAIL_FROM`: o mesmo e-mail do Gmail
6. Redeploy o projeto.

Essa opção permite enviar para qualquer destinatário, sem precisar verificar domínio — e
continua sendo automático (o Vercel Cron dispara sozinho, sem precisar do sistema aberto).

### Opção B — Resend — exige domínio verificado para enviar a destinatários externos

1. Crie uma conta em [resend.com](https://resend.com) (tem plano gratuito).
2. No painel, vá em **API Keys** → **Create API Key** → copie a chave gerada.
3. Em **Domains**, adicione e verifique um domínio seu (ex.: `deck03.com.br`) para poder
   enviar de um endereço como `relatorios@deck03.com.br`. **Sem domínio verificado**, o Resend
   só permite enviar para o e-mail da sua própria conta — funciona para testar, mas não para
   uso real com o CEO/administrador.
4. Na Vercel, vá em **Settings → Environment Variables** do projeto e adicione:
   - `RESEND_API_KEY`: a chave copiada no passo 2
   - `EMAIL_FROM`: o endereço remetente, ex.: `DECK 03 <relatorios@deck03.com.br>`
5. Redeploy o projeto para as novas variáveis entrarem em vigor.

## Passo a passo: confirmar o Vercel Cron

1. Depois do deploy com o `vercel.json` desta fase, vá em **Settings → Environment Variables**
   e adicione `CRON_SECRET` com um valor aleatório (ex.: gere uma senha longa qualquer).
2. Vá em **Settings → Cron Jobs** no painel da Vercel — deve aparecer o job
   `/api/cron/send-reports` agendado. Se não aparecer, faça um redeploy.
3. Você pode testar manualmente: acesse
   `https://SEU-DOMINIO.vercel.app/api/cron/send-reports` com um cabeçalho
   `Authorization: Bearer SEU_CRON_SECRET` (ferramentas como Postman/Insomnia servem para isso)
   para confirmar que a rota responde sem erro.

## Como testar

1. Rode a migration `0008_relatorios_automaticos.sql` (seção 3 acima).
2. Configure o Resend e o `CRON_SECRET` (seções acima). Se ainda não tiver domínio verificado,
   use seu próprio e-mail (o mesmo da conta Resend) como destinatário de teste.
3. Acesse **Relatórios**, configure o relatório semanal com seu e-mail como destinatário e
   clique em **Ativar envio automático** → **Salvar configuração**.
4. Clique em **Gerar e enviar agora** — confirme que o e-mail chega (confira o spam também) com
   os dados batendo com o Dashboard.
5. Confira o **Histórico de envios** — deve aparecer uma linha "Enviado", origem "Manual".
6. Tente enviar sem ter configurado o Resend (remova a chave temporariamente, se quiser testar)
   — confirme que aparece "Erro" no histórico, com a mensagem visível ao passar o mouse.
7. Repita os passos 3–5 para o relatório mensal.
8. Desative o envio automático de um dos relatórios — confirme que o histórico não recebe
   novas linhas automáticas dele (o "gerar agora" continua funcionando independente do
   ativar/desativar, por ser manual).

## Critérios de aceite

✅ Relatórios utilizam os mesmos cálculos do dashboard (reaproveita `computeCashflowProjection`,
   `buildDRE`, `fetchClassifiedItems` — as mesmas funções usadas em Dashboard, Fluxo de Caixa
   Projetado e DRE)
✅ Envios ficam registrados (tabela `generated_reports`, com histórico visível na tela)
✅ Erros ficam registrados (status "erro" + mensagem, nunca falha silenciosamente)
✅ Usuário consegue desabilitar envios (checkbox "Ativar envio automático")
✅ Destinatários não ficam fixos no código (campo de texto livre, salvo no banco)

## Pendências desta fase

- Precisão de horário limitada pelo plano gratuito da Vercel (ver decisão acima).
- Envio de recibo por e-mail ainda não conectado à nova infraestrutura (pendência herdada da
  Fase 10, agora desbloqueada).
- Relatório mensal usa sempre o mês calendário anterior completo — não há opção de gerar para
  um mês específico diferente pela interface (só o "gerar agora", que sempre olha para o mês
  anterior ao atual).

## Próxima fase sugerida

Esta foi a última fase planejada (1 a 12). Veja a seção "Fase 12" abaixo para o que foi
concluído e o manual do usuário completo, incluído neste repositório.

---

# Fase 12 — Exportações, auditoria e acabamento

## O que foi entregue

### Exportações (CSV, Excel e PDF)

Todas as exigem a permissão **`exportar_relatorios`** (nova nesta fase — o administrador
concede pela tela de Usuários e permissões) e ficam registradas na Auditoria.

- **Contas a pagar / Contas a receber** — botões "Exportar CSV" / "Exportar Excel" no topo da
  lista, respeitando os filtros de busca e status que estiverem ativos na tela.
- **Fluxo de caixa realizado** — CSV/Excel com o período filtrado; o Excel traz duas abas
  (Resumo com saldo inicial/entradas/saídas/saldo final, e Movimentos detalhados).
- **Transferências** — CSV/Excel com o histórico completo (a tela mostra só as 100 mais
  recentes; a exportação não tem esse limite).
- **DRE gerencial** — CSV e **PDF** formatado (mesmo estilo visual do recibo de aluguel, com
  paginação automática). Usa exatamente as mesmas funções de cálculo da tela — a regra de
  "distribuição de lucros nunca entra no resultado operacional" foi extraída para
  `lib/finance/dre-socios.ts` nesta fase, compartilhada entre tela e exportação, para nunca
  haver dois números diferentes para a mesma DRE.
- **Backup completo** — em Configurações, um botão gera uma planilha Excel com uma aba por
  tabela (lançamentos, liquidações, transferências, todos os cadastros, recibos etc.).
  Restrito a administradores.

### Auditoria

- Nova tela **Auditoria** (menu Administração), com filtros por entidade, ação e período, e
  paginação. Exige a permissão `visualizar_logs`.
- A tabela `audit_logs` já existia desde a Fase 1; nesta fase o registro passou a ser
  **usado de fato**: 18 Server Actions em todo o sistema (lançamentos, liquidações, estornos,
  cancelamentos, parcelamentos, recorrências, transferências, conciliação, importação OFX,
  recibos, cadastros, configurações, relatórios, permissões) agora gravam quem fez o quê e
  quando, via `lib/audit/index.ts`.
- Dados sensíveis (senhas, tokens, chaves de API) nunca são gravados em log — há uma
  higienização automática (`lib/audit/sanitize.ts`) que os substitui por `"[removido]"` antes
  de persistir, em qualquer nível de profundidade do objeto.
- Os logs são **imutáveis**: a migration desta fase revoga UPDATE/DELETE da role
  `authenticated` na tabela `audit_logs` — nem a aplicação nem um bug futuro conseguem
  apagar ou alterar um registro já gravado.

### Usuários e permissões

Item que ficava desabilitado no menu desde a Fase 1 — agora funciona:

- Lista todos os usuários da organização, com papel (Administrador/Operador) e situação
  (ativo/inativo).
- Administrador consegue **ativar/desativar** operadores (sem excluir — o histórico de quem
  criou o quê é preservado).
- Para cada operador, o administrador ajusta permissões individuais: **Padrão do papel**
  (segue o que o papel Operador concede), **Conceder** (dá acesso além do padrão) ou
  **Revogar** (tira um acesso que o papel concederia). Tudo fica registrado na Auditoria.
- Administradores sempre têm acesso total (regra que já existia desde a Fase 1 na função
  `has_permission()` do banco) — por isso não aparecem ajustes individuais para eles.
- Criar um novo usuário continua sendo feito pelo painel do Supabase (Authentication → Users),
  como descrito na seção 4 deste README — não há criação de usuário pela interface do sistema
  nesta fase.

### Revisão de permissões e RLS

- Revisão completa das 9 migrations: todas as 27 tabelas do sistema têm Row Level Security
  habilitado, com políticas consistentes (leitura restrita à própria organização ou catálogo
  global somente leitura; escrita condicionada a `has_permission()` ou papel `admin`).
- Duas permissões que o código já exigia desde a Fase 2 (`alterar_centros_de_custo` e
  `alterar_formas_pagamento`) não estavam no catálogo semeado — corrigido na migration desta
  fase. Não afeta administradores (que sempre têm tudo); operadores agora podem recebê-las
  explicitamente pela tela de Usuários e permissões.

### Tratamento de erros e estados vazios

- Tela de erro amigável para falhas dentro da área logada (`app/(app)/error.tsx`) — nunca
  mostra stack trace ao usuário, oferece "Tentar novamente" e "Ir para o Dashboard".
- Tela de erro global (`app/global-error.tsx`) para falhas no próprio layout raiz.
- Página 404 personalizada (`app/not-found.tsx`).
- Estados vazios já existiam na maioria das telas desde as fases anteriores (ex.: "Nenhum
  lançamento encontrado", "Nenhuma transferência registrada"); esta fase adicionou os que
  faltavam (Auditoria, Usuários) e manteve o padrão visual consistente.

### Correção herdada da Fase 11

A validação da tela de Relatórios (`saveReportConfigAction`) tratava `formData.get()` retornando
`null` para campos ausentes (o relatório semanal não envia `day_of_month` e vice-versa) como erro
de "Dados inválidos". Corrigido nesta fase: os campos ausentes agora viram string vazia antes de
passar pelo schema Zod, igual ao que já era feito no restante do sistema.

### Testes

21 testes novos (total do projeto: **116 testes**, todos passando):
- `tests/fase12-export.test.ts` — escapamento de CSV (separador `;`, aspas, quebras de linha),
  formatação de datas/números no padrão brasileiro, e as linhas exportadas da DRE (incluindo o
  teste de que a distribuição de lucros nunca afeta o resultado operacional).
- `tests/fase12-audit.test.ts` — higienização de dados sensíveis, truncamento de strings
  longas, limite de profundidade de objetos.
- `tests/fase12-xlsx-pdf.test.ts` — geração de PDF válido (com paginação), geração de planilha
  Excel com roundtrip de leitura (confirma que os valores gravados são os valores lidos de
  volta), e sanitização de nomes de aba inválidos.

## Como testar

1. Rode a migration `0009_exportacoes_auditoria_acabamento.sql` (seção 3 acima).
2. Como administrador, acesse **Usuários e permissões** e conceda `Exportar relatórios` a um
   operador de teste (se quiser testar com esse papel).
3. Em **Contas a pagar**, clique em "Exportar CSV" — confirme que o arquivo abre corretamente
   no Excel com acentuação correta e os valores nas colunas certas.
4. Em **DRE gerencial**, clique em "Exportar PDF" — confirme que o documento abre, mostra o
   cabeçalho com o nome do DECK 03 e os valores batem com a tela.
5. Em **Configurações**, clique em "Gerar backup completo" — confirme que o Excel baixado tem
   uma aba para cada tabela principal.
6. Acesse **Auditoria** — confirme que as ações do passo 3 e 5 aparecem na lista. Filtre por
   entidade "Exportação".
7. Em **Usuários e permissões**, desative um usuário de teste — confirme que ele não consegue
   mais fazer login (tentando acessar com a conta desativada, se tiver uma para testar).
8. Force um erro (ex.: acesse uma URL inexistente como `/pagina-que-nao-existe`) — confirme
   que aparece a tela 404 personalizada, não um erro técnico do Next.js.

## Critérios de aceite

✅ Exportações (CSV/Excel/PDF) disponíveis nas telas principais, respeitando filtros e permissões
✅ DRE exportada usa exatamente as mesmas funções de cálculo da tela (sem duplicação de regra)
✅ Toda ação relevante do sistema é registrada em audit_logs, com dados sensíveis higienizados
✅ Logs de auditoria são imutáveis (RLS + revogação de UPDATE/DELETE)
✅ Administrador consegue gerenciar usuários e ajustar permissões individuais pela interface
✅ Todas as 27 tabelas do sistema têm RLS habilitado e revisado
✅ Erros técnicos nunca aparecem crus para o usuário (telas de erro amigáveis em todos os níveis)
✅ Backup completo dos dados disponível em um clique, restrito a administradores
✅ 116 testes automatizados passando, incluindo os 21 novos desta fase

## Pendências / limitações conhecidas

- A restauração de um backup é um procedimento manual (ver "Backup e restauração" no Manual do
  Usuário, seção 10) — não há um botão de "restaurar" na interface. Restaurar dados de produção
  é uma operação de risco alto o suficiente para justificar um passo manual e deliberado, em vez
  de um botão que poderia ser clicado sem querer.
- A exportação de PDF está disponível apenas para a DRE gerencial nesta fase (as demais telas
  exportam em CSV/Excel). Um PDF de contas a pagar/receber pode ser adicionado depois, se surgir
  a necessidade — a infraestrutura (`lib/export/pdf-report.ts`) já suporta qualquer relatório
  tabular.
- Criação de novos usuários continua sendo feita pelo painel do Supabase, não pela interface do
  sistema (ver seção 4 deste README).
- Testes automatizados desta fase cobrem a camada de lógica pura (formatação, geração de
  arquivos, higienização) — não há testes end-to-end de navegador neste projeto; toda a
  validação de fluxo completo é feita manualmente pelo roteiro "Como testar".

## Todas as 12 fases planejadas foram entregues

Este projeto está com o escopo completo implementado: fundação e autenticação, cadastros
financeiros, lançamentos básicos e avançados, saldos e transferências, fluxo de caixa realizado
e projetado, dashboard do CEO, DRE gerencial com comparação trimestral, importação OFX e
conciliação bancária, recibos de aluguel, relatórios automáticos por e-mail, e agora
exportações, auditoria completa e gestão de usuários.

Veja o **Manual do Usuário** (`MANUAL-DO-USUARIO.md`, neste repositório) para um guia de uso
completo do sistema, pensado para quem vai operar o DECK 03 Financeiro no dia a dia — sem
jargão técnico.

---

# Ajuste pós-Fase 12 — sócios/pessoa física pagos pela mesma conta empresarial

## Contexto

Depois da Fase 12, foi esclarecido um ponto importante sobre como o DECK 03 opera na prática:
**não existem, necessariamente, contas bancárias separadas por titularidade** — a mesma conta
empresarial é usada tanto para pagar despesas da empresa (PJ) quanto despesas pessoais dos
sócios (PF).

O campo `ownership` em `bank_accounts` (empresarial/pessoa física) já existia desde a Fase 2,
mas ele resolve apenas o caso de uma conta ser *inteiramente* de um tipo ou outro. Ele não
ajuda quando uma única conta mistura os dois.

## O que já funcionava corretamente

A separação PJ/PF **não depende da conta bancária usada no pagamento** — ela é feita pela
**categoria do plano de contas** (campo `dre_behavior`, existente desde a Fase 2). Uma
categoria com `dre_behavior = 'nao_incluir'` (natureza gerencial "Pessoa física" ou "Movimentação
de sócios") já era excluída do resultado operacional da DRE e já aparecia corretamente na seção
"Movimentações de sócios", **independentemente de qual conta bancária pagou**. Ou seja, a **DRE
já estava certa** mesmo com uma única conta compartilhada.

## O que foi corrigido

Duas telas somavam entradas/saídas apenas olhando para a conta bancária usada, sem checar a
categoria — então uma despesa pessoal paga pela conta empresarial inflava indevidamente os
números "da empresa":

- **Fluxo de caixa realizado** — agora separa, dentro do mesmo período e das mesmas contas, o
  que é movimentação operacional (entra em Entradas/Saídas) do que é movimentação de
  sócios/pessoa física (mostrado em uma seção própria, "Movimentações de sócios / pessoa
  física", com o total líquido e a composição por categoria). A exportação (CSV/Excel) segue a
  mesma regra, com uma coluna "Classificação" em cada movimento e uma linha própria no resumo.
- **Dashboard** — "Receita do mês", "Despesa do mês", "Maiores entradas/saídas" e "Despesas/
  Receitas por categoria" agora excluem itens de sócios/pessoa física. Quando há movimentação
  desse tipo no mês, aparece uma nota abaixo dos indicadores informando o valor não incluído
  (com link implícito para a DRE, onde a movimentação de sócios já era exibida corretamente).
  O "Resultado operacional preliminar" não mudou — já usava a mesma regra da DRE desde a
  Fase 7.

A lógica de separação foi centralizada em `lib/finance/realized-split.ts` (funções puras,
testadas), reaproveitada pelas três telas — a mesma regra de "o que é sócio/PF" nunca precisa
ser reimplementada duas vezes.

## Como usar na prática

Para registrar uma despesa pessoal paga pela conta empresarial:

1. Garanta que existe, no **Plano de contas**, uma categoria com natureza gerencial "Pessoa
   física" (ou "Movimentação de sócios") e comportamento na DRE "Não incluir" — se ainda não
   existir, crie uma (ex.: família "Sócios", categoria "Despesas pessoais").
2. Registre a despesa normalmente em **Contas a pagar**, usando essa categoria.
3. Ao liquidar, use a conta bancária empresarial normalmente — não precisa de nenhuma conta
   separada.

O sistema cuida do resto: a DRE, o Fluxo de Caixa Realizado, o Dashboard e as exportações
tratam esse valor como movimentação de sócios/pessoa física, não como despesa operacional da
empresa — mesmo saindo fisicamente da conta empresarial.

## Testes

7 testes novos em `tests/fase12-fix-socios-fluxo.test.ts`, incluindo o caso central: uma
despesa pessoal categorizada corretamente, mesmo paga pela conta empresarial, não aumenta o
total de saídas operacionais do fluxo de caixa (123 testes no total, todos passando).

## O que não mudou (por design)

- **Transferências** continuam sendo o mecanismo indicado quando o dinheiro sai da conta
  empresarial em direção a outra conta bancária cadastrada (ex.: uma retirada para uma conta
  pessoal que também existe no sistema) — usando as classificações já existentes desde a
  Fase 4 (distribuição de lucros, retirada de sócio, aporte etc.).
- O ajuste desta seção cobre o outro caso: quando **não há uma segunda conta envolvida** — a
  despesa pessoal é paga diretamente da conta empresarial, sem transferência nenhuma, e por
  isso precisa ser um lançamento categorizado, não uma transferência.

---

# Ajuste — data de competência em parcelamentos/recorrências e filtro de período

## Parcelamento: data de competência explícita

O reconhecimento "Integralmente na competência original" já existia (Fase 5), mas usava sempre
o primeiro vencimento como a competência de todas as parcelas, sem um campo para o usuário
escolher outra data. Agora, ao selecionar esse reconhecimento, um campo **"Data de competência"**
aparece no formulário — obrigatório nesse caso, e usado em todas as parcelas geradas. É útil
para uma compra reconhecida de uma vez só (ex.: no mês da compra), mesmo paga em várias vezes ao
longo dos meses seguintes.

Retrocompatível: parcelamentos já existentes, criados antes deste ajuste, não são alterados —
a migration só muda o comportamento de parcelamentos novos.

## Recorrência: competência independente do vencimento

Antes, a competência de cada ocorrência gerada era sempre igual ao seu próprio vencimento — não
havia como pedir, por exemplo, "vencimento no dia 10 do mês seguinte, mas competência no último
dia do mês de referência". Agora existe o campo opcional **"Data de competência do 1º
lançamento"**: se preenchido, cada ocorrência gerada mantém o mesmo dia do mês dessa data,
avançando o mês junto com o vencimento (a cadência é a mesma da frequência escolhida) — sem
sofrer o ajuste de dia útil, que é específico do vencimento (data de pagamento), não da
competência (data contábil). Se deixado em branco, o comportamento é o mesmo de antes:
competência = vencimento de cada ocorrência.

Implementado via nova coluna `recurring_rules.competence_anchor_date` e ajuste na função
`generate_recurring_instances()` — retrocompatível: recorrências já existentes (sem essa coluna
preenchida) continuam gerando ocorrências exatamente como antes.

## Filtro de período em Contas a pagar / Contas a receber

As duas telas ganharam um filtro por **vencimento** ("Vencimento de" / "até"), ao lado do filtro
de status já existente — útil para ver, por exemplo, só o que vence este mês. O filtro:

- Combina com busca por descrição e status, todos aplicados juntos.
- É respeitado pela exportação (CSV/Excel) — o arquivo exportado tem sempre o mesmo recorte que
  a tela está mostrando.
- Não afeta os cards de totais no topo (Em aberto / Pago ou recebido / Vencido), que continuam
  mostrando o total geral, independente do filtro — mesmo comportamento que o filtro de status
  já tinha.

## Migration

`supabase/migrations/0010_data_competencia_e_filtro_periodo.sql` — adiciona
`installment_groups.single_competence_date` e `recurring_rules.competence_anchor_date`, e
substitui as funções `create_installment_plan()` e `generate_recurring_instances()`. Sem
mudança de comportamento para dados/registros já existentes.

## Testes

5 testes novos em `tests/fase12-fix-competencia.test.ts`, cobrindo a validação (competência
obrigatória apenas quando o reconhecimento é "competencia_original"; âncora de competência
opcional na recorrência). Total do projeto: 128 testes, todos passando.

## Correção — erro "Invalid input" ao criar parcelamento ou recorrência

Depois do ajuste acima, os formulários de **Parcelamento** e **Recorrência** passaram a falhar
com o erro genérico "Invalid input" ao serem enviados. Causa raiz: nenhum dos dois formulários
tem campos de subcategoria ou forma de pagamento — mas os schemas de validação esperavam esses
campos como opcionais. `formData.get()` retorna `null` (não `undefined`) para um campo que não
existe no formulário, e `z.string().optional()` do Zod só aceita `undefined`, não `null` — a
combinação gera um erro de validação de união (`invalid_union`), cuja mensagem padrão é
justamente "Invalid input". Essa é a mesma causa-raiz já corrigida em Relatórios na Fase 11, só
que não tinha sido pega nesses dois formulários porque eles simplesmente nunca tiveram esses
dois campos.

Corrigido convertendo `null` em string vazia (`?? ""`) antes de validar, nas duas actions
(`createInstallmentPlanAction` e `createRecurringRuleAction`). 3 testes novos reproduzem o bug
e confirmam a correção (131 testes no total). Sem mudança de banco de dados — é só código.

---

# Ajuste — recorrência não gerava lançamentos visíveis, e recibo no modelo real

## Recorrência criada não aparecia em Contas a pagar/receber

Causa raiz: duas falhas na action de criar recorrência.

1. A chamada que gera os lançamentos (`generate_recurring_instances`) não checava erro — se
   falhasse por qualquer motivo, a regra ficava criada, mas com **zero lançamentos**, sem
   nenhum aviso ao usuário.
2. A action só revalidava a tela de Recorrências, nunca Contas a pagar/receber — mesmo quando a
   geração dava certo, a lista podia continuar mostrando uma versão desatualizada por causa do
   cache de navegação do Next.js.

Corrigido: o erro do RPC agora é checado — se falhar, a regra continua criada (não é desfeita),
mas o usuário é redirecionado com um aviso explicando que precisa usar o botão "Gerar próximas
ocorrências" para tentar de novo. Esse botão também passou a exibir erro na tela em vez de
falhar silenciosamente. E a criação bem-sucedida agora revalida Contas a pagar **e** Contas a
receber, além de Recorrências.

Se você tem uma recorrência já criada que não gerou nenhum lançamento, vá até **Recorrências**
e clique em "Gerar próximas ocorrências" na regra correspondente.

## Recibo de aluguel no layout do modelo real

O recibo (Fase 10) usava um texto corrido. Foi redesenhado para o modelo de campos rotulados
já usado em papel pelo DECK 03: Locador e Imóvel fixos no cabeçalho, e abaixo Locatário (razão
social + CNPJ), Referência, Vencimento, Total, e o bloco de Dados Bancários (banco, código,
agência, conta, chave Pix, beneficiário) — todos preenchidos automaticamente:

- **Locatário**: nome e CNPJ vêm da contraparte vinculada ao lançamento — nunca digitados à mão.
- **Referência**: agora vem da **competência do lançamento** automaticamente (ex.:
  "Julho/2026"), a mesma competência usada na DRE. Ainda pode ser sobrescrita manualmente no
  formulário de emissão, se necessário.
- **Vencimento**: vem do vencimento da conta a receber original (antes não aparecia no recibo).
- **Dados bancários**: vêm da conta bancária que recebeu o pagamento. Para isso, dois campos
  novos foram adicionados ao cadastro de **Contas bancárias**: código do banco (ex.: 341) e
  chave Pix — preencha-os na conta usada para receber aluguéis.

No caminho, encontrei e corrigi o **mesmo bug "Invalid input"** já corrigido em parcelamento/
recorrência, desta vez no cadastro de **Contas bancárias**: o campo `document_number` não tinha
input no formulário, mas o schema o esperava como opcional — mesma causa raiz (formData.get()
retorna `null`, não `undefined`, para um campo inexistente).

## Migration

`supabase/migrations/0011_recibo_modelo_real.sql` — adiciona `bank_accounts.bank_code`,
`bank_accounts.pix_key` e `rent_receipts.due_date`; atualiza `create_rent_receipt()` para gravar
o vencimento. Recibos já emitidos antes desta migration têm o vencimento preenchido
retroativamente a partir do lançamento vinculado, quando ele ainda existir.

## Testes

3 testes novos em `tests/fase12-fix-recibo.test.ts` (formatação da referência a partir da
competência) e os testes de PDF existentes foram atualizados para o novo layout. Total do
projeto: 134 testes, todos passando.

---

# Ajuste — deriva de dia útil na recorrência, e edição de saldo inicial

## Vencimentos da recorrência "andando para frente" mês a mês

Reportado com uma recorrência mensal (dia 24, ajuste de dia útil ativado): os vencimentos
gerados foram 24/08, 24/09, 26/10, 26/11, 28/12, 28/01... — indo cada vez mais longe do dia 24
em vez de voltar para ele todo mês.

**Causa raiz:** a função `generate_recurring_instances()` usava a data já ajustada de uma
ocorrência como base para calcular a próxima. Assim, quando um mês caía num fim de semana e o
vencimento era empurrado (ex.: 24/10, sábado → 26/10, segunda), esse "+2 dias" ficava **grudado**
nas ocorrências seguintes — o mês seguinte somava 1 mês a partir de 26, não de 24, e assim por
diante, indefinidamente.

**Correção:** cada ocorrência agora é sempre calculada a partir de `data inicial + (número da
ocorrência × frequência)` — nunca a partir da ocorrência anterior. O ajuste de dia útil passa a
ser aplicado a cada ocorrência individualmente, sem contaminar as seguintes. Com isso, o
exemplo acima passa a gerar 24/08, 24/09, 26/10 (sábado → ajustado), 24/11 (volta para 24),
24/12, 25/01 (domingo → ajustado), 24/02 (volta para 24), e assim por diante.

A migration também **recalcula automaticamente** o vencimento das ocorrências já geradas com o
bug — mas só as que ainda estão em aberto/agendadas. Lançamentos já pagos, cancelados ou
estornados nunca são reescritos (histórico financeiro é imutável).

## Editar saldo inicial de uma conta já existente

Antes, o saldo inicial só podia ser definido na criação da conta bancária — não havia como
corrigir depois, mesmo que a conta tivesse sido cadastrada com um valor provisório. Agora, a
tela de detalhe de cada conta bancária (Cadastros → Contas bancárias → abrir uma conta) tem uma
seção **"Editar saldo inicial"**, disponível para quem tem a permissão de alterar contas
bancárias. A mudança:

- Desloca o saldo calculado a partir de agora, de forma consistente.
- Não reescreve nenhuma liquidação ou movimentação já registrada.
- Fica registrada na Auditoria, com o valor anterior e o novo.

## Migration

`supabase/migrations/0012_corrige_deriva_dia_util_recorrencia.sql` — substitui
`generate_recurring_instances()` e recalcula os vencimentos ainda em aberto que tinham sido
gerados com o bug.

## Testes

4 testes novos em `tests/fase12-fix-recorrencia-datas.test.ts`, reproduzindo exatamente o caso
relatado (início 24/08/2026, mensal, ajuste de dia útil) e confirmando que a correção mantém o
dia 24 ancorado, ajustando cada ocorrência individualmente. Total do projeto: 138 testes, todos
passando.

