import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const query = new URL(req.url).searchParams;
  const id = query.get("data.id");
  const requestId = req.headers.get("x-request-id");
  const signature = new URLSearchParams(
    (req.headers.get("x-signature") || "").replaceAll(",", "&").replaceAll(" ", ""),
  );
  const ts = signature.get("ts");
  const mac = signature.get("v1");
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (
    !secret || !requestId || !id || !/^\d+$/.test(id) || !ts || !/^\d+$/.test(ts) || !mac ||
    !/^[a-f0-9]{64}$/i.test(mac)
  ) {
    return new Response(null, { status: 401 });
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = Uint8Array.from(mac.match(/../g)!, (b) => parseInt(b, 16));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(`id:${id};request-id:${requestId};ts:${ts};`),
  );
  if (!valid) return new Response(null, { status: 401 });
  if (query.get("type") !== "payment") return new Response(null, { status: 200 });
  try {
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
    });
    if (!response.ok) throw new Error("consulta");
    const p = await response.json();
    if (
      p.live_mode === (Deno.env.get("MP_SANDBOX") !== "true") && String(p.id) === id &&
      p.currency_id === "BRL" && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(p.external_reference)
    ) {
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error } = await db.rpc("registrar_pagamento_mp", {
        p_cobranca: p.external_reference,
        p_id: id,
        p_status: p.status,
        p_valor: p.transaction_amount,
        p_estornado: p.transaction_amount_refunded || 0,
        p_atualizado: p.date_last_updated,
      });
      if (error) throw error;
    }
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
});
