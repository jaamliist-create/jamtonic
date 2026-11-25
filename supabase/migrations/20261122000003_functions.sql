-- JamTonic — fonctions métier
-- Fonctions « membres » : security invoker, la RLS s'applique.
-- Fonctions « public »  : réservées à service_role (appelées par le serveur Next.js).

-- ---------------------------------------------------------------- playlists
create function public.reorder_playlist(p_playlist uuid, p_song_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  update public.playlist_songs ps
     set position = o.ord
    from unnest(p_song_ids) with ordinality as o(song_id, ord)
   where ps.playlist_id = p_playlist and ps.song_id = o.song_id;
  update public.playlists set updated_at = now() where id = p_playlist;
end $$;

create function public.add_song_to_playlist(p_playlist uuid, p_song uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  insert into public.playlist_songs (playlist_id, song_id, position)
  select p_playlist, p_song, coalesce(max(position), 0) + 1
    from public.playlist_songs where playlist_id = p_playlist
  on conflict (playlist_id, song_id) do nothing;
  update public.playlists set updated_at = now() where id = p_playlist;
end $$;

create function public.duplicate_playlist(p_playlist uuid, p_name text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_new uuid;
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  insert into public.playlists (name, description)
  select p_name, description from public.playlists where id = p_playlist
  returning id into v_new;
  if v_new is null then
    raise exception 'playlist_not_found';
  end if;
  insert into public.playlist_songs (playlist_id, song_id, position)
  select v_new, song_id, position from public.playlist_songs where playlist_id = p_playlist;
  return v_new;
end $$;

-- ---------------------------------------------------------------- sessions
-- Remplace la sélection de tunes d'une session, en une transaction.
create function public.set_session_songs(p_session uuid, p_song_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  delete from public.session_songs
   where session_id = p_session and not (song_id = any (p_song_ids));
  insert into public.session_songs (session_id, song_id, position)
  select p_session, o.song_id, o.ord
    from unnest(p_song_ids) with ordinality as o(song_id, ord)
  on conflict (session_id, song_id) do update set position = excluded.position;
end $$;

-- Classement d'une session : votes de CETTE session seulement.
-- « recent » = votes des 10 dernières minutes (tendance).
create function public.session_ranking(p_session uuid)
returns table (
  song_id uuid, title text, artist text, status public.song_status,
  in_selection boolean, votes bigint, recent bigint, rank bigint
)
language sql
stable
set search_path = ''
as $$
  with ids as (
    select ss.song_id from public.session_songs ss where ss.session_id = p_session
    union
    select v.song_id from public.public_votes v where v.session_id = p_session
  ),
  counted as (
    select
      i.song_id,
      (select count(*) from public.public_votes v
        where v.session_id = p_session and v.song_id = i.song_id) as votes,
      (select count(*) from public.public_votes v
        where v.session_id = p_session and v.song_id = i.song_id
          and v.created_at > now() - interval '10 minutes') as recent
    from ids i
  )
  select s.id, s.title, s.artist, s.status,
         exists (select 1 from public.session_songs ss
                  where ss.session_id = p_session and ss.song_id = s.id),
         c.votes, c.recent,
         rank() over (order by c.votes desc)
  from counted c
  join public.songs s on s.id = c.song_id
  order by c.votes desc, s.title
$$;

-- ---------------------------------------------------------------- suggestions → catalogue
-- Action explicite d'un membre : crée une tune « À découvrir » (ou rattache la tune
-- existante) et marque « retenue » toutes les suggestions identiques.
create function public.create_song_from_suggestion(p_suggestion uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_sug public.public_suggestions;
  v_song uuid;
  v_existed boolean := true;
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  select * into v_sug from public.public_suggestions where id = p_suggestion;
  if not found then
    raise exception 'suggestion_not_found';
  end if;

  select id into v_song from public.songs
   where title_norm = v_sug.title_norm and artist_norm = v_sug.artist_norm;
  if v_song is null then
    insert into public.songs (title, artist, status)
    values (btrim(v_sug.title), btrim(v_sug.artist), 'a_decouvrir')
    returning id into v_song;
    v_existed := false;
  end if;

  update public.public_suggestions
     set status = 'retenue', song_id = v_song,
         handled_by = (select auth.uid()), handled_at = now()
   where title_norm = v_sug.title_norm and artist_norm = v_sug.artist_norm
     and status = 'nouvelle';

  return jsonb_build_object('song_id', v_song, 'existed', v_existed);
end $$;

-- ---------------------------------------------------------------- écritures publiques (service_role)
-- Compteur par fenêtre fixe. Renvoie false quand la limite est dépassée.
create function public.check_rate_limit(p_bucket text, p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into public.rate_limits as r (bucket, key, window_start, count)
  values (p_bucket, p_key, v_window, 1)
  on conflict (bucket, key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  -- Purge occasionnelle : rien ne vit plus de 48 h.
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '48 hours';
  end if;

  return v_count <= p_max;
end $$;

-- Vote du public. Toutes les vérifications et l'écriture sont dans la même transaction.
-- Résultats : added | removed | closed | not_available | limit
create function public.cast_public_vote(p_slug text, p_song uuid, p_participant uuid, p_on boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.concert_sessions;
  v_used integer;
  v_result text;
begin
  select * into v_session from public.concert_sessions where slug = p_slug;
  if not found or v_session.status <> 'active' or not v_session.voting_open then
    return jsonb_build_object('result', 'closed');
  end if;

  -- Sérialise les votes d'un même participant (le plafond ne peut pas être dépassé en parallèle).
  perform pg_advisory_xact_lock(hashtextextended(v_session.id::text || p_participant::text, 0));

  if not p_on then
    delete from public.public_votes
     where session_id = v_session.id and song_id = p_song and participant_id = p_participant;
    v_result := 'removed';
  elsif not exists (
    select 1 from public.session_songs ss
      join public.songs s on s.id = ss.song_id
     where ss.session_id = v_session.id and ss.song_id = p_song
       and s.status = 'maitrise' and s.archived_at is null
  ) then
    return jsonb_build_object('result', 'not_available');
  elsif exists (
    select 1 from public.public_votes
     where session_id = v_session.id and song_id = p_song and participant_id = p_participant
  ) then
    v_result := 'added';
  else
    select count(*) into v_used from public.public_votes
     where session_id = v_session.id and participant_id = p_participant;
    if v_session.max_votes_per_participant is not null
       and v_used >= v_session.max_votes_per_participant then
      return jsonb_build_object('result', 'limit', 'used', v_used);
    end if;
    insert into public.public_votes (session_id, song_id, participant_id)
    values (v_session.id, p_song, p_participant)
    on conflict do nothing;
    v_result := 'added';
  end if;

  select count(*) into v_used from public.public_votes
   where session_id = v_session.id and participant_id = p_participant;
  return jsonb_build_object('result', v_result, 'used', v_used);
end $$;

-- Votes d'un participant dans une session (pour afficher ses choix).
create function public.participant_votes(p_slug text, p_participant uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.song_id
  from public.public_votes v
  join public.concert_sessions c on c.id = v.session_id
  where c.slug = p_slug and v.participant_id = p_participant
$$;

-- Suggestion du public. Ne crée JAMAIS de tune.
-- Résultats : ok | duplicate | invalid
create function public.submit_public_suggestion(
  p_title text, p_artist text, p_slug text default null, p_participant uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g'));
  v_artist text := btrim(regexp_replace(coalesce(p_artist, ''), '\s+', ' ', 'g'));
  v_session uuid;
begin
  if char_length(v_title) not between 1 and 120 or char_length(v_artist) not between 1 and 120
     or public.jt_normalize(v_title) = '' or public.jt_normalize(v_artist) = '' then
    return 'invalid';
  end if;

  if p_slug is not null then
    select id into v_session from public.concert_sessions
     where slug = p_slug and status in ('programmee', 'active');
  end if;

  -- Même participant, même tune : on ne compte pas deux fois.
  if p_participant is not null and exists (
    select 1 from public.public_suggestions
     where participant_id = p_participant
       and title_norm = public.jt_normalize(v_title)
       and artist_norm = public.jt_normalize(v_artist)
  ) then
    return 'duplicate';
  end if;

  insert into public.public_suggestions (title, artist, session_id, participant_id)
  values (v_title, v_artist, v_session, p_participant);
  return 'ok';
end $$;

-- ---------------------------------------------------------------- statistiques (agrégées)
create function public.stats_sessions()
returns table (
  session_id uuid, name text, venue text, starts_on date, status public.session_status,
  votes bigint, participants bigint, songs_voted bigint, suggestions bigint
)
language sql
stable
set search_path = ''
as $$
  select c.id, c.name, c.venue, c.starts_on, c.status,
         (select count(*) from public.public_votes v where v.session_id = c.id),
         (select count(distinct v.participant_id) from public.public_votes v where v.session_id = c.id),
         (select count(distinct v.song_id) from public.public_votes v where v.session_id = c.id),
         (select count(*) from public.public_suggestions g where g.session_id = c.id)
  from public.concert_sessions c
  where c.status <> 'brouillon'
  order by c.starts_on desc
$$;

create function public.stats_top_requested(p_limit integer default 20)
returns table (song_id uuid, title text, artist text, votes bigint, sessions bigint)
language sql
stable
set search_path = ''
as $$
  select s.id, s.title, s.artist, count(*), count(distinct v.session_id)
  from public.public_votes v
  join public.songs s on s.id = v.song_id
  group by s.id, s.title, s.artist
  order by count(*) desc, s.title
  limit p_limit
$$;

create function public.stats_top_suggestions(p_limit integer default 20)
returns table (title text, artist text, requests bigint, last_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select (array_agg(g.title order by g.created_at))[1],
         (array_agg(g.artist order by g.created_at))[1],
         count(*), max(g.created_at)
  from public.public_suggestions g
  group by g.title_norm, g.artist_norm
  order by count(*) desc, max(g.created_at) desc
  limit p_limit
$$;

-- Progression du répertoire : passages à « Maîtrisé » par mois (d'après le journal).
create function public.stats_mastered_by_month()
returns table (month date, mastered bigint)
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', a.created_at)::date, count(*)
  from public.activity_log a
  where (a.action = 'song_status_changed' and a.meta ->> 'to' = 'maitrise')
     or (a.action = 'song_created' and a.meta ->> 'status' = 'maitrise')
  group by 1
  order by 1
$$;

-- ---------------------------------------------------------------- privilèges d'exécution
-- On repart de zéro : rien n'est exécutable sans octroi explicite.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

grant execute on function
  public.is_member(),
  public.is_owner(),
  public.jt_normalize(text),
  public.reorder_playlist(uuid, uuid[]),
  public.add_song_to_playlist(uuid, uuid),
  public.duplicate_playlist(uuid, text),
  public.set_session_songs(uuid, uuid[]),
  public.session_ranking(uuid),
  public.create_song_from_suggestion(uuid),
  public.stats_sessions(),
  public.stats_top_requested(integer),
  public.stats_top_suggestions(integer),
  public.stats_mastered_by_month()
  to authenticated;

grant execute on function
  public.public_get_session(text),
  public.public_session_songs(text)
  to anon, authenticated;
