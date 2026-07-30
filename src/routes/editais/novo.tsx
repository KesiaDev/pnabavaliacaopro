import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ErrorDetail } from "@/components/error-detail";
import { useCreateEdital, type NewEditalPayload } from "@/lib/queries/editais";
import type { CriterionDefinition } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/editais/novo")({
  head: () => ({
    meta: [
      { title: "Novo edital — PNAB Avaliação Pro" },
      {
        name: "description",
        content:
          "Cadastre um edital: identificação, critérios de pontuação, categorias e pasta de origem.",
      },
      { property: "og:title", content: "Novo edital — PNAB Avaliação Pro" },
      { property: "og:description", content: "Cadastro de um novo edital de avaliação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NovoEditalPage,
});

const STEPS = ["Identificação", "Critérios", "Categorias", "Fonte documental", "Revisão"];

function emptyCriterion(index: number): CriterionDefinition {
  return {
    code: String.fromCharCode(65 + index),
    title: "",
    description: "",
    maximumScore: 10,
    eliminatory: false,
    bonus: false,
    orderIndex: index,
    evaluationMode: "hybrid",
    rubric: {},
  };
}

function NovoEditalPage() {
  const navigate = useNavigate();
  const create = useCreateEdital();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<NewEditalPayload>({
    number: "",
    year: new Date().getFullYear(),
    name: "",
    cycle: "",
    organ: "",
    maxIndividualScore: 110,
    criteria: [emptyCriterion(0)],
    categories: [{ name: "", segments: [] }],
    driveFolderUrl: "",
  });

  const totalCriteria = form.criteria.reduce((acc, c) => acc + (Number(c.maximumScore) || 0), 0);
  const canAdvance =
    step !== 0 || (form.number.trim().length > 0 && form.name.trim().length > 0);

  async function handleCreate() {
    const created = await create.mutateAsync(form);
    navigate({ to: `/editais/${created.id}/configuracao` as string });
  }

  return (
    <AppShell
      title="Novo edital"
      subtitle="A configuração define critérios, categorias e a origem dos documentos."
    >
      <div className="max-w-3xl space-y-6">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border",
                i === step
                  ? "border-primary bg-primary/10 text-primary"
                  : i < step
                    ? "border-border text-muted-foreground"
                    : "border-border/60 text-muted-foreground/60",
              )}
            >
              {i < step && <Check className="w-3 h-3 inline mr-1" />}
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {create.error && <ErrorDetail error={create.error} />}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{STEPS[step]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                  label="Número do edital"
                  value={form.number}
                  onChange={(v) => setForm({ ...form, number: v })}
                  placeholder="120"
                />
                <FieldInput
                  label="Ano"
                  value={String(form.year)}
                  onChange={(v) => setForm({ ...form, year: Number(v) || form.year })}
                />
                <div className="sm:col-span-2">
                  <FieldInput
                    label="Nome"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    placeholder="PNAB Ciclo 2 — Fomento a coletivos"
                  />
                </div>
                <FieldInput
                  label="Ciclo"
                  value={form.cycle ?? ""}
                  onChange={(v) => setForm({ ...form, cycle: v })}
                  placeholder="Ciclo 2"
                />
                <FieldInput
                  label="Órgão"
                  value={form.organ ?? ""}
                  onChange={(v) => setForm({ ...form, organ: v })}
                  placeholder="Secretaria da Cultura de Caxias do Sul"
                />
                <FieldInput
                  label="Nota individual máxima"
                  value={String(form.maxIndividualScore)}
                  onChange={(v) =>
                    setForm({ ...form, maxIndividualScore: Number(v) || 0 })
                  }
                />
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Soma atual: <span className="font-mono">{totalCriteria}</span> pontos.
                </p>
                {form.criteria.map((c, i) => (
                  <div key={i} className="border border-border rounded-md p-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[70px_1fr_110px_auto] items-end">
                      <FieldInput
                        label="Código"
                        value={c.code}
                        onChange={(v) => patchCriterion(i, { code: v })}
                      />
                      <FieldInput
                        label="Título"
                        value={c.title}
                        onChange={(v) => patchCriterion(i, { title: v })}
                      />
                      <FieldInput
                        label="Pontuação"
                        value={String(c.maximumScore)}
                        onChange={(v) => patchCriterion(i, { maximumScore: Number(v) || 0 })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setForm({
                            ...form,
                            criteria: form.criteria.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descrição</Label>
                      <Textarea
                        rows={2}
                        value={c.description}
                        onChange={(e) => patchCriterion(i, { description: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-6">
                      <ToggleField
                        label="Eliminatório"
                        checked={c.eliminatory}
                        onChange={(v) => patchCriterion(i, { eliminatory: v })}
                      />
                      <ToggleField
                        label="Bônus"
                        checked={c.bonus}
                        onChange={(v) => patchCriterion(i, { bonus: v })}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      criteria: [...form.criteria, emptyCriterion(form.criteria.length)],
                    })
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar critério
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {form.categories.map((cat, i) => (
                  <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                    <FieldInput
                      label="Categoria"
                      value={cat.name}
                      onChange={(v) => patchCategory(i, { name: v })}
                      placeholder="Música"
                    />
                    <FieldInput
                      label="Segmentos (separados por vírgula)"
                      value={cat.segments.join(", ")}
                      onChange={(v) =>
                        patchCategory(i, {
                          segments: v
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm({
                          ...form,
                          categories: form.categories.filter((_, idx) => idx !== i),
                        })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({ ...form, categories: [...form.categories, { name: "", segments: [] }] })
                  }
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Adicionar categoria
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <FieldInput
                  label="Pasta do Google Drive (URL ou ID)"
                  value={form.driveFolderUrl ?? ""}
                  onChange={(v) => setForm({ ...form, driveFolderUrl: v })}
                  placeholder="https://drive.google.com/drive/folders/…"
                />
                <p className="text-xs text-muted-foreground">
                  A conexão com o Drive é feita depois, na tela Fonte documental do edital. Nenhum
                  documento é analisado aqui.
                </p>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-2 text-sm">
                <Review label="Edital" value={`${form.number}/${form.year}`} />
                <Review label="Nome" value={form.name} />
                <Review label="Ciclo" value={form.cycle || "—"} />
                <Review label="Órgão" value={form.organ || "—"} />
                <Review
                  label="Critérios"
                  value={`${form.criteria.length} · ${totalCriteria} pontos`}
                />
                <Review label="Categorias" value={String(form.categories.filter((c) => c.name).length)} />
                <Review label="Pasta" value={form.driveFolderUrl || "—"} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button size="sm" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
              Avançar
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button size="sm" disabled={create.isPending} onClick={handleCreate}>
              Criar edital
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );

  function patchCriterion(index: number, patch: Partial<CriterionDefinition>) {
    setForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function patchCategory(index: number, patch: Partial<{ name: string; segments: string[] }>) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="text-xs font-normal">{label}</Label>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
