import { ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useEditalContext } from "@/contexts/edital-context";
import { EDITAL_STATUS_LABEL } from "@/lib/queries/editais";

export function EditalSwitcher() {
  const { edital, editais, switchEdital, loading } = useEditalContext();

  return (
    <div className="space-y-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          className="w-full flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left text-sm text-sidebar-foreground hover:bg-sidebar-accent/70 transition-colors"
          aria-label="Trocar de edital"
        >
          <span className="flex-1 truncate font-medium">
            {loading
              ? "Carregando…"
              : edital
                ? `Edital ${edital.number}/${edital.year}`
                : "Selecionar edital"}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-60 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs">Editais</DropdownMenuLabel>
          {editais.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => switchEdital(item.id)}
              className="flex items-start gap-2"
            >
              <Check
                className={cn(
                  "w-3.5 h-3.5 mt-0.5 shrink-0",
                  item.id === edital?.id ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="min-w-0">
                <span className="block text-sm truncate">
                  Edital {item.number}/{item.year}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {EDITAL_STATUS_LABEL[item.status]} · {item.name}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to={"/editais" as string}>Ver todos os editais</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={"/editais/novo" as string}>Criar novo edital</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="text-[11px] text-sidebar-foreground/70 px-0.5">
        Status: {edital ? EDITAL_STATUS_LABEL[edital.status] : "—"}
      </div>
    </div>
  );
}
