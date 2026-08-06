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