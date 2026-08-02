alter table public.criterion_scores drop constraint if exists criterion_scores_criterion_check;
alter table public.criterion_scores add constraint criterion_scores_criterion_check
  check (criterion in ('A','B','C','D','E','F','G','H','I','J'));

alter table public.evidence drop constraint if exists evidence_criterion_check;
alter table public.evidence add constraint evidence_criterion_check
  check (criterion in ('A','B','C','D','E','F','G','H','I','J'));

create or replace function public.seed_criterion_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.criterion_scores (proponent_id, criterion, max_score, edital_id)
  select new.id, ec.code, ec.maximum_score, ec.edital_id
  from public.edital_criteria ec
  where ec.edital_id = new.edital_id
  on conflict (proponent_id, criterion) do nothing;
  return new;
end;
$$;

create or replace function public.recompute_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proponent_id uuid := coalesce(new.proponent_id, old.proponent_id);
  v_edital_id uuid;
  v_mandatory integer;
  v_bonus integer;
  v_zero boolean;
begin
  select edital_id into v_edital_id from public.proponents where id = v_proponent_id;

  select
    coalesce(sum(cs.approved_score) filter (where ec.eliminatory), 0),
    coalesce(sum(cs.approved_score) filter (where ec.bonus), 0),
    bool_or(cs.approved_score = 0 and ec.eliminatory)
  into v_mandatory, v_bonus, v_zero
  from public.criterion_scores cs
  join public.edital_criteria ec on ec.edital_id = v_edital_id and ec.code = cs.criterion
  where cs.proponent_id = v_proponent_id;

  insert into public.evaluations (proponent_id, edital_id, mandatory_subtotal, bonus_subtotal, individual_total, zero_in_mandatory_criterion)
  values (v_proponent_id, v_edital_id, coalesce(v_mandatory, 0), coalesce(v_bonus, 0), coalesce(v_mandatory, 0) + coalesce(v_bonus, 0), coalesce(v_zero, false))
  on conflict (proponent_id) do update set
    mandatory_subtotal = excluded.mandatory_subtotal,
    bonus_subtotal = excluded.bonus_subtotal,
    individual_total = excluded.individual_total,
    zero_in_mandatory_criterion = excluded.zero_in_mandatory_criterion,
    edital_id = excluded.edital_id;

  return coalesce(new, old);
end;
$$;

update public.criterion_scores cs
set max_score = ec.maximum_score
from public.edital_criteria ec
where ec.edital_id = 'b1200000-0000-4000-8000-000000000120'
  and ec.code = cs.criterion
  and cs.proponent_id in (
    select id from public.proponents where edital_id = 'b1200000-0000-4000-8000-000000000120'
  )
  and cs.approved_score is null
  and cs.max_score <> ec.maximum_score;

insert into public.criterion_scores (proponent_id, criterion, max_score, edital_id)
select p.id, ec.code, ec.maximum_score, ec.edital_id
from public.proponents p
join public.edital_criteria ec on ec.edital_id = p.edital_id
where p.edital_id = 'b1200000-0000-4000-8000-000000000120'
on conflict (proponent_id, criterion) do nothing;

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