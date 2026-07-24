import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireAdministradora(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "administradora",
  });
  if (error || !data) {
    throw new Error("Apenas a administradora pode executar esta ação.");
  }
}

export async function getAuthorizedAdminSupabase(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  await requireAdministradora(supabase, userId);
  return supabaseAdmin;
}

export async function reapStuckRuns(
  supabase: SupabaseClient<Database>,
  proponentId: string,
) {
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  await supabase
    .from("agent_runs")
    .update({
      status: "erro",
      finished_at: new Date().toISOString(),
      error_message:
        "Execução interrompida (provável timeout ou limite de memória do Worker). Reexecute os agentes.",
    })
    .eq("proponent_id", proponentId)
    .eq("status", "em_andamento")
    .lt("started_at", cutoff);
}