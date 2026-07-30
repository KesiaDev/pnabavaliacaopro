# PNAB Avaliação Pro — de edital único para produto multiedital

Transformar a cópia atual (feita sob medida para o Edital 119/2026) em uma plataforma que atende vários editais, começando pelo Edital 120/2026, sem quebrar o que já está aprovado visualmente e sem tocar nos dados do 119.

---

## 1. Inventário do que existe hoje

**Telas (rotas)**
| Rota | O que faz | Situação |
|---|---|---|
| `/` | Painel com cartões de resumo | Reaproveitar |
| `/fonte-documental` | Conexão Google Drive, pasta-fonte, sincronização | Reaproveitar |
| `/proponentes` | Lista de proponentes | Reaproveitar |
| `/proponentes/:id` | Ficha completa: avaliação, dossiê, evidências, parecer (877 linhas) | Reaproveitar, dividir em partes |
| `/mudancas` | Mudanças detectadas no Drive | Reaproveitar |
| `/auditoria` | Trilha de auditoria | Reaproveitar |
| `/documentos-normativos` | Documentos de referência | Reaproveitar |
| `/login`, `/reset-password` | Autenticação | Reaproveitar sem mudança |

**Camada de dados**
- Consultas: `proponents`, `agents`, `drive`, `current-user`
- Ações no servidor: agentes de avaliação, importação do Drive, OAuth Google, geração da ficha `.odt`
- Banco: 24 tabelas com regras de acesso e papéis já configurados

**Onde o "119" está fixo no código**
- Textos e rótulos nas telas ("Edital 119/2026")
- Critérios A–G com pontuação máxima 100 gravados dentro de uma função do banco
- Regra de zerar critério obrigatório embutida no banco
- Modelo da ficha oficial fixo no arquivo de template

---

## 2. Componentes reaproveitados sem alteração visual

Barra lateral e cabeçalho, cartões do painel, tabela de proponentes, abas do proponente, painel de revisão humana por critério, matriz de evidências, visualizador de dossiê, tela de auditoria, tela de mudanças, geração da ficha. Todo o conjunto de componentes de interface permanece.

Nenhum componente funcional é apagado nesta fase. O que muda é: cada um passa a receber o edital ativo como contexto, em vez de assumir o 119.

---

## 3. Arquivos afetados

**Novos**
```
src/contexts/edital-context.tsx        seletor e edital ativo
src/lib/api/client.ts                  cliente HTTP do Railway
src/lib/api/interceptor.ts             token, renovação, 401
src/lib/api/types.ts                   contratos tipados
src/lib/api/endpoints/*.ts             editais, drive, applications, jobs, avaliações, custos, exportações
src/lib/queries/editais.ts
src/lib/queries/jobs.ts
src/lib/queries/costs.ts
src/lib/realtime/use-realtime.ts       Realtime + fallback de sondagem
src/components/edital-switcher.tsx
src/components/processing-timeline.tsx
src/components/error-detail.tsx
src/routes/editais/*                   12 rotas novas
src/lib/seeds/edital-120.ts
```

**Modificados**
```
src/components/app-shell.tsx           seletor de edital + navegação por editalId
src/routes/index.tsx                   vira /editais/:editalId/painel
src/routes/proponentes/*               movidas para dentro do edital, divididas em abas
src/routes/fonte-documental.tsx        vinculada ao edital
src/routes/mudancas.tsx
src/routes/auditoria.tsx
src/routes/documentos-normativos.tsx
src/lib/queries/*.ts                   toda chave de cache ganha editalId
src/routes/__root.tsx                  provedor do contexto de edital
.env                                   VITE_API_BASE_URL, VITE_APP_ENV
```

**Intocados**: login, redefinição de senha, biblioteca de componentes, tema visual.

---

## 4. Plano de execução (entregas pequenas e reversíveis)

**Etapa 1 — Fundação**
Migrações do banco (tabelas de edital, critérios configuráveis, custos, jobs). Coluna `edital_id` adicionada como opcional nas tabelas existentes, sem apagar nada.

**Etapa 2 — Cliente do Railway**
Cliente tipado com todos os endpoints, envio automático do token do Supabase, renovação de sessão, tratamento de 401 e erros detalhados.

**Etapa 3 — Contexto e seletor de edital**
`EditalContext`, seletor na barra lateral, limpeza de cache na troca, sincronização com a URL.

**Etapa 4 — Rotas por edital**
Novas rotas `/editais/:editalId/...`. As rotas antigas passam a redirecionar. Nada é removido de imediato.

