import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  CHAVE_ULTIMA_INTERACAO,
  TEMPO_AVISO_INATIVIDADE_MS,
  TEMPO_INATIVIDADE_MS,
  encerrarSessaoPorInatividade,
  obterUltimaInteracao,
  registrarInteracao,
  sessaoExpirouPorInatividade,
} from "@/lib/inatividade";

const EVENTOS_INTERACAO: Array<keyof WindowEventMap> = [
  "mousedown",
  "mousemove",
  "keydown",
  "touchstart",
  "touchmove",
  "pointerdown",
  "wheel",
  "scroll",
  "click",
];

const ID_TOAST_AVISO = "aviso-inatividade-sessao";

/**
 * Monitora continuamente as interações do usuário nas rotas autenticadas e
 * solicita login novamente caso não haja interação dentro de 30 minutos.
 */
export function useMonitorInatividade(): void {
  const queryClient = useQueryClient();
  const avisoExibidoParaRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (obterUltimaInteracao() === null) {
      registrarInteracao(true);
    }

    const verificarInatividade = () => {
      if (sessaoExpirouPorInatividade()) {
        toast.dismiss(ID_TOAST_AVISO);
        void encerrarSessaoPorInatividade(queryClient);
        return true;
      }

      const ultima = obterUltimaInteracao();
      if (ultima === null) return false;

      const decorrido = Date.now() - ultima;
      if (
        decorrido >= TEMPO_AVISO_INATIVIDADE_MS &&
        decorrido < TEMPO_INATIVIDADE_MS &&
        avisoExibidoParaRef.current !== ultima
      ) {
        avisoExibidoParaRef.current = ultima;
        toast.warning(
          "Você está sem interação há 29 minutos. Por segurança, o login será solicitado novamente em 1 minuto.",
          {
            id: ID_TOAST_AVISO,
            duration: 15000,
          },
        );
      }

      return false;
    };

    const aoInteragir = () => {
      // Se os 30 minutos já tiverem expirado (ex.: dispositivo em suspensão), exige novo login em vez de renovar
      if (verificarInatividade()) return;

      registrarInteracao();
      if (avisoExibidoParaRef.current !== null) {
        avisoExibidoParaRef.current = null;
        toast.dismiss(ID_TOAST_AVISO);
      }
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") {
        verificarInatividade();
      }
    };

    const aoReceberStorage = (e: StorageEvent) => {
      if (e.key !== CHAVE_ULTIMA_INTERACAO) return;

      if (e.newValue === null) {
        void queryClient.invalidateQueries();
        return;
      }

      if (avisoExibidoParaRef.current !== null) {
        avisoExibidoParaRef.current = null;
        toast.dismiss(ID_TOAST_AVISO);
      }
    };

    verificarInatividade();

    for (const evento of EVENTOS_INTERACAO) {
      window.addEventListener(evento, aoInteragir, { passive: true, capture: true });
    }
    window.addEventListener("focus", verificarInatividade);
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    window.addEventListener("storage", aoReceberStorage);

    const intervalo = window.setInterval(verificarInatividade, 15_000);

    return () => {
      for (const evento of EVENTOS_INTERACAO) {
        window.removeEventListener(evento, aoInteragir, { capture: true });
      }
      window.removeEventListener("focus", verificarInatividade);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
      window.removeEventListener("storage", aoReceberStorage);
      window.clearInterval(intervalo);
      toast.dismiss(ID_TOAST_AVISO);
    };
  }, [queryClient]);
}
