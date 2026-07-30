-- ============ EDITAIS ============
create type public.edital_status as enum ('rascunho','configuracao','ativo','pausado','encerrado','arquivado');
create type public.criterion_evaluation_mode as enum ('ai','deterministic','hybrid','human');
create type public.job_stage_state as enum ('aguardando','na_fila','processando','concluido','falhou','revisao','cancelado');

create table public.editais (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  year integer not null,
  name text not null,
  cycle text,
  organ text,
  status public.edital_status not null default 'rascunho',
  max_individual_score integer not null default 100,
  normative_version_id uuid,
  drive_source_id uuid references public.drive_sources(id) on delete set null,
  closed_at timestamptz,
  closed_reason text,
  reopened_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (number, year)
);
grant select, insert, update, delete on public.editais to authenticated;
grant all on public.editais to service_role;
alter table public.editais enable row level security;
create policy "editais_select" on public.editais for select to authenticated using (true);
create policy "editais_admin_write" on public.editais for all to authenticated
  using (public.has_role(auth.uid(),'administradora'))
  with check (public.has_role(auth.uid(),'administradora'));

-- ============ CRITÉRIOS ============
create table public.edital_criteria (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  code text not null,
  title text not null,
  description text not null default '',
  maximum_score integer not null,
  eliminatory boolean not null default false,
  bonus boolean not null default false,
  order_index integer not null default 0,
  evaluation_mode public.criterion_evaluation_mode not null default 'hybrid',
  rubric jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (edital_id, code)
);
grant select, insert, update, delete on public.edital_criteria to authenticated;
grant all on public.edital_criteria to service_role;
alter table public.edital_criteria enable row level security;
create policy "edital_criteria_select" on public.edital_criteria for select to authenticated using (true);
create policy "edital_criteria_admin_write" on public.edital_criteria for all to authenticated
  using (public.has_role(auth.uid(),'administradora'))
  with check (public.has_role(auth.uid(),'administradora'));

-- ============ CATEGORIAS / SEGMENTOS ============
create table public.edital_categories (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (edital_id, name)
);
grant select, insert, update, delete on public.edital_categories to authenticated;
grant all on public.edital_categories to service_role;
alter table public.edital_categories enable row level security;
create policy "edital_categories_select" on public.edital_categories for select to authenticated using (true);
create policy "edital_categories_admin_write" on public.edital_categories for all to authenticated
  using (public.has_role(auth.uid(),'administradora'))
  with check (public.has_role(auth.uid(),'administradora'));

