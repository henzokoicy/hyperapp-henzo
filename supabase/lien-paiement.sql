-- ============================================================
-- LIEN COURT DE PAIEMENT : client.henzostudio.com/p/PL-0034
-- À coller UNE FOIS dans Supabase > SQL Editor > Run.
-- Donne à la page de paiement un accès en lecture limité à UN paiement
-- (par son numéro) et seulement aux champs utiles au client. Le reste
-- de la table reste fermé. Tant que ce script n'est pas lancé, l'app
-- envoie automatiquement le lien long, qui fonctionne comme avant.
-- ============================================================
create or replace function public.lien_paiement(p_id bigint)
returns json
language sql
security definer
set search_path = public
as $$
  select row_to_json(t) from (
    select id, amount, total_amount, description, client_name, payment_type, wave_link
    from public.payment_links
    where id = p_id
    limit 1
  ) t
$$;

revoke all on function public.lien_paiement(bigint) from public;
grant execute on function public.lien_paiement(bigint) to anon, authenticated;
