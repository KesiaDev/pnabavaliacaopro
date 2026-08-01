DROP POLICY IF EXISTS evaluation_snapshots_select ON public.evaluation_snapshots;
DROP POLICY IF EXISTS evaluation_snapshots_insert ON public.evaluation_snapshots;
CREATE POLICY evaluation_snapshots_select ON public.evaluation_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administradora') OR public.has_role(auth.uid(),'auditor'));
CREATE POLICY evaluation_snapshots_insert ON public.evaluation_snapshots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'administradora') AND approved_by = auth.uid());

DROP POLICY IF EXISTS edital_costs_select ON public.edital_costs;
CREATE POLICY edital_costs_select ON public.edital_costs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administradora') OR public.has_role(auth.uid(),'auditor'));