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
2. Abra o arquivo `supabase/migrations/0001_fundacao.sql` deste projeto, copie todo o conteúdo e cole no SQL Editor. Execute (**Run**).
3. Repita o mesmo processo com `supabase/seed.sql`.

### Opção B — pela Supabase CLI (recomendado a partir da Fase 2, quando houver mais migrations)

```bash
# instalar a CLI (se ainda não tiver)
npm install -g supabase

# autenticar
supabase login

# vincular este projeto local ao projeto remoto do Supabase
supabase link --project-ref <SEU_PROJECT_REF>

# aplicar as migrations
supabase db push

# rodar o seed
supabase db execute -f supabase/seed.sql
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
