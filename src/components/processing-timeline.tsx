import {
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  STAGE_LABEL,
  STAGE_STATE_LABEL,
  type JobStage,
  type ProcessingJob,
  type ProcessingStage,
  type StageState,
} from "@/lib/api/types";
import { formatCurrency } from "@/lib/queries/costs";

const STATE_ICON: Record<StageState, typeof Clock> = {
  aguardando: CircleDashed,
  na_fila: Clock,
  processando: Loader2,
  concluido: CheckCircle2,
  falhou: XCircle,
  revisao: ShieldAlert,
  cancelado: Square,
};

const STATE_TONE: Record<StageState, string> = {
  aguardando: "text-muted-foreground",
  na_fila: "text-amber-600 dark:text-amber-400",
  processando: "text-primary",
  concluido: "text-emerald-600 dark:text-emerald-400",
  falhou: "text-destructive",
  revisao: "text-orange-600 dark:text-orange-400",
  cancelado: "text-muted-foreground line-through",
};

export function ProcessingTimeline({
  job,
  onRetryStage,
  onShowCost,
  disabled,
}: {
  job: ProcessingJob | null;
  onRetryStage?: (stage: ProcessingStage) => void;
  onShowCost?: (stage: ProcessingStage) => void;
  disabled?: boolean;
}) {
  const stages: JobStage[] = job?.stages ?? [];

  if (!stages.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum processamento iniciado para este proponente ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-1">
      {stages.map((stage) => {
        const Icon = STATE_ICON[stage.state];
        return (
          <li
            key={stage.stage}
            className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-muted/40"
          >
            <Icon
              className={cn(
                "w-4 h-4 mt-0.5 shrink-0",
                STATE_TONE[stage.state],
                stage.state === "processando" && "animate-spin",
              )}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{STAGE_LABEL[stage.stage]}</span>
                <span className={cn("text-[11px] font-mono", STATE_TONE[stage.state])}>
                  {STAGE_STATE_LABEL[stage.state]}
                </span>
                {stage.attempts > 1 && (
                  <span className="text-[11px] text-muted-foreground">
                    {stage.attempts} tentativas
                  </span>
                )}
                {typeof stage.cost === "number" && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {formatCurrency(stage.cost)}
                  </span>
                )}
              </div>
              {stage.errorMessage && (
                <p className="text-xs text-destructive mt-0.5">
                  {stage.errorCode ? `[${stage.errorCode}] ` : ""}
                  {stage.errorMessage}
                  {stage.preserved ? " · trabalho anterior preservado" : ""}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onShowCost && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => onShowCost(stage.stage)}
                >
                  Ver custo
                </Button>
              )}
              {onRetryStage && stage.state === "falhou" && stage.retryable && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={disabled}
                  onClick={() => onRetryStage(stage.stage)}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Repetir etapa
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ProcessingActions({
  running,
  disabled,
  onStart,
  onPause,
  onCancel,
  onRetry,
}: {
  running: boolean;
  disabled?: boolean;
  onStart: () => void;
  onPause: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={onStart} disabled={disabled || running}>
        <Play className="w-3.5 h-3.5 mr-1.5" />
        Iniciar
      </Button>
      <Button size="sm" variant="outline" onClick={onPause} disabled={disabled || !running}>
        <Pause className="w-3.5 h-3.5 mr-1.5" />
        Pausar
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel} disabled={disabled || !running}>
        <Square className="w-3.5 h-3.5 mr-1.5" />
        Cancelar
      </Button>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={disabled || running}>
        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        Repetir
      </Button>
      <p className="basis-full text-xs text-muted-foreground pt-1">
        Você pode fechar esta página: o processamento continua no servidor.
      </p>
    </div>
  );
}
