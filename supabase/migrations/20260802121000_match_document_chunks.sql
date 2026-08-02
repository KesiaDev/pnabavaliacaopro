-- PNAB Avaliação Pro | Fase 7 — busca semântica por similaridade
-- Os agentes de avaliação (evidencias_a_c, evidencias_d_g) não podem
-- receber o proponente inteiro numa chamada só (ADR-9): um proponente real
-- já visto em teste tinha 102 chunks, ~120k tokens, muito acima do
-- razoável em custo/contexto pra um único critério. Esta função devolve só
-- os N chunks mais relevantes pra uma consulta (embedding calculado pelo
-- Worker a partir do texto oficial do critério), usando o índice HNSW já
-- criado na Fase 6 -- nunca sai do Postgres, o Worker só manda o vetor da
-- consulta (pequeno) e recebe de volta o texto já filtrado.
create or replace function public.match_document_chunks(
  p_proponent_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 20
)
returns table (
  id uuid,
  file_id uuid,
  pagina_inicial integer,
  pagina_final integer,
  texto text,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select dc.id, dc.file_id, dc.pagina_inicial, dc.pagina_final, dc.texto,
         1 - (ce.embedding <=> p_query_embedding) as similarity
  from public.document_chunks dc
  join public.chunk_embeddings ce on ce.chunk_id = dc.id
  where dc.proponent_id = p_proponent_id
  order by ce.embedding <=> p_query_embedding
  limit p_match_count;
$$;

grant execute on function public.match_document_chunks to service_role;
