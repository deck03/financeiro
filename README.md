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
