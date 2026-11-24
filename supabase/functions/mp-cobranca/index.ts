import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: object, status = 200) => Response.json(data, { headers, status });
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({}, 405);
  const base = Deno.env.get("SUPABASE_URL")!;
  const db = createClient(base, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!bearer) return reply({}, 401);
  const { data: { user }, error } = await db.auth.getUser(bearer);
  if (!user || error) return reply({}, 401);
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!token || !Deno.env.get("MP_WEBHOOK_SECRET")) {
    return reply({ erro: "Configure o Mercado Pago antes de cobrar." }, 503);
  }
  try {
    const input = await req.json();
    let id = input.id;
    if (input.osId) {
      if (!uuid.test(input.osId) || typeof input.estado !== "string") return reply({}, 400);
      const result = await db.rpc("encerrar_os_mp", {
        p_os: input.osId,
        p_usuario: user.id,
        p_estado: input.estado,
        p_versao: input.versao,
      });
      if (result.error) return reply({ erro: "Confira o status e o valor da OS antes de encerrar." }, 409);
      id = result.data;
    } else if (!uuid.test(id)) return reply({}, 400);
    else if (input.descricao !== undefined) {
      const descricao = String(input.descricao).trim();
      if (
        !descricao || descricao.length > 200 || !Number.isSafeInteger(input.centavos) ||
        input.centavos <= 0 || input.centavos > 999999999999
      ) return reply({}, 400);
      const { error } = await db.from("cobrancas_mp").upsert({
        id,
        descricao,
        valor: input.centavos / 100,
        criado_por: user.id,
      }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    const { data: charge, error: readError } = await db.from("cobrancas_mp").select("*").eq("id", id)
      .single();
    if (readError) throw readError;
    if (
      input.descricao !== undefined && (charge.criado_por !== user.id || charge.os_id ||
        charge.descricao !== input.descricao.trim() || Math.round(charge.valor * 100) !== input.centavos)
    ) {
      return reply({ erro: "Esta solicitação já pertence a outra cobrança." }, 409);
    }
    if (charge.link) return reply({ id, link: charge.link });
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": id,
      },
      body: JSON.stringify({
        external_reference: id,
        items: [{ id, title: charge.descricao, quantity: 1, currency_id: "BRL", unit_price: charge.valor }],
      }),
    });
    if (!response.ok) throw new Error("preferencia");
    const pref = await response.json();
    const link = Deno.env.get("MP_SANDBOX") === "true" ? pref.sandbox_init_point : pref.init_point;
    if (typeof link !== "string" || !link.startsWith("https://")) throw new Error("link");
    const saved = await db.from("cobrancas_mp").update({ link }).eq("id", id).is("link", null).select("link")
      .maybeSingle();
    if (saved.error) throw saved.error;
    if (saved.data) return reply({ id, link: saved.data.link });
    const winner = await db.from("cobrancas_mp").select("link").eq("id", id).single();
    if (winner.error) throw winner.error;
    return reply({ id, link: winner.data.link });
  } catch {
    return reply(
      { erro: "Falha ao gerar o link. Consulte a cobrança no Financeiro e tente novamente." },
      503,
    );
  }
});
