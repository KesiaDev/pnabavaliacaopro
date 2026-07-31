DROP POLICY IF EXISTS cost_entries_select ON public.cost_entries;
CREATE POLICY cost_entries_select ON public.cost_entries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'administradora') OR public.has_role(auth.uid(),'auditor'));