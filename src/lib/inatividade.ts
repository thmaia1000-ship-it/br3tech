import type { QueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Tempo máximo permitido sem interação antes de exigir novo login (30 minutos). */
export const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;

/** Tempo após o qual é exibido um aviso prévio antes do encerramento automático (29 minutos). */
export const TEMPO_AVISO_INATIVIDADE_MS = 29 * 60 * 1000;

export const CHAVE_ULTIMA_INTERACAO = "br3tech_ultima_interacao";
export const CHAVE_MOTIVO_INATIVIDADE = "br3tech_motivo_inatividade";

const INTERVALO_THROTTLE_MS = 5000;

let ultimaGravacaoLocal = 0;
let encerramentoEmAndamento = false;

/** Retorna o timestamp (ms) da última interação registrada ou `null` caso não exista. */
export function obterUltimaInteracao(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHAVE_ULTIMA_INTERACAO);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Registra o momento atual como última interação do usuário.
 * Utiliza throttle de 5s para evitar gravações excessivas em eventos de mouse/scroll,
 * exceto quando `forcar` for `true` (ex.: no momento do login).
 */
export function registrarInteracao(forcar = false): number {
  const agora = Date.now();
  if (forcar) {
    encerramentoEmAndamento = false;
  } else if (agora - ultimaGravacaoLocal < INTERVALO_THROTTLE_MS) {
    return ultimaGravacaoLocal || agora;
  }

  ultimaGravacaoLocal = agora;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CHAVE_ULTIMA_INTERACAO, String(agora));
    } catch {
      // Ignora falhas de acesso ao storage em navegação restrita
    }
  }
  return agora;
}

/** Remove o timestamp de interação armazenado (usado no logout manual ou expiração). */
export function limparRegistroInatividade(): void {
  ultimaGravacaoLocal = 0;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CHAVE_ULTIMA_INTERACAO);
    } catch {
      // Ignora falhas de storage
    }
  }
}

/** Indica se já transcorreram 30 minutos ou mais desde a última interação registrada. */
export function sessaoExpirouPorInatividade(agora = Date.now()): boolean {
  const ultima = obterUltimaInteracao();
  if (ultima === null) return false;
  return agora - ultima >= TEMPO_INATIVIDADE_MS;
}

/** Sinaliza que o encerramento da sessão foi causado por inatividade para exibição na tela de login. */
export function marcarLogoutPorInatividade(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CHAVE_MOTIVO_INATIVIDADE, "1");
    window.localStorage.setItem(CHAVE_MOTIVO_INATIVIDADE, "1");
  } catch {
    // Ignora falhas de storage
  }
}

/** Remove a sinalização de logout por inatividade. */
export function limparMotivoInatividade(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHAVE_MOTIVO_INATIVIDADE);
    window.localStorage.removeItem(CHAVE_MOTIVO_INATIVIDADE);
  } catch {
    // Ignora falhas de storage
  }
}

/** Lê e consome a flag de encerramento por inatividade. */
export function consumirMotivoInatividade(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const emSession = window.sessionStorage.getItem(CHAVE_MOTIVO_INATIVIDADE) === "1";
    const emLocal = window.localStorage.getItem(CHAVE_MOTIVO_INATIVIDADE) === "1";
    limparMotivoInatividade();
    return emSession || emLocal;
  } catch {
    return false;
  }
}

async function finalizarSessaoPorInatividade(queryClient?: QueryClient): Promise<void> {
  limparRegistroInatividade();
  marcarLogoutPorInatividade();

  if (queryClient) {
    await queryClient.cancelQueries().catch(() => {});
    queryClient.clear();
  }

  await supabase.auth.signOut().catch(() => {});
}

/**
 * Verifica se a sessão expirou por 30 minutos sem interação; em caso positivo,
 * limpa os registros, sinaliza o motivo e encerra a sessão no Supabase, retornando `true`.
 */
export async function desconectarSeSessaoExpirou(queryClient?: QueryClient): Promise<boolean> {
  if (!sessaoExpirouPorInatividade()) return false;
  await finalizarSessaoPorInatividade(queryClient);
  return true;
}

/** Encerra a sessão no Supabase, limpa caches locais e redireciona para `/auth` exigindo novo login. */
export async function encerrarSessaoPorInatividade(queryClient?: QueryClient): Promise<void> {
  if (encerramentoEmAndamento) return;
  encerramentoEmAndamento = true;

  try {
    await finalizarSessaoPorInatividade(queryClient);

    if (typeof window !== "undefined") {
      window.location.replace("/auth?motivo=inatividade");
    }
  } finally {
    setTimeout(() => {
      encerramentoEmAndamento = false;
    }, 2000);
  }
}

/** Reinicia o estado em memória exclusivamente para uso em testes automatizados. */
export function _resetEstadoInatividadeParaTeste(): void {
  ultimaGravacaoLocal = 0;
  encerramentoEmAndamento = false;
}
