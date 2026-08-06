-- Bug real encontrado ao vivo: a minuta de parecer da Associacao Literaria
-- Sao Boaventura (Edital 120) fechou com uma nota individual diferente da
-- "Nota final dos agentes" mostrada na aba Avaliacao -- ambas deveriam ser
-- a mesma soma. Rastreado ate recompute_evaluation() (trigger em
-- criterion_scores, ver 20260718120000_phase1_schema.sql e a revisao em
-- 20260802120000_phase7_criteria_edital120.sql): soma so
-- cs.approved_score, sem cair pra cs.proposed_score quando a avaliadora
-- ainda nao salvou manualmente aquele criterio especifico. Como SUM()
-- ignora NULL silenciosamente, todo criterio ainda nao revisado contribuia
-- ZERO pontos pra evaluations.individual_total -- nao a nota proposta pelo
-- agente. Isso e diferente do padrao usado em todo o resto do app
-- (parecer.ts: cs.approvedScore ?? cs.proposedScore; a mesma convencao em
-- painel.tsx/proponentes-lista.tsx) e explica por que a minuta gerada (que
-- le evaluations.individual_total via getEvaluationContext) podia fechar
-- com um total menor do que o esperado mesmo depois de aprovada -- se
-- algum criterio nunca teve approved_score gravado manualmente e so foi
-- preenchido depois (ex.: edicao pontual pos-aprovacao, ou timing entre o
-- clique de "Gerar nova minuta" e o preenchimento do ultimo criterio).
--
-- Correcao: mesma queda pra proposed_score usada em todo o resto do
-- sistema -- nunca mais soma um criterio como zero so por falta de
-- confirmacao humana explicita.
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
    coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.eliminatory), 0),
    coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.bonus), 0),
    bool_or(coalesce(cs.approved_score, cs.proposed_score) = 0 and ec.eliminatory)
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

-- Backfill: recalcula evaluations pra todo proponente ja existente com a
-- formula corrigida, de uma vez (equivalente a disparar o trigger pra cada
-- proponente, mas sem precisar tocar em criterion_scores linha a linha).
insert into public.evaluations (proponent_id, edital_id, mandatory_subtotal, bonus_subtotal, individual_total, zero_in_mandatory_criterion)
select
  cs.proponent_id,
  p.edital_id,
  coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.eliminatory), 0),
  coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.bonus), 0),
  coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.eliminatory), 0)
    + coalesce(sum(coalesce(cs.approved_score, cs.proposed_score)) filter (where ec.bonus), 0),
  bool_or(coalesce(cs.approved_score, cs.proposed_score) = 0 and ec.eliminatory)
from public.criterion_scores cs
join public.proponents p on p.id = cs.proponent_id
join public.edital_criteria ec on ec.edital_id = p.edital_id and ec.code = cs.criterion
group by cs.proponent_id, p.edital_id
on conflict (proponent_id) do update set
  mandatory_subtotal = excluded.mandatory_subtotal,
  bonus_subtotal = excluded.bonus_subtotal,
  individual_total = excluded.individual_total,
  zero_in_mandatory_criterion = excluded.zero_in_mandatory_criterion,
  edital_id = excluded.edital_id;
