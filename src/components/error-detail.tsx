import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeError } from "@/lib/api/errors";

/**
 * Erro sempre com contexto: etapa, mensagem, código, se o trabalho foi
 * preservado e ação de repetir. Nunca apenas "Internal Server Error".
 */
export function ErrorDetail({
  error,
  onRetry,
  stageLabel,
}: {
  error: unknown;
  onRetry?: () => void;
  stageLabel?: string;
}) {
  if (!error) return null;
  const info = describeError(error);

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{stageLabel ? `${info.title} — ${stageLabel}` : info.title}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-sm">{info.message}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono opacity-80">
          <span>código: {info.code}</span>
          {info.stage && <span>etapa: {info.stage}</span>}
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            {info.preserved
              ? "trabalho anterior preservado"
              : "trabalho da etapa não foi preservado"}
          </span>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} disabled={!info.retryable}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            {info.retryable ? "Repetir" : "Não pode ser repetido automaticamente"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
