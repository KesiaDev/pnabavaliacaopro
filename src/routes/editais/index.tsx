import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Coins, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { EDITAL_STATUS_LABEL, EDITAL_STATUS_TONE, useEditaisOverview } from "@/lib/queries/editais";
import { formatCurrency } from "@/lib/queries/costs";

export const Route = createFileRoute("/editais/")({
  head: () => ({
    meta: [
      { title: "Editais — PNAB Avaliação Pro" },
      {
        name: "description",
        content:
          "Selecione ou crie um edital para conduzir a avaliação documental assistida com revisão humana.",
      },
      { property: "og:title", content: "Editais — PNAB Avaliação Pro" },
      {
        property: "og:description",
        content: "Selecione ou crie um edital para conduzir a avaliação documental assistida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditaisPage,
});

function EditaisPage() {
  const { data, isLoading } = useEditaisOverview();

  return (
    <AppShell
      title="Editais"
      subtitle="Cada edital é um espaço isolado: proponentes, critérios, custos e histórico próprios."
      actions={
        <Button asChild size="sm">
          <Link to={"/editais/novo" as string}>
            <Plus className="w-4 h-4 mr-1.5" />
            Novo edital
          </Link>
        </Button>
      }
    >
      {isLoading && <p className="text-sm text-muted-foreground">Carregando editais…</p>}

      {!isLoading && !data?.length && (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum edital cadastrado. Crie o primeiro para começar.
            </p>
            <Button asChild>
              <Link to={"/editais/novo" as string}>Criar edital</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((edital) => (
          <Card key={edital.id} className="flex flex-col">
            <CardContent className="pt-6 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-serif text-lg leading-tight">
                    Edital {edital.number}/{edital.year}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{edital.name}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 font-normal", EDITAL_STATUS_TONE[edital.status])}
                >
                  {EDITAL_STATUS_LABEL[edital.status]}
                </Badge>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {edital.applicationsCount} proponentes
                </div>
                <div className="text-muted-foreground">
                  {edital.approvedCount} aprovados
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Coins className="w-3.5 h-3.5" />
                  {formatCurrency(edital.accumulatedCost)}
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {edital.lastSyncAt
                    ? new Date(edital.lastSyncAt).toLocaleDateString("pt-BR")
                    : "sem sync"}
                </div>
              </dl>

              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to={`/editais/${edital.id}/painel` as string}>
                  Abrir edital
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
