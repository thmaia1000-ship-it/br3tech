create table public.cobrancas_mp (
  id uuid primary key default gen_random_uuid(),
  os_id uuid unique references public.ordens_servico(id) on delete restrict,
  descricao text not null check (length(trim(descricao)) between 1 and 200),
  valor numeric(12,2) not null check (valor > 0),
  recebido numeric(12,2) not null default 0,
  link text,
  status text not null default 'pendente',
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default now()
);
alter table public.cobrancas_mp enable row level security;
revoke all on public.cobrancas_mp from public, anon, authenticated;
grant select on public.cobrancas_mp to authenticated;
grant all on public.cobrancas_mp to service_role;
create policy "Equipe consulta cobrancas" on public.cobrancas_mp for select to authenticated using (true);

create table public.pagamentos_mp (
  id text primary key,
  cobranca uuid not null references public.cobrancas_mp(id),
  status text not null,
  liquido numeric(12,2) not null,
  atualizado timestamptz not null
);
alter table public.pagamentos_mp enable row level security;
revoke all on public.pagamentos_mp from public, anon, authenticated;
grant all on public.pagamentos_mp to service_role;

-- A entrega, o histórico e a reserva da cobrança são uma única transação.
create function public.encerrar_os_mp(p_os uuid, p_usuario uuid, p_estado text, p_versao timestamptz)
returns uuid language plpgsql set search_path = public as $$
declare
  ordem ordens_servico%rowtype;
  chave uuid;
begin
  select * into strict ordem from ordens_servico where id = p_os for update;
  select id into chave from cobrancas_mp where os_id = p_os;
  if chave is not null and ordem.status = 'entregue' then return chave; end if;
  if chave is not null or ordem.updated_at is distinct from p_versao or ordem.status not in ('em_reparo','pronta') then
    raise exception 'OS indisponível para cobrança';
  end if;
  insert into cobrancas_mp(os_id, descricao, valor, criado_por)
    values (p_os, 'OS ' || ordem.numero, ordem.valor_pecas + ordem.valor_mao_obra, p_usuario)
    returning id into chave;
  update ordens_servico set status = 'entregue', entregue_em = now(), estado_fisico = p_estado where id = p_os;
  insert into os_historico(os_id, status, observacao, usuario_id, usuario_nome)
    values (p_os, 'entregue', 'OS entregue com cobrança pelo Mercado Pago.', p_usuario,
            (select nome from profiles where id = p_usuario));
  return chave;
end $$;

create function public.registrar_pagamento_mp(p_cobranca uuid, p_id text, p_status text,
  p_valor numeric, p_estornado numeric, p_atualizado timestamptz)
returns void language plpgsql set search_path = public as $$
declare
  total numeric;
  saldo numeric;
  devolvido boolean;
begin
  select valor into total from cobrancas_mp where id = p_cobranca for update;
  if total is null or total <> p_valor then return; end if;
  insert into pagamentos_mp values (p_id, p_cobranca, p_status,
    case when p_status = 'approved' then greatest(0, p_valor - p_estornado) else 0 end, p_atualizado)
    on conflict (id) do update set status = excluded.status, liquido = excluded.liquido,
    atualizado = excluded.atualizado where pagamentos_mp.cobranca = excluded.cobranca
      and pagamentos_mp.atualizado < excluded.atualizado;
  select sum(liquido), bool_or(status in ('refunded','charged_back') or (status = 'approved' and liquido = 0))
    into saldo, devolvido from pagamentos_mp where cobranca = p_cobranca;
  update cobrancas_mp set recebido = saldo, status = case when saldo >= total then 'paga'
    when saldo > 0 then 'parcial' when devolvido then 'estornada' else 'pendente' end where id = p_cobranca;
end $$;
revoke all on function public.encerrar_os_mp(uuid,uuid,text,timestamptz), public.registrar_pagamento_mp(uuid,text,text,numeric,numeric,timestamptz) from public, anon, authenticated;
grant execute on function public.encerrar_os_mp(uuid,uuid,text,timestamptz), public.registrar_pagamento_mp(uuid,text,text,numeric,numeric,timestamptz) to service_role;
