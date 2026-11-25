-- Priorité d'apprentissage d'une tune.
-- À ne pas confondre avec le statut : le statut décrit l'avancement,
-- la priorité décrit l'importance d'apprendre la tune. Les deux sont manuels.

create type public.learning_priority as enum ('urgent', 'moyen_terme', 'pour_le_fun');

alter table public.songs add column learning_priority public.learning_priority;

comment on column public.songs.learning_priority is
  'Importance de l''apprentissage (facultatif). Indépendante du statut, modifiable par tout membre.';
