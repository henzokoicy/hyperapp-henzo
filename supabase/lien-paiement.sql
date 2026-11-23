-- ============================================================
-- LIEN COURT DE PAIEMENT SÉCURISÉ : client.henzostudio.com/p/PL-0034-3fa9c1d2
-- À coller UNE FOIS dans Supabase > SQL Editor > Run (on peut le relancer sans risque).
--
-- Le lien contient un code de 8 caractères calculé avec un secret qui reste dans la base :
-- sans le bon code, impossible de lire un paiement (PL-0001, PL-0002... ne se devinent pas).
-- La table payment_links n'est pas modifiée et reste fermée au public.
-- Tant que ce script n'est pas lancé, l'app envoie le lien long, qui marche comme avant.
-- ============================================================

-- 1) Le secret (créé une fois, au hasard, jamais lisible depuis l'extérieur)
create table if not exists public.lien_secret (
  id int primary key default 1 check (id = 1),
  secret text not null default replace(gen_random_uuid()::text, '-', '')
);
alter table public.lien_secret enable row level security;   -- aucune règle = fermée à tous
revoke all on public.lien_secret from anon, authenticated;
insert into public.lien_secret (id) values (1) on conflict (id) do nothing;

-- 2) Ancienne version (sans code) : supprimée, elle permettait de deviner les paiements
drop function if exists public.lien_paiement(bigint);

-- 3) Le code d'un paiement : réservé à l'app (utilisateur connecté)
create or replace function public.lien_code(p_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select substr(md5(p_id::text || (select secret from public.lien_secret where id = 1)), 1, 8)
$$;
revoke all on function public.lien_code(bigint) from public, anon;
grant execute on function public.lien_code(bigint) to authenticated;

-- 4) La lecture d'un paiement par la page client : il faut le bon numéro ET le bon code
create or replace function public.lien_paiement(p_id bigint, p_code text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select row_to_json(t) from (
    select id, amount, total_amount, description, client_name, payment_type, wave_link
    from public.payment_links
    where id = p_id
      and lower(coalesce(p_code, '')) = substr(md5(p_id::text || (select secret from public.lien_secret where id = 1)), 1, 8)
    limit 1
  ) t
$$;
revoke all on function public.lien_paiement(bigint, text) from public;
grant execute on function public.lien_paiement(bigint, text) to anon, authenticated;
