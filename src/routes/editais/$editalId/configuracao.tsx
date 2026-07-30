import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusBadge } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorDetail } from "@/components/error-detail";
import { useEditalContext } from "@/contexts/edital-context";
import {
  EDITAL_STATUS_LABEL,
  useEditalCriteria,
  useUpdateEditalStatus,
} from "@/lib/queries/editais";

export const Route = createFileRoute("/editais/$editalId/configuracao")({
  head: () => ({
    meta: [
      { title: "Configuração do edital — PNAB Avaliação Pro" },
      {
        name: "description",
        content: "Critérios, pontuação máxima e ciclo de vida do edital (encerrar e reabrir).",
      },
      { property: "og:title", content: "Configuração do edital — PNAB Avaliação Pro" },
      { property: "og:description", content: "Critérios e ciclo de vida do edital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfiguracaoPage,
});

function ConfiguracaoPage() {
  const { editalId } = useParams({ from: "/editais/$editalId/configuracao" });
  const { edital, readOnly } = useEditalContext();
  const { data: criteria, error } = useEditalCriteria(editalId);
  const updateStatus = useUpdateEditalStatus();
  const [reason, setReason] = useState("");

  const total = (criteria ?? []).reduce((acc, c) => acc + c.maximumScore, 0);

  return (
    <AppShell
      title="Configuração do edital"
      subtitle="Os critérios governam toda a avaliação. Alterações não recalculam notas já aprovadas."
    >
      {error && <ErrorDetail error={error} />}

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
            <Field label="Edital" value={edital ? `${edital.number}/${edital.year}` : "—"} />
            <Field label="Nome" value={edital?.name ?? "—"} />
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <StatusBadge tone={readOnly ? "neutral" : "success"}>
                {edital ? EDITAL_STATUS_LABEL[edital.status] : "—"}
              </StatusBadge>
            </div>
            <Field
              label="Nota individual máxima"
              value={String(edital?.maxIndividualScore ?? "—")}
            />
            <Field label="Soma dos critérios" value={String(total)} />
            <Field label="Avaliadora" value="Viviane da Rocha Palma" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Critérios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!criteria?.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum critério cadastrado para este edital.
              </p>
            )}
            {(criteria ?? []).map((c) => (
              <div
                key={c.code}
                className="flex items-start gap-3 border-b border-border/60 pb-2 last:border-0"
              >
                <span className="font-mono text-sm w-6 shrink-0">{c.code}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{c.title}</div>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <div className="font-mono text-sm">{c.maximumScore} pts</div>
                  <div className="flex gap-1 justify-end">
                    {c.eliminatory && <StatusBadge tone="danger">eliminatório</StatusBadge>}
                    {c.bonus && <StatusBadge tone="info">bônus</StatusBadge>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ciclo de vida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Encerrar congela o edital: nada de novas análises, apenas consulta e exportação.
              Reabrir exige justificativa e fica registrado na auditoria.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="reason">Justificativa</Label>
              <Textarea
                id="reason"
                rows={2}
                value={reason}
                placeholder="Motivo do encerramento ou da reabertura"
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={readOnly || updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({ editalId, status: "encerrado", reason })
                }
              >
                Encerrar edital
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!readOnly || !reason.trim() || updateStatus.isPending}
                onClick={() => updateStatus.mutate({ editalId, status: "ativo", reason })}
              >
                Reabrir com justificativa
              </Button>
            </div>
            {updateStatus.error && <ErrorDetail error={updateStatus.error} />}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
