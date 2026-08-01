create extension if not exists vector with schema extensions;

create type public.page_quality as enum ('boa', 'baixa', 'imagem_pura');

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

grant select, insert, update, delete on public.document_pages to authenticated;
grant all on public.document_pages to service_role;
alter table public.document_pages enable row level security;

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

grant select, insert, update, delete on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;
alter table public.document_chunks enable row level security;

create table public.chunk_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.document_chunks(id) on delete cascade unique,
  embedding extensions.vector(1536) not null,
  modelo text not null default 'text-embedding-3-small',
  created_at timestamptz not null default now()
);
create index chunk_embeddings_hnsw
  on public.chunk_embeddings using hnsw (embedding extensions.vector_cosine_ops);

grant select, insert, update, delete on public.chunk_embeddings to authenticated;
grant all on public.chunk_embeddings to service_role;
alter table public.chunk_embeddings enable row level security;

create policy "administradora and auditor read document_pages"
  on public.document_pages for select to authenticated
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes document_pages"
  on public.document_pages for all to authenticated
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create policy "administradora and auditor read document_chunks"
  on public.document_chunks for select to authenticated
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes document_chunks"
  on public.document_chunks for all to authenticated
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create policy "administradora and auditor read chunk_embeddings"
  on public.chunk_embeddings for select to authenticated
  using (public.has_role(auth.uid(), 'administradora') or public.has_role(auth.uid(), 'auditor'));
create policy "administradora writes chunk_embeddings"
  on public.chunk_embeddings for all to authenticated
  using (public.has_role(auth.uid(), 'administradora'))
  with check (public.has_role(auth.uid(), 'administradora'));

create trigger audit_document_pages
  after insert or update or delete on public.document_pages
  for each row execute function public.log_audit_event();
create trigger audit_document_chunks
  after insert or update or delete on public.document_chunks
  for each row execute function public.log_audit_event();