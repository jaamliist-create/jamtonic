-- Tonalité et tempo d'une tune : deux repères de la fiche, facultatifs et saisis à la main.
-- La tonalité est un texte libre (« La m », « F#m », « Mi♭ ») : c'est celle que le band joue,
-- pas forcément celle de l'enregistrement original.
-- Réservés à l'espace des membres : la vue public_songs ne les expose pas.

alter table public.songs
  add column musical_key text
    check (musical_key is null or char_length(btrim(musical_key)) between 1 and 20),
  add column bpm integer check (bpm is null or bpm between 20 and 400);

comment on column public.songs.musical_key is 'Tonalité jouée par le band (texte libre, facultatif).';
comment on column public.songs.bpm is 'Tempo en battements par minute (facultatif).';

-- Le journal d'activité compte la tonalité et le tempo parmi les modifications de la fiche.
create or replace function public.jt_log_song()
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
  elsif (new.title, new.artist, new.notes, new.links, new.duration_seconds, new.year, new.musical_key, new.bpm)
        is distinct from
        (old.title, old.artist, old.notes, old.links, old.duration_seconds, old.year, old.musical_key, old.bpm) then
    insert into public.activity_log (actor_id, action, entity_type, entity_id, summary)
    values (new.updated_by, 'song_updated', 'song', new.id, v_label);
  end if;
  return new;
end $$;
