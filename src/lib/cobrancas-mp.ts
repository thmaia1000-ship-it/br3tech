import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import type { Database } from "@/integrations/supabase/types";

type CobrancaMP = Database["public"]["Tables"]["cobrancas_mp"]["Row"];

export function useCobrancasMP(osId?: string) {
  return useQuery({
    queryKey: ["cobrancas-mp", osId ?? "todas"],
    queryFn: async () => {
      const rows: CobrancaMP[] = [];
      for (let offset = 0;; offset += 500) {
        let query = supabase.from("cobrancas_mp").select("*").order("criado_em", { ascending: false }).order(
          "id",
        );
        if (osId) query = query.eq("os_id", osId);
        const { data, error } = await query.range(offset, offset + 499);
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) return rows;
      }
    },
    refetchInterval: 30000,
  });
}

export async function gerarCobrancaMP(
  body: { osId: string; estado: string; versao: string } | { id: string; descricao?: string; centavos?: number },
) {
  const { error } = await supabase.functions.invoke("mp-cobranca", { body });
  if (error) {
    const detalhe = await error.context?.json?.().catch(() => null);
    throw new Error(detalhe?.erro || "Falha ao solicitar cobrança ao Mercado Pago.");
  }
}
