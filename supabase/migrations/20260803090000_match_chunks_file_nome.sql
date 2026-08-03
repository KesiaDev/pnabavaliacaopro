-- As citações "[N]" que a IA escreve dentro da justificativa de cada
-- critério eram números efêmeros: só faziam sentido dentro da própria
-- chamada que os gerou (renumerados do zero a cada critério/grupo) e nunca
-- eram resolvidos pra um arquivo/página reais em nenhum lugar -- a
-- avaliadora não tinha como saber a que documento "[6]" se referia.
-- Adiciona o nome do arquivo ao retorno de match_document_chunks pra o
-- Worker poder substituir "[N]" por uma referência real (nome do arquivo +
-- página) antes de salvar a justificativa.
drop function if exists public.match_document_chunks(uuid, extensions.vector(1536), integer);

create function public.match_document_chunks(
  p_proponent_id uuid,
  p_query_embedding extensions.vector(1536),
  p_match_count integer default 20
)
returns table (
  id uuid,
  file_id uuid,
  file_nome text,
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
  select dc.id, dc.file_id, f.nome, dc.pagina_inicial, dc.pagina_final, dc.texto,
         1 - (ce.embedding <=> p_query_embedding) as similarity
  from public.document_chunks dc
  join public.chunk_embeddings ce on ce.chunk_id = dc.id
  join public.files f on f.id = dc.file_id
  where dc.proponent_id = p_proponent_id
  order by ce.embedding <=> p_query_embedding
  limit p_match_count;
$$;

revoke execute on function public.match_document_chunks(uuid, extensions.vector(1536), integer)
  from public, anon, authenticated;
grant execute on function public.match_document_chunks(uuid, extensions.vector(1536), integer) to service_role;
