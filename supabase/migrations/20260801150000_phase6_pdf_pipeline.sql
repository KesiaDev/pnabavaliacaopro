-- PNAB Avaliação Pro | Fase 6 — pipeline de PDF (ADR-9)
-- Nunca manda o PDF inteiro pra nenhum agente: extrai texto página a
-- página, mede qualidade, renderiza em imagem só as páginas que precisam
-- de visão computacional, fragmenta em chunks e indexa por embedding pra
-- busca híbrida filtrada por proponent_id.

create extension if not exists vector with schema extensions;

create type public.page_quality as enum ('boa', 'baixa', 'imagem_pura');

-- 1. Texto extraído por página (pdftotext -layout, uma página por linha)
create table public.document_pages (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files(id) on delete cascade,
  file_version_id uuid not null references public.file_versions(id) on delete cascade,
  numero_pagina integer not null,
  texto text not null default '',
  text_length integer not null default 0,
  printable_ratio numeric,
  qualidade public.page_quality not null default 'boa',
  precisa_visao boolean not null default false,
  storage_path_imagem text,
  created_at timestamptz not null default now(),
  unique (file_version_id, numero_pagina)
);
create index document_pages_file_idx on public.document_pages(file_id);
create index document_pages_version_idx on public.document_pages(file_version_id);

-- 2. Chunks (900–1400 tokens, overlap 120–200) prontos pra embedding
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  proponent_id uuid not null references public.proponents(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete cascade,
  file_version_id uuid not null references public.file_versions(id) on delete cascade,
  pagina_inicial integer not null,
  pagina_final integer not null,
  ordem integer not null,
  texto text not null,
  tokens_estimados integer not null default 0,
  created_at timestamptz not null default now(),
  unique (file_version_id, ordem)
);
create index document_chunks_proponent_idx on public.document_chunks(proponent_id);
create index document_chunks_file_idx on public.document_chunks(file_id);

-- 3. Embedding por chunk (text-embedding-3-small, 1536 dimensões)
create table public.chunk_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.document_chunks(id) on delete cascade unique,
  embedding extensions.vector(1536) not null,
  modelo text not null default 'text-embedding-3-small',
  created_at timestamptz not null default now()
);
create index chunk_embeddings_hnsw
  on public.chunk_embeddings using hnsw (embedding extensions.vector_cosine_ops);

alter table public.document_pages enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chunk_embeddings enable row level security;

-- Mesmo padrão de acesso de evidence/document_classifications: leitura pra
-- administradora/auditor, escrita só pra administradora (o Worker grava via
-- endpoint interno com supabaseAdmin, que ignora RLS).
create policy "administradora and auditor read document_pages"
  on public.document_pages for select
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes document_pages"
  on public.document_pages for all
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create policy "administradora and auditor read document_chunks"
  on public.document_chunks for select
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes document_chunks"
  on public.document_chunks for all
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create policy "administradora and auditor read chunk_embeddings"
  on public.chunk_embeddings for select
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes chunk_embeddings"
  on public.chunk_embeddings for all
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create trigger audit_document_pages
  after insert or update or delete on public.document_pages
  for each row execute function public.log_audit_event();
create trigger audit_document_chunks
  after insert or update or delete on public.document_chunks
  for each row execute function public.log_audit_event();
