-- ============================================================
-- CAPTURE DE PAIEMENT (Orange Money, Moov Money...) envoyée par le client
-- À coller UNE FOIS dans Supabase > SQL Editor > Run (relançable sans risque).
-- À lancer APRÈS supabase/lien-paiement.sql (même code secret de lien).
--
-- Ce que ça fait :
--  - crée un dossier privé « preuves-paiement » (images JPEG de 1 Mo maximum) ;
--  - le client ne peut y déposer une capture qu'avec le bon lien (numéro + code secret) ;
--  - lui ne peut RIEN lire ni supprimer ; toi seul (connecté à la super app) vois et supprimes ;
--  - 5 captures maximum par paiement.
-- ============================================================

-- 0) Secret et contrôle du code d'un lien (mêmes que lien-paiement.sql, sans effet si déjà créés)
create table if not exists public.lien_secret (
  id int primary key default 1 check (id = 1),
  secret text not null default replace(gen_random_uuid()::text, '-', '')
);
alter table public.lien_secret enable row level security;
revoke all on public.lien_secret from anon, authenticated;
insert into public.lien_secret (id) values (1) on conflict (id) do nothing;

create or replace function public.lien_code_ok(p_id bigint, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(p_code, '')) = substr(md5(p_id::text || (select secret from public.lien_secret where id = 1)), 1, 8)
$$;
revoke all on function public.lien_code_ok(bigint, text) from public;
grant execute on function public.lien_code_ok(bigint, text) to anon, authenticated;

-- 1) Le dossier de stockage privé
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('preuves-paiement', 'preuves-paiement', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- 2) Le client dépose sa capture (avec le bon numéro de lien ET le bon code) : chemin = numéro/code/fichier.jpg
drop policy if exists "preuves_depot_client" on storage.objects;
create policy "preuves_depot_client" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'preuves-paiement'
    and public.lien_code_ok(((storage.foldername(name))[1])::bigint, (storage.foldername(name))[2])
  );

-- 3) Toi seul vois et supprimes les captures de TES liens
drop policy if exists "preuves_lecture_proprietaire" on storage.objects;
create policy "preuves_lecture_proprietaire" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'preuves-paiement'
    and exists (select 1 from public.payment_links l
                where l.id = ((storage.foldername(name))[1])::bigint and l.user_id = auth.uid())
  );

drop policy if exists "preuves_suppression_proprietaire" on storage.objects;
create policy "preuves_suppression_proprietaire" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'preuves-paiement'
    and exists (select 1 from public.payment_links l
                where l.id = ((storage.foldername(name))[1])::bigint and l.user_id = auth.uid())
  );

-- 4) La liste des captures reçues, visible dans la super app
create table if not exists public.payment_proofs (
  id bigint generated always as identity primary key,
  link_id bigint not null,
  methode text,
  chemin text not null,
  taille integer,
  created_at timestamptz not null default now()
);
alter table public.payment_proofs enable row level security;
revoke all on public.payment_proofs from anon;

drop policy if exists "preuves_liste_proprietaire" on public.payment_proofs;
create policy "preuves_liste_proprietaire" on public.payment_proofs
  for select to authenticated
  using (exists (select 1 from public.payment_links l where l.id = link_id and l.user_id = auth.uid()));

drop policy if exists "preuves_effacer_proprietaire" on public.payment_proofs;
create policy "preuves_effacer_proprietaire" on public.payment_proofs
  for delete to authenticated
  using (exists (select 1 from public.payment_links l where l.id = link_id and l.user_id = auth.uid()));

-- 5) Le client enregistre sa capture (numéro + code obligatoires, 5 captures maximum par paiement)
create or replace function public.preuve_ajouter(p_id bigint, p_code text, p_methode text, p_chemin text, p_taille integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.lien_code_ok(p_id, p_code) then
    raise exception 'lien invalide';
  end if;
  if split_part(p_chemin, '/', 1) <> p_id::text or lower(split_part(p_chemin, '/', 2)) <> lower(p_code) then
    raise exception 'chemin invalide';
  end if;
  if (select count(*) from public.payment_proofs where link_id = p_id) >= 5 then
    raise exception 'limite atteinte';
  end if;
  insert into public.payment_proofs (link_id, methode, chemin, taille)
  values (p_id, left(coalesce(p_methode, ''), 40), p_chemin, p_taille);
  return json_build_object('ok', true);
end
$$;
revoke all on function public.preuve_ajouter(bigint, text, text, text, integer) from public;
grant execute on function public.preuve_ajouter(bigint, text, text, text, integer) to anon, authenticated;
