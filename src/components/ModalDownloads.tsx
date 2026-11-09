import { useState, useEffect } from "react";
import {
  Smartphone,
  Download,
  CheckCircle2,
  ExternalLink,
  X,
  Sparkles,
  Monitor,
  Laptop,
  Layers,
  Package,
  Info,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function ModalDownloads({
  open,
  onClose,
  abaInicial = "todos",
}: {
  open: boolean;
  onClose: () => void;
  abaInicial?: "todos" | "android" | "windows";
}) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<"todos" | "android" | "windows">(abaInicial);

  useEffect(() => {
    if (open) {
      setAbaAtiva(abaInicial);
    }
  }, [open, abaInicial]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Verifica se já está executando no modo aplicativo independente (standalone)
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("Aplicativo BR3 Tech instalado com sucesso!");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallPwa() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
      const isWindows = typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);

      if (isAndroid) {
        toast.info(
          "Para instalar no Android: No Chrome, toque nos 3 pontinhos (⋮) no topo e selecione 'Instalar aplicativo' ou 'Adicionar à tela inicial'.",
          { duration: 6000 },
        );
      } else if (isWindows) {
        toast.info(
          "Para instalar no Windows: No Chrome ou Edge, clique no ícone de instalar na barra de endereços (ou menu ⋮ -> 'Instalar BR3 Tech').",
          { duration: 6000 },
        );
      } else {
        toast.info(
          "Para instalar: Abra o menu do navegador e escolha 'Instalar aplicativo' ou 'Adicionar à tela de início'.",
          { duration: 5000 },
        );
      }
    }
  }

  if (!open) return null;

  const currentUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md animate-in fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Download className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Central de Downloads — BR3 Tech
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  v2.2 Atualizada
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Baixe e instale as novas versões oficiais para <strong>Android</strong> e{" "}
                <strong>Windows</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Abas de Plataforma */}
        <div className="flex border-b border-border/80 gap-2">
          <button
            type="button"
            onClick={() => setAbaAtiva("todos")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              abaAtiva === "todos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Todos os Aplicativos</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("android")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              abaAtiva === "android"
                ? "border-emerald-500 text-emerald-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Android (APK & App)</span>
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("windows")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              abaAtiva === "windows"
                ? "border-sky-500 text-sky-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>Windows (.exe & Desktop)</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO ANDROID                                                             */}
        {/* ========================================================================= */}
        {(abaAtiva === "todos" || abaAtiva === "android") && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-emerald-500" />
                <h4 className="font-bold text-sm text-foreground">
                  Versão Android — Celular e Tablet
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                Android 7.0+
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Opção 1: Instalação Direta (WebAPK / PWA) */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs mb-1">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>Instalação Instantânea no Celular</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Cria automaticamente o aplicativo nativo (WebAPK) com ícone na gaveta de apps,
                    tela cheia, suporte à câmera e carregamento instantâneo offline.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleInstallPwa}
                    className="w-full gap-2 font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>
                      {isInstalled ? "Aplicativo Já Instalado!" : "Instalar no meu Android"}
                    </span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Chrome: toque em <strong>(⋮)</strong> e selecione <em>"Instalar aplicativo"</em>
                  </p>
                </div>
              </div>

              {/* Opção 2: Pacote APK Físico */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs mb-1">
                    <Package className="h-4 w-4 text-emerald-500" />
                    <span>Pacote Instalador .APK (Sideload)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Arquivo binário físico <strong>.APK</strong> para envio por WhatsApp, backup ou
                    instalação manual em bancada técnica sem Play Store.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 font-bold text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                  >
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Gerar Pacote .APK Atualizado</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                    </a>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center font-mono truncate">
                    URL: {currentUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO WINDOWS                                                             */}
        {/* ========================================================================= */}
        {(abaAtiva === "todos" || abaAtiva === "windows") && (
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-sky-500" />
                <h4 className="font-bold text-sm text-foreground">
                  Versão Windows — Computador & Bancada Técnica
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded">
                Windows 10 / 11 (64-bit)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Opção 1: Aplicativo de Bancada Windows (PWA Desktop) */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs mb-1">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    <span>Aplicativo Nativo de Bancada (Desktop)</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Executa em janela independente sem barras de navegador, cria atalho na Área de
                    Trabalho e no menu Iniciar, com suporte nativo a impressão direta (Térmica 80mm e
                    A4).
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={handleInstallPwa}
                    className="w-full gap-2 font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-sm cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Instalar Aplicativo no Windows</span>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    No Edge/Chrome: clique no ícone de instalação na barra de URL
                  </p>
                </div>
              </div>

              {/* Opção 2: Gerador de Instalador .EXE / MSI para Windows */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-foreground text-xs mb-1">
                    <Laptop className="h-4 w-4 text-sky-500" />
                    <span>Instalador Executável .EXE / MSI</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Pacote oficial de distribuição empacotado para instalação corporativa via setup
                    executável Windows ou Microsoft Store.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full gap-2 font-bold text-xs border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                  >
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                      <span>Gerar Instalador Windows (.exe)</span>
                      <ExternalLink className="h-3 w-3 ml-auto opacity-70" />
                    </a>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center font-mono truncate">
                    Microsoft PWABuilder Windows SDK
                  </p>
                </div>
              </div>
            </div>

            {/* Vantagens na Bancada */}
            <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-1 text-[11px] text-muted-foreground">
              <span className="font-bold text-foreground block flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-500" /> Destaques da versão Windows:
              </span>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                <li>Impressão rápida em impressoras térmicas não-fiscais (80mm) sem diálogo extra.</li>
                <li>Atalhos de teclado rápidos para abertura de OS e busca de clientes.</li>
                <li>Atualizações em segundo plano automáticas sem necessidade de reinstalação.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
          <span className="text-muted-foreground text-[11px]">
            © BR3 Tech — Todos os direitos reservados.
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

// Exporta também com o nome antigo para total retrocompatibilidade
export { ModalDownloads as InstallAppModal };
