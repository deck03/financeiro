# Manual do Usuário — DECK 03 Financeiro

Este manual explica como usar o sistema no dia a dia. Não é preciso conhecimento técnico —
os termos de programação (banco de dados, RLS, migrations etc.) ficam no README, que é para
quem for mexer no código. Aqui é só sobre como operar o sistema.

---

## Sumário

1. [Primeiros passos e papéis de usuário](#1-primeiros-passos-e-papéis-de-usuário)
2. [Dashboard](#2-dashboard)
3. [Contas a pagar e a receber](#3-contas-a-pagar-e-a-receber)
4. [Pagar, receber e estornar](#4-pagar-receber-e-estornar)
5. [Parcelamentos e recorrências](#5-parcelamentos-e-recorrências)
6. [Transferências](#6-transferências)
7. [Fluxo de caixa (realizado e projetado)](#7-fluxo-de-caixa-realizado-e-projetado)
8. [DRE gerencial e comparação trimestral](#8-dre-gerencial-e-comparação-trimestral)
9. [Importação de extrato (OFX) e conciliação bancária](#9-importação-de-extrato-ofx-e-conciliação-bancária)
10. [Recibos de aluguel](#10-recibos-de-aluguel)
11. [Relatórios automáticos por e-mail](#11-relatórios-automáticos-por-e-mail)
12. [Exportações (CSV, Excel e PDF)](#12-exportações-csv-excel-e-pdf)
13. [Auditoria](#13-auditoria)
14. [Usuários e permissões](#14-usuários-e-permissões)
15. [Backup e restauração](#15-backup-e-restauração)
16. [Cadastros](#16-cadastros)
17. [Perguntas frequentes](#17-perguntas-frequentes)

---

## 1. Primeiros passos e papéis de usuário

O sistema tem dois papéis:

- **Administrador** — acesso completo a tudo, incluindo configurações, cadastros e a gestão de
  usuários e permissões.
- **Operador** — acesso ao que o administrador conceder. Por padrão, um operador consegue ver o
  dashboard e os saldos das contas empresariais, criar e editar lançamentos em aberto, registrar
  pagamentos e recebimentos, criar contrapartes e anexar documentos. Qualquer coisa além disso
  (excluir centro de custo, ver contas pessoais, exportar relatórios, ver a auditoria etc.)
  precisa ser concedida individualmente pelo administrador, na tela **Usuários e permissões**
  (seção 14).

Para entrar, use o e-mail e senha cadastrados. Esqueceu a senha? Use "Esqueci minha senha" na
tela de login — um e-mail de recuperação é enviado.

---

## 2. Dashboard

Primeira tela ao entrar. Mostra um resumo do momento financeiro do DECK 03:

- Saldo consolidado das contas empresariais (e pessoais, se você tiver permissão para vê-las).
- Alertas de contas vencidas ou próximas do vencimento.
- Resultado operacional preliminar do mês, com link direto para a DRE completa.
- Projeção resumida dos próximos dias.

---

## 3. Contas a pagar e a receber

Duas listas separadas — despesas (Contas a pagar) e receitas (Contas a receber) — com os mesmos
recursos:

- **Buscar** por descrição e **filtrar** por status (em aberto, vencido, pago/recebido,
  cancelado etc.) e por **período de vencimento** ("Vencimento de" / "até") — útil para ver, por
  exemplo, só o que vence este mês. Os filtros combinam entre si e valem também para a
  exportação (seção 12).
- **Nova conta a pagar/receber** — preenche descrição, contraparte, categoria, centro de custo,
  valor, vencimento e, opcionalmente, marca como "já paga/recebida" no próprio cadastro.
- Cada linha mostra o **status** com uma cor: laranja para em aberto, vermelho para vencido,
  verde para pago/recebido.
- Clique em uma linha para abrir o detalhe, onde ficam o histórico de liquidações, anexos e as
  ações de pagar/receber, editar (enquanto em aberto) ou cancelar.

## 4. Pagar, receber e estornar

Na tela de detalhe de um lançamento em aberto:

- **Registrar pagamento/recebimento** — informa a data, a conta bancária usada, e opcionalmente
  juros, multa, desconto ou acréscimo. Pode ser **parcial** (paga só uma parte) — o lançamento
  fica "Parcialmente pago/recebido" até quitar o restante.
- **Estornar uma liquidação** — desfaz um pagamento/recebimento já registrado (por exemplo, se
  a data ou o valor foram lançados errados). O lançamento volta a ficar em aberto pelo valor
  estornado. É preciso informar um motivo.
- **Cancelar** — só é possível enquanto o lançamento nunca recebeu nenhuma liquidação. Um
  lançamento cancelado não entra em nenhum relatório financeiro.

Tudo isso fica registrado na Auditoria (seção 13) — quem fez, quando, e com quais valores.

## 5. Parcelamentos e recorrências

- **Parcelamento** — ao criar uma conta a pagar/receber, marque a opção de parcelar. Informe o
  valor total, o número de parcelas e a data da primeira. O sistema cria automaticamente um
  lançamento para cada parcela, todos vinculados. Em "Reconhecimento gerencial", escolha como a
  DRE deve tratar o valor: por parcela (cada parcela conta no mês do seu próprio vencimento — o
  padrão), integralmente na competência original (todo o valor conta em uma única data, que você
  informa no campo que aparece — útil para uma compra reconhecida de uma vez, mesmo paga em
  várias vezes) ou conforme pagamento (só conta quando cada parcela for efetivamente paga/recebida).
- **Recorrência** — para despesas ou receitas que se repetem (aluguel recebido todo mês, por
  exemplo). Defina a frequência (semanal, mensal, bimestral, trimestral, semestral ou anual), a
  data de início e, se quiser, uma data final ou um número máximo de ocorrências. O sistema gera
  automaticamente as ocorrências dos próximos 12 meses; na tela **Recorrências**, um botão
  permite gerar mais 12 meses quando necessário. Se a competência de cada lançamento precisa
  cair em um dia diferente do vencimento (por exemplo, vencimento no dia 10 do mês seguinte, mas
  competência no último dia do mês de referência), preencha "Data de competência do 1º
  lançamento" — as próximas ocorrências mantêm o mesmo dia do mês, avançando junto com o
  vencimento. Se deixar em branco, a competência de cada lançamento é igual ao seu vencimento.
- Para cancelar uma recorrência, você escolhe o escopo: só as ocorrências futuras a partir de
  hoje, ou todas.

## 6. Transferências

Movimentações entre contas bancárias — nunca aparecem como receita ou despesa. Ao criar uma
transferência, você classifica o que ela representa:

| Classificação | O que significa |
|---|---|
| Transferência interna | Entre duas contas empresariais, sem efeito na DRE |
| Distribuição de lucros | Saída de dinheiro da empresa para os sócios |
| Retirada de sócio | Saída de dinheiro para um sócio (fora de distribuição de lucros) |
| Adiantamento a sócio | Saída de dinheiro como adiantamento |
| Devolução de adiantamento | Sócio devolvendo um adiantamento anterior |
| Reembolso de sócio | Sócio reembolsando a empresa por algum gasto |
| Aporte de sócio | Sócio colocando dinheiro na empresa |
| Despesa pessoal | Saída classificada como gasto pessoal, não da empresa |

Essas classificações (exceto "Transferência interna") aparecem separadamente na DRE, na seção
"Movimentações de sócios" — nunca entram no resultado operacional.

## 7. Fluxo de caixa (realizado e projetado)

- **Realizado** — o que efetivamente entrou e saiu das contas em um período já passado (ou até
  hoje). Mostra saldo inicial, entradas, saídas e saldo final, com a composição por categoria.
- **Projetado** — o que está previsto para os próximos 7 a 90 dias, com base nos lançamentos em
  aberto (contas a pagar e a receber ainda não liquidadas). Ajuda a enxergar se vai faltar
  dinheiro em algum ponto à frente.

Por padrão, contas de pessoa física não entram nesses números — só quem tem a permissão
"Visualizar contas pessoais" consegue incluí-las, marcando a opção no filtro.

> **Despesas pessoais pagas pela conta da empresa:** se um sócio usa a mesma conta bancária
> empresarial para pagar uma despesa pessoal (sem transferir para outra conta), essa despesa
> não deve entrar nas "Saídas" do Fluxo de Caixa Realizado — ela aparece separadamente, em
> "Movimentações de sócios / pessoa física", desde que esteja categorizada corretamente no
> plano de contas (veja a seção 16). O mesmo vale para o Dashboard.

## 8. DRE gerencial e comparação trimestral

A **DRE (Demonstração de Resultado)** mostra se o DECK 03 está dando lucro ou prejuízo, de um
jeito gerencial (não fiscal/contábil formal):

- Escolha o **regime**: caixa (o que já foi pago/recebido) ou competência (o que já foi
  registrado, mesmo sem liquidação).
- Escolha o **período**: mensal, trimestral ou personalizado.
- Cada linha é **clicável** — clique em qualquer categoria de despesa, por exemplo, para ver
  exatamente quais lançamentos compõem aquele número.
- Investimentos e movimentações de sócios aparecem **separados**, fora do resultado operacional
  — assim o número de "quanto a empresa realmente ganhou operando" nunca fica distorcido por um
  aporte de sócio ou pela compra de um equipamento.

Na **Comparação trimestral**, você compara o trimestre atual com o anterior, com o mesmo
trimestre do ano passado, ou escolhe dois trimestres quaisquer — vendo a variação em R$ e % e
quais categorias mais pesaram na diferença.

## 9. Importação de extrato (OFX) e conciliação bancária

1. Em **Importação OFX**, escolha a conta bancária e envie o arquivo `.ofx` baixado do banco
   (atualmente com suporte ao formato do C6 Bank).
2. O sistema mostra uma pré-visualização das transações do arquivo, já identificando quais são
   possíveis duplicatas (baseado em um identificador único do banco ou, na ausência dele, em
   conta + data + valor + descrição).
3. Confirme a importação — só as transações não duplicadas entram no sistema.
4. Em **Conciliação bancária**, cada transação importada aparece pendente. Para cada uma, você
   escolhe:
   - **Vincular a um lançamento existente** — quando a transação do banco corresponde a uma
     conta a pagar/receber que já estava cadastrada.
   - **Criar um novo lançamento** — quando a transação não tinha um lançamento correspondente.
   - **Ignorar** — quando não é algo que deva virar um lançamento (pode reverter depois).
5. É possível **desfazer** uma conciliação já feita, se tiver sido um engano.

## 10. Recibos de aluguel

Para locatários cadastrados, depois de registrar o recebimento do aluguel:

1. Vá até a liquidação correspondente e clique em **Gerar recibo**.
2. Preencha o período de referência e, se quiser, a descrição do espaço alugado.
3. O sistema gera um PDF numerado sequencialmente, com o valor por extenso, e o guarda
   automaticamente na lista de **Recibos** — dá para baixar quantas vezes precisar.

Este é um documento gerencial (recibo de recebimento), não uma nota fiscal.

## 11. Relatórios automáticos por e-mail

Em **Relatórios**, você configura dois tipos:

- **Semanal** — para o administrador acompanhar a qualidade dos dados lançados durante a
  semana.
- **Mensal** — voltado para o CEO, com o fechamento do mês anterior completo.

Para cada um: escolha o dia (da semana ou do mês), o horário aproximado de envio, os
destinatários (e-mails separados por vírgula) e ative o envio automático. Um botão **Gerar e
enviar agora** permite testar/forçar o envio a qualquer momento, e o **Histórico de envios**
mostra todas as tentativas, com o status (enviado ou erro, com a mensagem do erro se houver).

> O horário de envio automático pode variar em até uma hora, por causa de uma limitação do
> plano gratuito da Vercel — não é possível garantir o minuto exato.

## 12. Exportações (CSV, Excel e PDF)

Nas telas de **Contas a pagar**, **Contas a receber**, **Fluxo de caixa realizado**,
**Transferências** e **DRE gerencial**, um botão "Exportar" no topo baixa os dados que estão
sendo exibidos (respeitando os filtros ativos):

- **CSV** — abre em qualquer planilha (Excel, Google Sheets), com acentuação correta e vírgula
  como separador decimal, no padrão brasileiro.
- **Excel (.xlsx)** — já formatado, com cabeçalho colorido e colunas de valor no formato R$.
- **PDF** (só na DRE) — documento pronto para imprimir ou anexar em um e-mail, com o mesmo
  visual dos recibos de aluguel.

Exportar exige a permissão "Exportar relatórios" — peça ao administrador se o botão não
aparecer para você.

## 13. Auditoria

Mostra o histórico de ações realizadas no sistema: quem criou, editou, pagou, cancelou,
importou, exportou etc., e quando. Use os filtros por entidade (ex.: só "Lançamento"), por ação
(ex.: só "Cancelou") e por período. Útil para investigar uma divergência ou simplesmente
acompanhar o que está acontecendo no dia a dia. Exige a permissão "Visualizar logs de
auditoria". Os registros não podem ser editados nem apagados por ninguém — nem pelo
administrador — para garantir que a trilha seja sempre confiável.

## 14. Usuários e permissões

Só para administradores. Nesta tela você:

- Vê todos os usuários da organização, com papel e situação.
- **Ativa/desativa** um operador — desativar não apaga nada, só impede o login.
- **Ajusta permissões individuais** — clique em "Ajustar permissões" ao lado de um operador
  para abrir a lista completa de permissões, agrupadas por categoria. Para cada uma, escolha:
  - **Padrão do papel** — segue o que o papel Operador concede por padrão (marcado com ✓
    quando o padrão já inclui aquela permissão).
  - **Conceder** — dá esse acesso especificamente a este usuário, além do padrão.
  - **Revogar** — tira esse acesso deste usuário, mesmo que o padrão do papel o concedesse.

Para **criar um novo usuário**, use o painel do Supabase (Authentication → Users) — o
procedimento passo a passo está no README (seção 4), porque envolve confirmar o e-mail e
definir o papel diretamente no banco.

## 15. Backup e restauração

Em **Configurações**, administradores encontram o botão **Gerar backup completo**. Ele baixa
uma planilha Excel com uma aba para cada tabela do sistema (lançamentos, liquidações,
transferências, todos os cadastros, recibos, configurações de relatório etc.) — uma cópia
legível de tudo o que está no banco.

Recomendação: gere esse backup pelo menos uma vez por mês (ou antes de qualquer alteração
grande no sistema) e guarde o arquivo em um local seguro (Google Drive, por exemplo).

**Sobre restauração:** não existe um botão de "restaurar" na interface — de propósito. Trazer
de volta dados de um backup é uma operação delicada (pode sobrescrever informações mais
recentes por engano) e por isso é tratada como um procedimento técnico, não uma ação de um
clique. Se um dia for necessário restaurar dados a partir de um backup, é um trabalho pontual
de quem administra o banco de dados (Supabase), usando o arquivo Excel gerado como referência
dos valores a recriar — não é uma tarefa do dia a dia do usuário do sistema.

## 16. Cadastros

Base para os lançamentos:

- **Plano de contas** — estrutura em três níveis (Família → Categoria → Subcategoria). Cada
  categoria define se entra no resultado operacional da DRE, se é financeira/investimento/outra,
  e como afeta o fluxo de caixa. É a fonte de verdade única — nunca precisa reconfigurar essa
  regra em mais de um lugar.

  > Se a mesma conta bancária empresarial paga tanto despesas da empresa quanto despesas
  > pessoais dos sócios, crie uma categoria específica para isso (natureza gerencial "Pessoa
  > física", comportamento na DRE "Não incluir"). Não é preciso ter uma conta bancária separada
  > — o sistema já reconhece essa categoria e trata o valor como movimentação de sócios em
  > todos os relatórios, mesmo saindo da conta empresarial.
- **Centros de custo** — para saber em qual "área" cada despesa/receita pertence.
- **Contas bancárias** — cadastre com a titularidade correta (empresarial ou pessoa física); só
  contas empresariais entram no dashboard e nos relatórios por padrão.
- **Contrapartes** — clientes, fornecedores, locatários, sócios etc. Uma contraparte pode ter
  mais de um "tipo" ao mesmo tempo.
- **Formas de pagamento** — Pix, boleto, cartão, transferência etc.

Todo cadastro pode ser **ativado/desativado** em vez de excluído — histórico é sempre
preservado.

## 17. Perguntas frequentes

**Um lançamento cancelado aparece em algum relatório?**
Não. Assim que cancelado, ele sai de qualquer soma ou projeção.

**Por que uma despesa some do resultado operacional da DRE, mesmo estando com o status
"Pago"?**
Verifique a categoria dela no plano de contas — se ela estiver marcada como "fora do
resultado" (financeira, investimento ou outra) ou "não incluir" (movimentação de sócio), ela
aparece em outra seção da DRE, separada do resultado operacional. É intencional.

**Consigo desfazer uma exclusão?**
Não existe exclusão de dados neste sistema — só desativação (cadastros) ou cancelamento
(lançamentos), que preservam o histórico e podem ser revertidos.

**Esqueci de anexar um comprovante — dá para adicionar depois?**
Sim, na tela de detalhe do lançamento, mesmo depois de pago.

**Uma exportação demorou muito ou falhou — isso afeta os dados?**
Não. Exportar é uma operação só de leitura; nunca altera nada no sistema, mesmo que a geração
do arquivo falhe.
