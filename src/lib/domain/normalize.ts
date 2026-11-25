/**
 * Même règle que la fonction SQL jt_normalize : sans accents, minuscules,
 * ponctuation et espaces réduits. La base reste l'arbitre (index unique) ;
 * cette version sert à la recherche et aux vérifications avant écriture.
 */
export function normalize(input: string | null | undefined): string {
  return (input ?? '')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[æÆ]/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Nettoie une saisie : espaces superflus retirés. */
export function clean(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}
