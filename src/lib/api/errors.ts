// Erro rico da API — nunca deixamos a interface mostrar só "Internal Server Error".
// Todo erro carrega etapa, mensagem, código, se o trabalho foi preservado e se
// pode ser repetido.
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly stage?: string;
  readonly retryable: boolean;
  readonly preserved: boolean;
  readonly details?: unknown;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    stage?: string;
    retryable?: boolean;
    preserved?: boolean;
    details?: unknown;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.stage = init.stage;
    this.retryable = init.retryable ?? false;
    this.preserved = init.preserved ?? true;
    this.details = init.details;
  }

  static network(message: string): ApiError {
    return new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message:
        message ||
        "Não foi possível falar com o serviço de análise. Verifique a conexão e tente novamente.",
      retryable: true,
      preserved: true,
    });
  }

  static notConfigured(): ApiError {
    return new ApiError({
      status: 0,
      code: "API_NOT_CONFIGURED",
      message:
        "O endereço do serviço de análise (VITE_API_BASE_URL) ainda não foi configurado neste ambiente.",
      retryable: false,
      preserved: true,
    });
  }
}

export function describeError(error: unknown): {
  title: string;
  code: string;
  stage?: string;
  message: string;
  retryable: boolean;
  preserved: boolean;
} {
  if (error instanceof ApiError) {
    return {
      title:
        error.status === 401
          ? "Sessão expirada"
          : error.stage
            ? `Falha na etapa ${error.stage}`
            : "Falha na requisição",
      code: error.code,
      stage: error.stage,
      message: error.message,
      retryable: error.retryable,
      preserved: error.preserved,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    title: "Falha inesperada",
    code: "UNKNOWN",
    message: message || "Ocorreu um erro sem descrição.",
    retryable: true,
    preserved: true,
  };
}
