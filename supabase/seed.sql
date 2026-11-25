-- JamTonic — catalogue initial (répertoire réel du band, pas des données de démonstration)
--
-- Source : Google Sheets « Setlist disponible », transcrit dans l'annexe fournie
-- par le band le 2026-11-22 (titres et noms déjà normalisés par le band).
--
-- Réexécutable sans risque :
--   * une tune déjà présente (même titre et même artiste, accents et casse ignorés)
--     n'est NI recréée NI modifiée : les changements faits par les membres sont conservés ;
--   * le genre n'est rattaché qu'aux tunes créées par CETTE exécution.
--
-- Correspondances appliquées (voir README, « Catalogue initial ») :
--   « Maitrisée »        -> maitrise
--   « A pratiquer »      -> a_reviser   (PROVISOIRE, à valider par le band)
--   onglet « A apprendre » -> a_apprendre, avec sa priorité (urgent / moyen_terme / pour_le_fun)
--   onglets Rock / Pop / Franco -> genre du même nom ; l'onglet « A apprendre » n'indique
--   aucune catégorie musicale, donc aucun genre n'est inventé pour ces dix tunes.
--
-- Rien d'autre n'est créé : ni durée, ni tonalité, ni notes, ni vote, ni playlist, ni session.

begin;

create temporary table jt_seed (
  artist text not null,
  title text not null,
  status public.song_status not null,
  genre text,
  priority public.learning_priority
) on commit drop;

insert into jt_seed (artist, title, status, genre, priority) values
  -- ROCK (18)
  ('Aerosmith',             'Falling in Love (Is Hard on the Knees)', 'maitrise',  'Rock', null),
  ('Bon Jovi',              'You Give Love a Bad Name',               'a_reviser', 'Rock', null),
  ('Bryan Adams',           'Run to You',                             'a_reviser', 'Rock', null),
  ('Cake',                  'The Distance',                           'maitrise',  'Rock', null),
  ('Fall Out Boy',          'This Ain''t a Scene',                    'a_reviser', 'Rock', null),
  ('Ghost',                 'Dance Macabre',                          'maitrise',  'Rock', null),
  ('Good Charlotte',        'I Just Wanna Live',                      'maitrise',  'Rock', null),
  ('Green Day',             'Boulevard of Broken Dreams',             'a_reviser', 'Rock', null),
  ('Huey Lewis & The News', 'The Power of Love',                      'maitrise',  'Rock', null),
  ('Jonny Lang',            'Lie to Me',                              'maitrise',  'Rock', null),
  ('Journey',               'Don''t Stop Believin''',                 'a_reviser', 'Rock', null),
  ('Linkin Park',           'What I''ve Done',                        'a_reviser', 'Rock', null),
  ('Lenny Kravitz',         'Are You Gonna Go My Way',                'a_reviser', 'Rock', null),
  ('No Doubt',              'Just a Girl',                            'a_reviser', 'Rock', null),
  ('The Offspring',         'Hit That',                               'a_reviser', 'Rock', null),
  ('Reel Big Fish',         'Beer',                                   'a_reviser', 'Rock', null),
  ('Steppenwolf',           'Born to Be Wild',                        'maitrise',  'Rock', null),
  ('Toto',                  'Hold the Line',                          'maitrise',  'Rock', null),
  -- POP (3)
  ('Coldplay',              'Clocks',                                 'a_reviser', 'Pop', null),
  ('Teddy Swims',           'Lose Control',                           'maitrise',  'Pop', null),
  ('Pharrell Williams',     'Happy',                                  'a_reviser', 'Pop', null),
  -- FRANCO (2)
  ('Gerry Boulet',          'Medley',                                 'a_reviser', 'Franco', null),
  ('Karkwa',                'Le Coup d''état',                        'a_reviser', 'Franco', null),
  -- À APPRENDRE (10) : une priorité, pas de catégorie musicale dans la source
  ('Gnarls Barkley',        'Crazy',                                  'a_apprendre', null, 'moyen_terme'),
  ('Chuck Berry',           'Johnny B. Goode',                        'a_apprendre', null, 'pour_le_fun'),
  ('Dire Straits',          'Sultans of Swing',                       'a_apprendre', null, 'urgent'),
  ('Guns N'' Roses',        'Sweet Child O'' Mine',                   'a_apprendre', null, 'urgent'),
  ('Imagine Dragons',       'Believer',                               'a_apprendre', null, 'moyen_terme'),
  ('Måneskin',              'Beggin''',                               'a_apprendre', null, 'urgent'),
  ('Maroon 5',              'This Love',                              'a_apprendre', null, 'urgent'),
  ('Queen',                 'Another One Bites the Dust',             'a_apprendre', null, 'urgent'),
  ('Red Hot Chili Peppers', 'Can''t Stop',                            'a_apprendre', null, 'urgent'),
  ('The Black Keys',        'Lonely Boy',                             'a_apprendre', null, 'urgent');

-- Genres d'origine (créés une seule fois).
insert into public.genres (name)
select distinct genre from jt_seed where genre is not null
on conflict (name_norm) do nothing;

-- Tunes : celles qui existent déjà sont laissées telles quelles.
with created as (
  insert into public.songs (title, artist, status, learning_priority)
  select title, artist, status, priority from jt_seed
  on conflict (title_norm, artist_norm) do nothing
  returning id, title_norm, artist_norm
)
insert into public.song_genres (song_id, genre_id)
select c.id, g.id
from created c
join jt_seed s
  on public.jt_normalize(s.title) = c.title_norm
 and public.jt_normalize(s.artist) = c.artist_norm
join public.genres g on g.name_norm = public.jt_normalize(s.genre)
on conflict do nothing;

commit;
