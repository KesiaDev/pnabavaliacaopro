-- Bloqueia mutações diretas via Data API nas tabelas de avaliação.
-- Os agentes e ações internas passam a gravar via cliente administrativo do backend.
REVOKE INSERT, UPDATE, DELETE ON public.criterion_scores FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.evaluations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.pareceres FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.evidence FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.flags FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agent_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agent_outputs FROM authenticated;

GRANT SELECT ON public.criterion_scores TO authenticated;
GRANT SELECT ON public.evaluations TO authenticated;
GRANT SELECT ON public.pareceres TO authenticated;
GRANT SELECT ON public.evidence TO authenticated;
GRANT SELECT ON public.flags TO authenticated;
GRANT SELECT ON public.agent_runs TO authenticated;
GRANT SELECT ON public.agent_outputs TO authenticated;

GRANT ALL ON public.criterion_scores TO service_role;
GRANT ALL ON public.evaluations TO service_role;
GRANT ALL ON public.pareceres TO service_role;
GRANT ALL ON public.evidence TO service_role;
GRANT ALL ON public.flags TO service_role;
GRANT ALL ON public.agent_runs TO service_role;
GRANT ALL ON public.agent_outputs TO service_role;