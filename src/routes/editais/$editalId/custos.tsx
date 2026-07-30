import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ErrorDetail } from "@/components/error-detail";
import { useEditalContext } from "@/contexts/edital-context";
import {
  costAlertLevel,
  formatCurrency,
  useEditalCosts,
  useUpdateCostConfig,
} from "@/lib/queries/costs";

export const Route = createFileRoute("/editais/$editalId/custos")({
  head: () => ({
    meta: [
      { title: "Custos — PNAB Avaliação Pro" },
      {
        name: "description",
        content:
          "Orçamento, consumo por proponente, etapa e modelo, com alertas de 50%, 75% e 90%.",
      },
      { property: "og:title", content: "Custos — PNAB Avaliação Pro" },
      { property: "og:description", content: "Orçamento e consumo de análise do edital." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustosPage,
});

function CustosPage() {
  const { editalId } = useParams({ from: "/editais/$editalId/custos" });
  const { readOnly } = useEditalContext();
  const { data, isLoading, error, refetch } = useEditalCosts(editalId);
  const update = useUpdateCostConfig(editalId);

  const [budget, setBudget] = useState("0");
  const [limit, setLimit] = useState("0");
  const [block, setBlock] = useState(true);

  useEffect(() => {
    if (!data?.config) return;
    setBudget(String(data.config.budget_total ?? 0));
    setLimit(String(data.config.limit_per_application ?? 0));
    setBlock(data.config.block_on_exceed ?? true);
  }, [data?.config]);

  const alert = data ? costAlertLevel(data.usedRatio) : null;

  return (
    <AppShell title="Custos" subtitle="Cada chamada de análise é registrada e somada ao edital.">
      {error && <ErrorDetail error={error} onRetry={() => refetch()} />}
      {isLoading && <p className="text-sm text-muted-foreground">Carregando custos…</p>}

      {data && (
        <div className="space-y-6">
          {alert && (
            <Alert variant={alert >= 90 ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Orçamento em {alert}% ou mais</AlertTitle>
              <AlertDescription>
                Consumido {formatCurrency(data.consumed)} de {formatCurrency(data.budget)}.
                {data.config?.block_on_exceed
                  ? " Novas análises serão bloqueadas ao ultrapassar o teto."
                  : " O bloqueio automático está desligado."}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Orçamento do edital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>{formatCurrency(data.consumed)} consumidos</span>
                  <span className="text-muted-foreground">{formatCurrency(data.budget)}</span>
                </div>
                <Progress value={Math.min(100, data.usedRatio * 100)} />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="budget">Orçamento total (R$)</Label>
                  <Input
                    id="budget"
                    inputMode="decimal"
                    value={budget}
                    disabled={readOnly}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="limit">Limite por proponente (R$)</Label>
                  <Input
                    id="limit"
                    inputMode="decimal"
                    value={limit}
                    disabled={readOnly}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Switch
                    id="block"
                    checked={block}
                    disabled={readOnly}
                    onCheckedChange={setBlock}
                  />
                  <Label htmlFor="block" className="text-sm font-normal">
                    Bloquear ao exceder
                  </Label>
                </div>
              </div>

              <Button
                size="sm"
                disabled={readOnly || update.isPending}
                onClick={() =>
                  update.mutate({
                    budgetTotal: Number(budget) || 0,
                    limitPerApplication: Number(limit) || 0,
                    blockOnExceed: block,
                  })
                }
              >
                Salvar limites
              </Button>
              {update.error && <ErrorDetail error={update.error} />}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <CostBreakdown title="Por proponente" buckets={data.byApplication} />
            <CostBreakdown title="Por etapa" buckets={data.byStage} />
            <CostBreakdown title="Por modelo" buckets={data.byModel} />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function CostBreakdown({
  title,
  buckets,
}: {
  title: string;
  buckets: { key: string; label: string; inputTokens: number; cachedTokens: number; outputTokens: number; cost: number }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!buckets.length && (
          <p className="text-sm text-muted-foreground">Nenhum consumo registrado.</p>
        )}
        {buckets.map((b) => (
          <div key={b.key} className="text-sm border-b border-border/60 pb-2 last:border-0">
            <div className="flex justify-between gap-3">
              <span className="truncate">{b.label}</span>
              <span className="font-mono shrink-0">{formatCurrency(b.cost)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              entrada {b.inputTokens} · cache {b.cachedTokens} · saída {b.outputTokens}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
