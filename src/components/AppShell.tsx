import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  Wrench,
  Users,
  ShieldCheck,
  Menu,
  Banknote,
  Download,
  Plus,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ModalDownloads } from "@/components/ModalDownloads";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/ordens", label: "Ordens de serviço", icon: Wrench },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Banknote },
  { to: "/usuarios", label: "Administração", icon: ShieldCheck },
] as const;

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [modalDownloadsAberto, setModalDownloadsAberto] = useState(false);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/75 backdrop-blur-xl print:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/painel" className="min-w-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Menus no Desktop */}
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                  activeProps={{
                    className: "bg-secondary text-foreground shadow-sm shadow-black/20 font-semibold",
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalDownloadsAberto(true)}
              className="gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/10 shadow-sm cursor-pointer"
              title="Central de Downloads — Aplicativos para Android e Windows"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Downloads</span>
            </Button>

            <Button variant="ghost" size="icon" onClick={sair} aria-label="Sair" title="Sair do sistema">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setAberto((v) => !v)}
              aria-label="Abrir menu"
            >
              {aberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Drawer Dropdown Mobile */}
        {aberto && (
          <nav className="grid gap-1 border-t border-border/60 bg-card/95 backdrop-blur-xl px-4 py-2.5 md:hidden shadow-xl animate-in slide-in-from-top-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-2 py-1">
              Todos os Menus do Sistema
            </span>
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                activeProps={{ className: "bg-secondary text-primary font-bold" }}
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border/60 my-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setModalDownloadsAberto(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Download className="h-4 w-4 shrink-0" />
                Downloads (Android & Windows)
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Conteúdo Principal com padding inferior para a barra mobile */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-8">
        <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate text-2xl font-bold">{title}</h1>
          {actions}
        </div>
        {children}
      </main>

      {/* BARRA INFERIOR FIXA DE NAVEGAÇÃO NO MOBILE (Android / PWA) */}
      <nav
        aria-label="Navegação móvel rápida"
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border/80 bg-card/95 py-1.5 px-2 backdrop-blur-xl md:hidden shadow-lg shadow-black/50 print:hidden"
      >
        <Link
          to="/painel"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-95"
          activeProps={{ className: "text-primary font-bold" }}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Painel</span>
        </Link>

        <Link
          to="/ordens"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-95"
          activeProps={{ className: "text-primary font-bold" }}
        >
          <Wrench className="h-5 w-5" />
          <span>Ordens</span>
        </Link>

        {/* Botão de Destaque central para Nova Ordem de Serviço */}
        <Link
          to="/ordens/nova"
          className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-90"
          title="Nova Ordem de Serviço"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </Link>

        <Link
          to="/clientes"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-95"
          activeProps={{ className: "text-primary font-bold" }}
        >
          <Users className="h-5 w-5" />
          <span>Clientes</span>
        </Link>

        <Link
          to="/financeiro"
          className="flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-all hover:text-foreground active:scale-95"
          activeProps={{ className: "text-primary font-bold" }}
        >
          <Banknote className="h-5 w-5" />
          <span>Financeiro</span>
        </Link>
      </nav>

      <ModalDownloads open={modalDownloadsAberto} onClose={() => setModalDownloadsAberto(false)} />
    </div>
  );
}
