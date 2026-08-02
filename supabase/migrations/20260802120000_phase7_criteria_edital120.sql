-- PNAB Avaliação Pro | Fase 7 — critérios reais do Edital 120/2026 (Anexo III)
-- A seed anterior (migração 20260730153244) usou títulos/descrições
-- placeholder -- este arquivo substitui pelo texto oficial do edital lido do
-- PDF, e corrige três problemas de schema descobertos ao comparar com o
-- texto real:
--   1. criterion_scores/evidence só aceitavam A-G (CHECK constraint) --
--      o Edital 120 tem bônus H/I/J, que ficariam impossíveis de gravar.
--   2. seed_criterion_scores() semeava 7 linhas fixas com os tetos do
--      Edital 119 (A=20,B=50,C=10...) em TODO proponente novo, ignorando o
--      edital real do proponente -- corrigido pra semear a partir de
--      edital_criteria, dinâmico por edital.
--   3. recompute_evaluation() tratava A-E como obrigatório e F-G como
--      bônus, hard-coded -- corrigido pra derivar de
--      edital_criteria.eliminatory/bonus do edital real do proponente.

-- 1) Textos reais do Anexo III (Edital 120/2026)
update public.edital_criteria set
  title = 'Qualidade do projeto',
  description = 'Coerência do objeto, dos objetivos, da justificativa e das metas do projeto. A análise deve considerar se o conteúdo do projeto apresenta, como um todo, coerência entre objeto, justificativa e metas, sendo possível visualizar de forma evidente os resultados que serão obtidos.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'A';

update public.edital_criteria set
  title = 'Relevância cultural local',
  description = 'Relevância da ação proposta para o cenário cultural do Município de Caxias do Sul. A análise deve considerar se a ação contribui para o enriquecimento e a valorização da cultura local.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'B';

update public.edital_criteria set
  title = 'Integração comunitária',
  description = 'Aspectos de integração comunitária na ação proposta. Considera-se, para fins de avaliação, se o projeto apresenta aspectos de integração comunitária em relação ao impacto social para a inclusão de pessoas negras, indígenas, com deficiência, mulheres, LGBTQIAPN+, idosos, crianças e demais grupos em situação de vulnerabilidade econômica e/ou social.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'C';

update public.edital_criteria set
  title = 'Orçamento e cronograma',
  description = 'Coerência da planilha orçamentária e do cronograma de execução com as metas, resultados e desdobramentos do projeto. A análise deve avaliar a viabilidade técnica do projeto do ponto de vista dos gastos previstos, sua execução e a adequação ao objeto, metas e objetivos, além da coerência e conformidade dos valores e quantidades dos itens da planilha orçamentária.',
  evaluation_mode = 'hybrid'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'D';

update public.edital_criteria set
  title = 'Plano de divulgação',
  description = 'Coerência do plano de divulgação com o cronograma, os objetivos e as metas do projeto. A análise deve avaliar a viabilidade técnica e comunicacional com o público-alvo, mediante as estratégias, mídias e materiais apresentados, bem como a capacidade de executá-los.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'E';

update public.edital_criteria set
  title = 'Ficha técnica',
  description = 'Compatibilidade da ficha técnica com as atividades desenvolvidas. A análise deve considerar a carreira dos profissionais que compõem o corpo técnico e artístico, verificando a coerência entre suas atribuições no projeto e seus currículos.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'F';

update public.edital_criteria set
  title = 'Trajetória',
  description = 'Trajetória artística e cultural do agente cultural. Será considerada, para fins de análise, a carreira do agente cultural com base no currículo e nas comprovações enviadas junto com a proposta.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'G';

update public.edital_criteria set
  title = 'Bônus territorial',
  description = 'Projeto prevê ações em áreas periféricas, urbanas e rurais, em territórios e regiões de maior vulnerabilidade econômica ou social, bem como em áreas de povos e comunidades tradicionais, no Município de Caxias do Sul.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'H';

update public.edital_criteria set
  title = 'Ação afirmativa',
  description = 'Pessoa física: agente cultural mulher ou pessoa LGBTQIAPN+. Pessoa jurídica ou coletivo/grupo sem CNPJ: quadro/equipe composto majoritariamente por mulheres ou pessoas LGBTQIAPN+.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'I';

update public.edital_criteria set
  title = 'PNAB Ciclo 1',
  description = 'Agente cultural (pessoa física, jurídica ou coletivo/grupo) não teve projeto aprovado no Município de Caxias do Sul com recursos da PNAB — Ciclo 1.'
where edital_id = 'b1200000-0000-4000-8000-000000000120' and code = 'J';

-- 2) CHECK constraints só aceitavam A-G -- Edital 120 tem bônus H/I/J
alter table public.criterion_scores drop constraint if exists criterion_scores_criterion_check;
alter table public.criterion_scores add constraint criterion_scores_criterion_check
  check (criterion in ('A','B','C','D','E','F','G','H','I','J'));

alter table public.evidence drop constraint if exists evidence_criterion_check;
alter table public.evidence add constraint evidence_criterion_check
  check (criterion in ('A','B','C','D','E','F','G','H','I','J'));

-- 3) seed_criterion_scores() semeava 7 linhas fixas com os tetos do Edital
-- 119 em todo proponente novo, ignorando edital_criteria -- agora semeia
-- dinamicamente a partir do edital real do proponente.
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

-- 4) recompute_evaluation() tratava A-E/F-G como obrigatório/bônus,
-- hard-coded pro Edital 119 -- agora deriva de
-- edital_criteria.eliminatory/bonus do edital real do proponente.
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

-- 5) Backfill: os 44 proponentes já sincronizados nasceram com o seed
-- antigo (7 linhas A-G, tetos do Edital 119: B=50, C/D/E=10...) antes desta
-- correção. Nunca apaga linha nenhuma (uma nota humana já registrada é
-- irreversível por design, ver ADR-6/[[feedback-pnab-human-review]]):
--   a) corrige o teto das linhas ainda sem nota da avaliadora;
--   b) insere as linhas que faltam (H/I/J, e qualquer A-G ausente).
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
