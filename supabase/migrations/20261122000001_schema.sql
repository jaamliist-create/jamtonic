-- JamTonic — schéma
-- Un seul catalogue (songs). Le public n'en lit qu'une projection (voir la migration 2).

create extension if not exists unaccent with schema extensions;

create type public.song_status as enum ('a_decouvrir', 'a_apprendre', 'en_cours', 'a_reviser', 'maitrise');
create type public.session_status as enum ('brouillon', 'programmee', 'active', 'terminee');
create type public.suggestion_status as enum ('nouvelle', 'retenue', 'ecartee');

-- Normalisation pour détecter les doublons : sans accents, minuscules,
-- ponctuation et espaces réduits. « Hôtel  California! » = « hotel california ».
create function public.jt_normalize(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p, ''))),
    '[^a-z0-9]+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------- membres
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  instrument text check (instrument is null or char_length(instrument) <= 60),
  is_owner boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- catalogue
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  artist text not null check (char_length(btrim(artist)) between 1 and 200),
  title_norm text generated always as (public.jt_normalize(title)) stored,
  artist_norm text generated always as (public.jt_normalize(artist)) stored,
  status public.song_status not null default 'a_decouvrir',
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 7200),
  year integer check (year is null or year between 1900 and 2100),
  notes text not null default '' check (char_length(notes) <= 20000),
  links jsonb not null default '[]'::jsonb check (jsonb_typeof(links) = 'array'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create unique index songs_unique_norm on public.songs (title_norm, artist_norm);
create index songs_status_idx on public.songs (status) where archived_at is null;

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  name_norm text generated always as (public.jt_normalize(name)) stored,
  created_at timestamptz not null default now()
);
create unique index genres_unique_norm on public.genres (name_norm);

create table public.song_genres (
  song_id uuid not null references public.songs (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (song_id, genre_id)
);
create index song_genres_genre_idx on public.song_genres (genre_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  name_norm text generated always as (public.jt_normalize(name)) stored,
  created_at timestamptz not null default now()
);
create unique index tags_unique_norm on public.tags (name_norm);

create table public.song_tags (
  song_id uuid not null references public.songs (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (song_id, tag_id)
);
create index song_tags_tag_idx on public.song_tags (tag_id);

-- Notes personnelles : visibles par leur auteur seulement.
create table public.song_member_notes (
  song_id uuid not null references public.songs (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 20000),
  updated_at timestamptz not null default now(),
  primary key (song_id, member_id)
);

-- Votes internes : un par membre et par tune (clé primaire).
create table public.internal_votes (
  song_id uuid not null references public.songs (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, member_id)
);
create index internal_votes_member_idx on public.internal_votes (member_id);

-- ---------------------------------------------------------------- playlists
create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);

create table public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  added_at timestamptz not null default now(),
  unique (playlist_id, song_id)
);
create index playlist_songs_order_idx on public.playlist_songs (playlist_id, position);
create index playlist_songs_song_idx on public.playlist_songs (song_id);

-- ---------------------------------------------------------------- sessions de concert
create table public.concert_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  venue text check (venue is null or char_length(venue) <= 120),
  starts_on date not null,
  starts_at time,
  status public.session_status not null default 'brouillon',
  playlist_id uuid references public.playlists (id) on delete set null,
  listed boolean not null default true,
  voting_open boolean not null default true,
  max_votes_per_participant integer default 5
    check (max_votes_per_participant is null or max_votes_per_participant between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null
);
create index concert_sessions_status_idx on public.concert_sessions (status, starts_on);

create table public.session_songs (
  session_id uuid not null references public.concert_sessions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  position integer not null default 0,
  primary key (session_id, song_id)
);
create index session_songs_song_idx on public.session_songs (song_id);

-- Votes du public : toujours rattachés à une session.
create table public.public_votes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.concert_sessions (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  participant_id uuid not null,
  created_at timestamptz not null default now(),
  unique (session_id, song_id, participant_id)
);
create index public_votes_participant_idx on public.public_votes (session_id, participant_id);
create index public_votes_song_idx on public.public_votes (song_id);

-- Suggestions du public : jamais une tune tant qu'un membre ne l'a pas décidé.
create table public.public_suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  artist text not null check (char_length(btrim(artist)) between 1 and 120),
  title_norm text generated always as (public.jt_normalize(title)) stored,
  artist_norm text generated always as (public.jt_normalize(artist)) stored,
  session_id uuid references public.concert_sessions (id) on delete set null,
  participant_id uuid,
  status public.suggestion_status not null default 'nouvelle',
  song_id uuid references public.songs (id) on delete set null,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index public_suggestions_norm_idx on public.public_suggestions (title_norm, artist_norm);
create index public_suggestions_status_idx on public.public_suggestions (status, created_at desc);

-- ---------------------------------------------------------------- journal et limite de fréquence
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);

-- Clé = empreinte HMAC (adresse réseau + jour). Aucune adresse en clair.
create table public.rate_limits (
  bucket text not null,
  key text not null,
  window_start timestamptz not null,
  count integer not null default 1,
  primary key (bucket, key, window_start)
);

-- ---------------------------------------------------------------- déclencheurs
create function public.jt_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Renseigne l'auteur : created_by à la création, updated_by à chaque écriture.
create function public.jt_stamp_author()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(v_uid, new.created_by);
    new.updated_by := coalesce(v_uid, new.updated_by, new.created_by);
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce(v_uid, new.updated_by);
    new.updated_at := now();
  end if;
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.jt_touch();
create trigger song_member_notes_touch before update on public.song_member_notes
  for each row execute function public.jt_touch();
create trigger songs_stamp before insert or update on public.songs
  for each row execute function public.jt_stamp_author();
create trigger playlists_stamp before insert or update on public.playlists
  for each row execute function public.jt_stamp_author();
create trigger concert_sessions_stamp before insert or update on public.concert_sessions
  for each row execute function public.jt_stamp_author();

-- Journal d'activité (écrit par déclencheur, jamais par le client).
create function public.jt_log_song()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := new.title || ' — ' || new.artist;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary, meta)
    values (new.created_by, 'song_created', 'song', new.id, v_label, jsonb_build_object('status', new.status));
  elsif new.status is distinct from old.status then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary, meta)
    values (new.updated_by, 'song_status_changed', 'song', new.id, v_label,
            jsonb_build_object('from', old.status, 'to', new.status));
  elsif new.archived_at is distinct from old.archived_at then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary)
    values (new.updated_by,
            case when new.archived_at is null then 'song_restored' else 'song_archived' end,
            'song', new.id, v_label);
  elsif (new.title, new.artist, new.notes, new.links, new.duration_seconds, new.year)
        is distinct from (old.title, old.artist, old.notes, old.links, old.duration_seconds, old.year) then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary)
    values (new.updated_by, 'song_updated', 'song', new.id, v_label);
  end if;
  return new;
end $$;

create trigger songs_log after insert or update on public.songs
  for each row execute function public.jt_log_song();

create function public.jt_log_playlist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.activity_log (actor_id, action, entity_type, entity_id, summary)
  values (new.created_by, 'playlist_created', 'playlist', new.id, new.name);
  return new;
end $$;

create trigger playlists_log after insert on public.playlists
  for each row execute function public.jt_log_playlist();

create function public.jt_log_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary)
    values (new.created_by, 'session_created', 'session', new.id, new.name);
  elsif new.status is distinct from old.status then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary, meta)
    values (new.updated_by, 'session_status_changed', 'session', new.id, new.name,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

create trigger concert_sessions_log after insert or update on public.concert_sessions
  for each row execute function public.jt_log_session();
