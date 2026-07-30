import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  FolderSync,
  Users,
  ShieldCheck,
  History,
  BookMarked,
  LogOut,
  Search,
  Cpu,
  Coins,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentProfile, useCurrentRoles } from "@/lib/queries/current-user";
import { ROLE_LABEL } from "@/lib/mock-data";
import { EditalSwitcher } from "@/components/edital-switcher";
import { useEditalContext } from "@/contexts/edital-context";

const NAV: Array<{
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { path: "/painel", label: "Painel", icon: LayoutDashboard },
  { path: "/fonte-documental", label: "Fonte documental", icon: FolderSync },
  { path: "/proponentes", label: "Proponentes", icon: Users },
  { path: "/processamento", label: "Processamento", icon: Cpu },
  { path: "/mudancas", label: "Mudanças", icon: History },
  { path: "/auditoria", label: "Auditoria", icon: ShieldCheck },
  { path: "/custos", label: "Custos", icon: Coins },
  { path: "/documentos-normativos", label: "Documentos normativos", icon: BookMarked },
  { path: "/configuracao", label: "Configuração", icon: SlidersHorizontal },
];

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile } = useCurrentProfile();
  const { data: roles } = useCurrentRoles();
  const { editalId, edital, readOnly } = useEditalContext();

  const displayName = profile?.display_name ?? user?.email ?? "—";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = roles?.length
    ? roles.map((r) => ROLE_LABEL[r]).join(" · ")
    : "Sem papel atribuído";

  const base = editalId ? `/editais/${editalId}` : "/editais";
  const editalLabel = edital
    ? `Edital ${edital.number}/${edital.year}`
    : "Nenhum edital selecionado";

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background paper-texture flex">
      <aside className="w-72 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="px-6 pt-7 pb-5 border-b border-sidebar-border space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              PNAB · Caxias do Sul
            </div>
            <h1 className="font-serif text-xl leading-tight mt-1.5 text-sidebar-foreground">
              Avaliação Assistida
            </h1>
          </div>
          <EditalSwitcher />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon }) => {
            const to = `${base}${path}`;
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={path}
                to={to as string}
                disabled={!editalId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  !editalId && "pointer-events-none opacity-40",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </nav>


        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-serif text-sm">
              {initials || "—"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">{roleLabel}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {readOnly && (
          <div className="px-8 py-2 bg-warning/15 border-b border-warning/40 text-[12px] text-warning-foreground flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            Edital encerrado — modo somente leitura. Consulta e exportação continuam liberadas.
          </div>
        )}
        <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
          <div className="px-8 py-5 flex items-center gap-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-2xl text-foreground leading-tight">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proponente, arquivo, evidência…"
                className="pl-9 bg-card"
              />
            </div>
            {actions}
          </div>
        </header>
        <main className="flex-1 px-8 py-8">{children}</main>
        <footer className="px-8 py-4 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span>PNAB · Caxias · {editalLabel} · Nota individual — Viviane da Rocha Palma</span>
          <span className="font-mono">Revisão humana obrigatória</span>
        </footer>
      </div>
    </div>

  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "neutral" | "info" | "warning" | "success" | "danger";
  children: ReactNode;
}) {
  const toneClass = {
    neutral: "bg-muted text-muted-foreground border-border",
    info: "bg-info/10 text-info border-info/30",
    warning: "bg-warning/15 text-warning-foreground border-warning/40",
    success: "bg-success/10 text-success border-success/30",
    danger: "bg-destructive/10 text-destructive border-destructive/30",
  }[tone];
  return (
    <Badge variant="outline" className={cn("font-normal text-[11px]", toneClass)}>
      {children}
    </Badge>
  );
}