create table public.edital_segments (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  category_id uuid references public.edital_categories(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.edital_segments to authenticated;
grant all on public.edital_segments to service_role;
alter table public.edital_segments enable row level security;
create policy "edital_segments_select" on public.edital_segments for select to authenticated using (true);
create policy "edital_segments_admin_write" on public.edital_segments for all to authenticated
  using (public.has_role(auth.uid(),'administradora'))
  with check (public.has_role(auth.uid(),'administradora'));

-- ============ CUSTOS ============
create table public.edital_costs (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null unique references public.editais(id) on delete cascade,
  budget_total numeric(12,4) not null default 0,
  limit_per_application numeric(12,4) not null default 0,
  block_on_exceed boolean not null default true,
  alert_50_sent boolean not null default false,
  alert_75_sent boolean not null default false,
  alert_90_sent boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.edital_costs to authenticated;
grant all on public.edital_costs to service_role;
alter table public.edital_costs enable row level security;
create policy "edital_costs_select" on public.edital_costs for select to authenticated using (true);
create policy "edital_costs_admin_write" on public.edital_costs for all to authenticated
  using (public.has_role(auth.uid(),'administradora'))
  with check (public.has_role(auth.uid(),'administradora'));

create table public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  proponent_id uuid references public.proponents(id) on delete set null,
  stage text not null,
  model text not null,
  input_tokens bigint not null default 0,
  cached_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
create index cost_entries_edital_idx on public.cost_entries(edital_id);
create index cost_entries_proponent_idx on public.cost_entries(proponent_id);
grant select on public.cost_entries to authenticated;
grant all on public.cost_entries to service_role;
alter table public.cost_entries enable row level security;
create policy "cost_entries_select" on public.cost_entries for select to authenticated using (true);

-- ============ PROCESSAMENTO ============
create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  proponent_id uuid references public.proponents(id) on delete cascade,
  external_job_id text,
  status public.job_stage_state not null default 'aguardando',
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  triggered_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index processing_jobs_edital_idx on public.processing_jobs(edital_id);
create index processing_jobs_proponent_idx on public.processing_jobs(proponent_id);
grant select on public.processing_jobs to authenticated;
grant all on public.processing_jobs to service_role;
alter table public.processing_jobs enable row level security;
create policy "processing_jobs_select" on public.processing_jobs for select to authenticated using (true);

create table public.job_stages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.processing_jobs(id) on delete cascade,
  stage text not null,
  order_index integer not null default 0,
  state public.job_stage_state not null default 'aguardando',
  attempts integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  error_message text,
  retryable boolean not null default true,
  preserved boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (job_id, stage)
);
create index job_stages_job_idx on public.job_stages(job_id);
grant select on public.job_stages to authenticated;
grant all on public.job_stages to service_role;
alter table public.job_stages enable row level security;
create policy "job_stages_select" on public.job_stages for select to authenticated using (true);

-- ============ SNAPSHOT IMUTÁVEL ============
create table public.evaluation_snapshots (
  id uuid primary key default gen_random_uuid(),
  edital_id uuid not null references public.editais(id) on delete cascade,
  proponent_id uuid not null references public.proponents(id) on delete cascade,
  evaluation_id uuid,
  approved_by uuid,
  approved_at timestamptz not null default now(),
  normative_version text,
  payload jsonb not null
);
create index evaluation_snapshots_proponent_idx on public.evaluation_snapshots(proponent_id);
grant select, insert on public.evaluation_snapshots to authenticated;
grant select, insert on public.evaluation_snapshots to service_role;
alter table public.evaluation_snapshots enable row level security;
create policy "evaluation_snapshots_select" on public.evaluation_snapshots for select to authenticated using (true);
create policy "evaluation_snapshots_insert" on public.evaluation_snapshots for insert to authenticated with check (true);

-- ============ VÍNCULO COM EDITAL NAS TABELAS EXISTENTES ============
alter table public.proponents      add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.files           add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.evaluations     add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.evidence        add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.pareceres       add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.sync_runs       add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.drive_sources   add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.criterion_scores add column if not exists edital_id uuid references public.editais(id) on delete cascade;
alter table public.flags           add column if not exists edital_id uuid references public.editais(id) on delete cascade;

create index if not exists proponents_edital_idx on public.proponents(edital_id);
create index if not exists files_edital_idx on public.files(edital_id);
create index if not exists evaluations_edital_idx on public.evaluations(edital_id);
create index if not exists evidence_edital_idx on public.evidence(edital_id);

-- ============ SEED EDITAL 120/2026 ============
insert into public.editais (id, number, year, name, cycle, organ, status, max_individual_score)
values ('b1200000-0000-4000-8000-000000000120', '120', 2026,
        'Edital nº 120/2026 — Fomento à Cultura', 'Ciclo 2',
        'Secretaria Municipal de Cultura', 'rascunho', 120);

insert into public.edital_criteria (edital_id, code, title, description, maximum_score, eliminatory, bonus, order_index, evaluation_mode) values
('b1200000-0000-4000-8000-000000000120','A','Qualidade do projeto','Clareza, consistência e qualidade técnica da proposta apresentada.',20,true,false,1,'hybrid'),
('b1200000-0000-4000-8000-000000000120','B','Relevância cultural local','Aderência e relevância da proposta para o contexto cultural do território.',20,true,false,2,'hybrid'),
('b1200000-0000-4000-8000-000000000120','C','Integração comunitária','Envolvimento e participação da comunidade na execução da proposta.',20,true,false,3,'hybrid'),
('b1200000-0000-4000-8000-000000000120','D','Orçamento e cronograma','Coerência entre orçamento, cronograma e as atividades previstas.',10,true,false,4,'deterministic'),
('b1200000-0000-4000-8000-000000000120','E','Plano de divulgação','Estratégia de comunicação e alcance previsto para a proposta.',10,true,false,5,'hybrid'),
('b1200000-0000-4000-8000-000000000120','F','Ficha técnica','Composição e qualificação da equipe envolvida no projeto.',10,true,false,6,'hybrid'),
('b1200000-0000-4000-8000-000000000120','G','Trajetória','Trajetória e experiência comprovada do proponente.',10,true,false,7,'hybrid'),
('b1200000-0000-4000-8000-000000000120','H','Bônus territorial','Proponente sediado em território prioritário definido no edital.',5,false,true,8,'deterministic'),
('b1200000-0000-4000-8000-000000000120','I','Ação afirmativa','Enquadramento em ação afirmativa prevista no edital.',5,false,true,9,'deterministic'),
('b1200000-0000-4000-8000-000000000120','J','PNAB Ciclo 1','Participação comprovada no Ciclo 1 da PNAB.',10,false,true,10,'deterministic');

insert into public.edital_costs (edital_id, budget_total, limit_per_application)
values ('b1200000-0000-4000-8000-000000000120', 0, 0);