**Etapa 5 — Listagem e assistente de novo edital**
Tela `/editais` com todas as colunas e ações pedidas. Assistente de 6 etapas com validação por Zod. Semente do Edital 120 (A–G obrigatórios, H–J bônus, máximo 120).

**Etapa 6 — Processamento assíncrono**
Linha do tempo das 11 etapas com os 7 estados, ações de iniciar/pausar/cancelar/repetir, Realtime com sondagem de reserva. Fechar a página não cancela o trabalho.

**Etapa 7 — Revisão humana e aprovação**
Rótulos "Nota proposta pela análise assistida" e "Nota individual da avaliadora". Lista de exigências para aprovar e registro imutável no momento da aprovação.

**Etapa 8 — Custos**
Painel por edital, proponente, etapa e modelo. Orçamentos, bloqueio e alertas em 50%, 75% e 90%.

**Etapa 9 — Edital encerrado**
Bloqueio de execução, sincronização e edição. Consulta e exportação liberadas. Reabertura só com justificativa registrada.

**Etapa 10 — Testes**
Unitários, de componente e de ponta a ponta para os nove cenários pedidos.

---

## 5. Riscos

| Risco | Como tratar |
|---|---|
| Vazamento de cache entre editais | Todas as chaves de cache começam com o identificador do edital; limpeza explícita na troca |
| Critérios do 119 estão dentro de funções do banco | Substituir por tabela de critérios configuráveis, mantendo os do 119 como registros |
| Ficha oficial é um modelo fixo do 119 | Vincular o modelo ao edital; o 120 recebe o seu |
| Rotas antigas em links salvos | Redirecionamento permanente para o edital padrão |
| Realtime pode cair | Sondagem de reserva a cada poucos segundos enquanto houver trabalho em andamento |
| Análise já existente usava a IA da plataforma | Nesta versão toda análise sai pelo Railway; o caminho antigo é desativado, não apagado |
| Tela do proponente muito grande | Dividir em componentes por aba antes de acrescentar as três abas novas |

---

## 6. Migrações necessárias

1. `editais` — número, ano, nome, ciclo, órgão, status, nota máxima, versão normativa
2. `edital_criteria` — código, título, descrição, nota máxima, eliminatório, bônus, ordem, modo de avaliação, rubrica
3. `edital_categories` / `edital_segments`
4. `edital_costs` e `cost_entries` — orçamento, limite por proponente, alertas, consumo por etapa e modelo
5. `processing_jobs` e `job_stages` — etapa, estado, tentativas, erro
6. `edital_id` adicionado a proponentes, arquivos, avaliações, evidências, pareceres, sincronizações e auditoria
7. `evaluation_snapshots` — registro imutável da aprovação
8. Regras de acesso e permissões para cada tabela nova
9. Critérios do Edital 120 inseridos como dados iniciais

Nenhuma coluna ou tabela é removida.

---

## 7. Contratos com o Railway

Todas as chamadas levam `Authorization: Bearer <token do Supabase>`.

```
Editais      GET/POST /v1/editais · GET/PATCH /v1/editais/:id
             POST /v1/editais/:id/publish|close|reopen
Drive        POST /v1/drive/oauth/start · GET /v1/drive/oauth/callback
             POST /v1/editais/:id/drive-source · POST /v1/editais/:id/sync
             GET  /v1/sync-runs/:id
Inscrições   GET /v1/editais/:id/applications · GET /v1/applications/:id
             POST /v1/applications/:id/process|evaluate|retry|cancel
Trabalhos    GET /v1/jobs/:id · GET /v1/applications/:id/jobs
             POST /v1/jobs/:id/retry-stage
Avaliação    GET /v1/applications/:id/evidence|evaluation
             PATCH /v1/evaluations/:id/criteria/:code
             POST  /v1/evaluations/:id/approve|reopen
Exportações  POST /v1/exports/evaluation-sheet · POST /v1/exports/summary
Custos       GET /v1/editais/:id/costs
```

Formato de erro esperado, para nunca mostrar apenas "erro interno":
```json
{ "code": "STAGE_FAILED", "stage": "extracao_textual",
  "message": "...", "retryable": true, "preserved": true }
```

---

## 8. Confirmações necessárias antes de codificar

1. O Railway já existe e responde nesses endereços, ou o frontend deve funcionar com dados simulados até ele ficar pronto?
2. As tabelas de edital devem ser criadas neste banco (Lovable Cloud) ou o Railway é dono do esquema e o Supabase guarda só autenticação?
3. Esta cópia começa vazia (nenhum proponente do 119) — confirma que posso limpar os dados de exemplo?
