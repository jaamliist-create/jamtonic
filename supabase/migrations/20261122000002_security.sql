-- JamTonic — autorisations
--
-- Principe :
--   * anon          : aucun privilège sur les tables. Lecture par des vues et fonctions
--                     à colonnes choisies. Écritures par le serveur (service_role) seulement.
--   * authenticated : n'obtient rien sans profil actif (is_member()).
--   * service_role  : serveur Next.js uniquement, jamais dans le navigateur.

create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active
  )
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active and p.is_owner
  )
$$;

-- ---------------------------------------------------------------- privilèges
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;

grant select on public.profiles to authenticated;
grant update (display_name, instrument) on public.profiles to authenticated;

grant select, insert, update on public.songs to authenticated;
grant select, insert, update, delete on
  public.genres, public.tags, public.song_genres, public.song_tags,
  public.song_member_notes, public.playlist_songs, public.session_songs,
  public.concert_sessions
  to authenticated;
grant select, insert, delete on public.internal_votes to authenticated;
grant select, insert, update on public.playlists to authenticated;
grant select on public.public_votes, public.activity_log to authenticated;
grant select, update on public.public_suggestions to authenticated;
-- rate_limits : service_role seulement.

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.genres enable row level security;
alter table public.song_genres enable row level security;
alter table public.tags enable row level security;
alter table public.song_tags enable row level security;
alter table public.song_member_notes enable row level security;
alter table public.internal_votes enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
alter table public.concert_sessions enable row level security;
alter table public.session_songs enable row level security;
alter table public.public_votes enable row level security;
alter table public.public_suggestions enable row level security;
alter table public.activity_log enable row level security;
alter table public.rate_limits enable row level security;

-- Profils : les membres se voient entre eux ; chacun modifie le sien
-- (colonnes limitées par les privilèges ci-dessus).
create policy profiles_select on public.profiles for select to authenticated
  using ((select public.is_member()));
create policy profiles_update_self on public.profiles for update to authenticated
  using ((select public.is_member()) and id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Catalogue : tous les membres, lecture et écriture. Pas de suppression (archivage).
create policy songs_select on public.songs for select to authenticated
  using ((select public.is_member()));
create policy songs_insert on public.songs for insert to authenticated
  with check ((select public.is_member()));
create policy songs_update on public.songs for update to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

create policy genres_all on public.genres for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));
create policy tags_all on public.tags for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));
create policy song_genres_all on public.song_genres for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));
create policy song_tags_all on public.song_tags for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

-- Notes personnelles : l'auteur seulement.
create policy member_notes_own on public.song_member_notes for all to authenticated
  using ((select public.is_member()) and member_id = (select auth.uid()))
  with check ((select public.is_member()) and member_id = (select auth.uid()));

-- Votes internes : visibles de tous les membres ; on ne vote et ne retire que pour soi,
-- et seulement sur une tune « À découvrir ».
create policy internal_votes_select on public.internal_votes for select to authenticated
  using ((select public.is_member()));
create policy internal_votes_insert on public.internal_votes for insert to authenticated
  with check (
    (select public.is_member())
    and member_id = (select auth.uid())
    and exists (
      select 1 from public.songs s
      where s.id = song_id and s.status = 'a_decouvrir' and s.archived_at is null
    )
  );
create policy internal_votes_delete on public.internal_votes for delete to authenticated
  using ((select public.is_member()) and member_id = (select auth.uid()));

-- Playlists : pas de suppression (archivage).
create policy playlists_select on public.playlists for select to authenticated
  using ((select public.is_member()));
create policy playlists_insert on public.playlists for insert to authenticated
  with check ((select public.is_member()));
create policy playlists_update on public.playlists for update to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));
create policy playlist_songs_all on public.playlist_songs for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

-- Sessions : suppression permise pour un brouillon seulement.
create policy sessions_select on public.concert_sessions for select to authenticated
  using ((select public.is_member()));
create policy sessions_insert on public.concert_sessions for insert to authenticated
  with check ((select public.is_member()));
create policy sessions_update on public.concert_sessions for update to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));
create policy sessions_delete on public.concert_sessions for delete to authenticated
  using ((select public.is_member()) and status = 'brouillon');
create policy session_songs_all on public.session_songs for all to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

-- Votes publics : lecture seule pour les membres. Aucune écriture hors service_role.
create policy public_votes_select on public.public_votes for select to authenticated
  using ((select public.is_member()));

-- Suggestions : les membres lisent et trient. La création passe par le serveur.
create policy public_suggestions_select on public.public_suggestions for select to authenticated
  using ((select public.is_member()));
create policy public_suggestions_update on public.public_suggestions for update to authenticated
  using ((select public.is_member())) with check ((select public.is_member()));

create policy activity_log_select on public.activity_log for select to authenticated
  using ((select public.is_member()));

-- rate_limits : RLS active, aucune politique.

-- ---------------------------------------------------------------- projection publique
-- Vues à droits du propriétaire : elles contournent volontairement la RLS,
-- mais n'exposent que des colonnes et des lignes choisies.

-- Répertoire public : uniquement « Maîtrisé », non archivé. Ni notes ni statut.
create view public.public_songs
with (security_invoker = false) as
  select
    s.id,
    s.title,
    s.artist,
    s.duration_seconds,
    s.year,
    coalesce(
      (select array_agg(g.name order by g.name)
         from public.song_genres sg join public.genres g on g.id = sg.genre_id
        where sg.song_id = s.id),
      '{}'::text[]
    ) as genres
  from public.songs s
  where s.status = 'maitrise' and s.archived_at is null;

-- Prochains concerts : sessions programmées ou actives, affichables sur le site.
create view public.public_concerts
with (security_invoker = false) as
  select c.slug, c.name, c.venue, c.starts_on, c.starts_at, c.status, c.voting_open
  from public.concert_sessions c
  where c.listed and c.status in ('programmee', 'active');

grant select on public.public_songs, public.public_concerts to anon, authenticated;

-- Une session par son code (cible du QR). Les brouillons n'existent pas pour le public.
-- Fonctionne aussi pour une session non affichée sur le site.
create function public.public_get_session(p_slug text)
returns table (
  slug text, name text, venue text, starts_on date, starts_at time,
  status public.session_status, voting_open boolean, max_votes_per_participant integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.slug, c.name, c.venue, c.starts_on, c.starts_at,
         c.status, c.voting_open, c.max_votes_per_participant
  from public.concert_sessions c
  where c.slug = p_slug and c.status <> 'brouillon'
$$;

-- Tunes proposées au vote : sélection de la session ∩ maîtrisées ∩ non archivées.
create function public.public_session_songs(p_slug text)
returns table (id uuid, title text, artist text, genres text[])
language sql
stable
security definer
set search_path = ''
as $$
  select ps.id, ps.title, ps.artist, ps.genres
  from public.concert_sessions c
  join public.session_songs ss on ss.session_id = c.id
  join public.public_songs ps on ps.id = ss.song_id
  where c.slug = p_slug and c.status in ('programmee', 'active')
  order by ps.title
$$;

revoke execute on function public.public_get_session(text) from public;
revoke execute on function public.public_session_songs(text) from public;
grant execute on function public.public_get_session(text) to anon, authenticated, service_role;
grant execute on function public.public_session_songs(text) to anon, authenticated, service_role;

revoke execute on function public.is_member() from public, anon;
revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_member() to authenticated, service_role;
grant execute on function public.is_owner() to authenticated, service_role;
revoke execute on function public.jt_normalize(text) from public, anon;
grant execute on function public.jt_normalize(text) to authenticated, service_role;
