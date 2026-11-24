import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { moeda } from "@/lib/br3";
import { gerarCobrancaMP, useCobrancasMP } from "@/lib/cobrancas-mp";

export function CobrancasMP({ osId }: { osId?: string }) {
  const query = useCobrancasMP(osId);
  const cache = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const tentativa = useRef({ dados: "", id: "" });
  const gerar = useMutation({
    mutationFn: gerarCobrancaMP,
    onSuccess: (_, body) => {
      if ("descricao" in body) {
        setDescricao("");
        setValor("");
        tentativa.current = { dados: "", id: "" };
      }
      toast.success("Link de pagamento disponível.");
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => cache.invalidateQueries({ queryKey: ["cobrancas-mp"] }),
  });
  if (osId && !query.data?.length && !query.isError) return null;
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h2 className="font-bold">Cobranças do Mercado Pago</h2>
      {!osId && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const centavos = Math.round(Number(valor) * 100);
            const dados = JSON.stringify([descricao.trim(), centavos]);
            if (tentativa.current.dados !== dados) tentativa.current = { dados, id: crypto.randomUUID() };
            gerar.mutate({ id: tentativa.current.id, descricao: descricao.trim(), centavos });
          }}
        >
          <label>
            Descrição<Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              maxLength={200}
            />
          </label>
          <label>
            Valor (R$)<Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </label>
          <Button disabled={gerar.isPending || !descricao.trim()}>Criar cobrança avulsa</Button>
        </form>
      )}
      {query.isError && (
        <p role="alert">
          Falha ao consultar cobranças. <button onClick={() => query.refetch()}>Tentar novamente</button>
        </p>
      )}
      {query.data?.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center gap-3 border-t pt-2 text-sm">
          <strong>{c.descricao}</strong>
          <span>{moeda(c.valor)}</span>
          <span className="capitalize">{c.status}</span>
          {c.status === "pendente" && (c.link
            ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(c.link!);
                    toast.success("Link copiado.");
                  } catch {
                    window.prompt("Copie o link de pagamento", c.link!);
                  }
                }}
              >
                Copiar link
              </Button>
            )
            : (
              <Button
                size="sm"
                disabled={gerar.isPending}
                onClick={() => gerar.mutate({ id: c.id })}
              >
                Gerar link
              </Button>
            ))}
        </div>
      ))}
    </section>
  );
}
