/**
 * Règles métier essentielles, vérifiées contre la base Supabase LOCALE
 * (vraies politiques RLS, vraies fonctions SQL). Prérequis : `npm run supabase:start`.
 *
 * Chaque exécution crée ses propres données (préfixe unique) et les supprime à la fin.
 */
import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
const secret = process.env.SUPABASE_SECRET_KEY ?? ''

if (!/127\.0\.0\.1|localhost/.test(url)) {
  throw new Error('Les tests d’intégration ne tournent que sur la base locale (voir .env.local).')
}

const run = randomUUID().slice(0, 8)
const tag = (name: string) => `TEST ${run} ${name}`
const options = { auth: { persistSession: false, autoRefreshToken: false } }

const admin = createClient(url, secret, options)
const anon = createClient(url, anonKey, options)

let alice: SupabaseClient // membre, propriétaire technique
let bob: SupabaseClient // membre
let outsider: SupabaseClient // compte Auth sans profil
let aliceId = ''
let bobId = ''
const userIds: string[] = []

async function createUser(name: string, profile: null | { is_owner: boolean }) {
  const email = `test-${run}-${name}@jamtonic.test`
  const password = `Pw-${randomUUID()}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser ${name}: ${error?.message}`)
  userIds.push(data.user.id)
  if (profile) {
    const { error: e } = await admin
      .from('profiles')
      .insert({ id: data.user.id, display_name: name, is_owner: profile.is_owner })
    if (e) throw new Error(e.message)
  }
  const client = createClient(url, anonKey, options)
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw new Error(signIn.error.message)
  return { client, id: data.user.id }
}

async function song(name: string, status: string) {
  const { data, error } = await alice
    .from('songs')
    .insert({ title: tag(name), artist: 'Les Tests', status })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id as string
}

async function activeSession(name: string, songIds: string[], max: number | null = 5) {
  const { data, error } = await alice
    .from('concert_sessions')
    .insert({ name: tag(name), starts_on: '2030-01-01', status: 'active', max_votes_per_participant: max })
    .select('id, slug')
    .single()
  if (error) throw new Error(error.message)
  const set = await alice.rpc('set_session_songs', { p_session: data.id, p_song_ids: songIds })
  if (set.error) throw new Error(set.error.message)
  return data as { id: string; slug: string }
}

const vote = async (slug: string, songId: string, participant: string, on = true) => {
  const { data, error } = await admin.rpc('cast_public_vote', {
    p_slug: slug,
    p_song: songId,
    p_participant: participant,
    p_on: on,
  })
  if (error) throw new Error(error.message)
  return data as { result: string; used?: number }
}

const votesFor = async (sessionId: string, songId: string) => {
  const { data, error } = await alice.rpc('session_ranking', { p_session: sessionId })
  if (error) throw new Error(error.message)
  return (data as { song_id: string; votes: number }[]).find((r) => r.song_id === songId)?.votes ?? 0
}

beforeAll(async () => {
  const a = await createUser('alice', { is_owner: true })
  const b = await createUser('bob', { is_owner: false })
  const o = await createUser('intrus', null)
  alice = a.client
  aliceId = a.id
  bob = b.client
  bobId = b.id
  outsider = o.client
})

afterAll(async () => {
  await admin.from('public_suggestions').delete().like('title', `TEST ${run}%`)
  await admin.from('concert_sessions').delete().like('name', `TEST ${run}%`)
  await admin.from('playlists').delete().like('name', `TEST ${run}%`)
  await admin.from('songs').delete().like('title', `TEST ${run}%`)
  await admin.from('rate_limits').delete().like('bucket', `test:${run}%`)
  for (const id of userIds) await admin.auth.admin.deleteUser(id)
})

describe('1. Un visiteur anonyme ne peut pas accéder aux données privées', () => {
  const tables = [
    'profiles', 'songs', 'genres', 'song_genres', 'tags', 'song_tags', 'song_member_notes',
    'internal_votes', 'playlists', 'playlist_songs', 'concert_sessions', 'session_songs',
    'public_votes', 'public_suggestions', 'activity_log', 'rate_limits',
  ]
  it.each(tables)('lecture de %s refusée', async (table) => {
    await song(`privé ${table}`, 'en_cours') // garantit qu'il y a des données à cacher
    const { data, error } = await anon.from(table).select('*').limit(1)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('écriture refusée, y compris par les fonctions réservées au serveur', async () => {
    expect((await anon.from('songs').insert({ title: tag('pirate'), artist: 'X' })).error).not.toBeNull()
    expect(
      (await anon.rpc('cast_public_vote', { p_slug: 'x', p_song: randomUUID(), p_participant: randomUUID(), p_on: true })).error,
    ).not.toBeNull()
    expect((await anon.rpc('submit_public_suggestion', { p_title: 'a', p_artist: 'b' })).error).not.toBeNull()
    expect((await anon.rpc('check_rate_limit', { p_bucket: 'x', p_key: 'y', p_max: 1, p_window_seconds: 60 })).error).not.toBeNull()
    expect((await anon.rpc('session_ranking', { p_session: randomUUID() })).error).not.toBeNull()
  })

  it('aucune inscription publique', async () => {
    const { data, error } = await anon.auth.signUp({ email: `pirate-${run}@jamtonic.test`, password: 'Motdepasse-123' })
    expect(error).not.toBeNull()
    expect(data.user).toBeNull()
  })
})

describe('2. Un morceau non maîtrisé n’apparaît pas publiquement', () => {
  it('seul « Maîtrisé » est visible, et il disparaît dès qu’il change de statut', async () => {
    const mastered = await song('public maîtrisé', 'maitrise')
    const learning = await song('public en cours', 'en_cours')
    const archived = await song('public archivé', 'maitrise')
    await alice.from('songs').update({ archived_at: new Date().toISOString() }).eq('id', archived)

    const visible = async () => {
      const { data, error } = await anon.from('public_songs').select('*').like('title', `TEST ${run} public%`)
      expect(error).toBeNull()
      return (data ?? []).map((s) => s.id)
    }
    expect(await visible()).toEqual([mastered])
    expect(await visible()).not.toContain(learning)

    await alice.from('songs').update({ status: 'a_reviser' }).eq('id', mastered)
    expect(await visible()).toEqual([])
  })

  it('la vue publique n’expose ni notes ni statut', async () => {
    const id = await song('colonnes', 'maitrise')
    await alice.from('songs').update({ notes: 'secret de répétition' }).eq('id', id)
    const { data } = await anon.from('public_songs').select('*').eq('id', id).single()
    expect(Object.keys(data ?? {}).sort()).toEqual(['artist', 'duration_seconds', 'genres', 'id', 'title', 'year'])
  })
})

describe('3. Un membre peut modifier les statuts', () => {
  it('n’importe quel membre, vers n’importe quel statut, sans étape imposée', async () => {
    const id = await song('statut', 'a_decouvrir')
    const { error } = await bob.from('songs').update({ status: 'maitrise' }).eq('id', id)
    expect(error).toBeNull()
    const { data } = await alice.from('songs').select('status, updated_by').eq('id', id).single()
    expect(data).toEqual({ status: 'maitrise', updated_by: bobId })
    expect((await bob.from('songs').update({ status: 'a_decouvrir' }).eq('id', id)).error).toBeNull()
  })

  it('les doublons (accents, casse, espaces) sont refusés par la base', async () => {
    await alice.from('songs').insert({ title: tag('Hôtel Doublon'), artist: 'Éagles' })
    const { error } = await bob.from('songs').insert({ title: tag('hotel   DOUBLON'), artist: 'eagles' })
    expect(error?.code).toBe('23505')
  })
})

describe('4. Un membre ne vote qu’une fois sur un morceau « À découvrir »', () => {
  it('unicité, vote pour soi seulement, retrait de son propre vote', async () => {
    const id = await song('vote interne', 'a_decouvrir')
    expect((await alice.from('internal_votes').insert({ song_id: id, member_id: aliceId })).error).toBeNull()
    expect((await alice.from('internal_votes').insert({ song_id: id, member_id: aliceId })).error?.code).toBe('23505')
    // Voter au nom d'un autre membre : refusé.
    expect((await alice.from('internal_votes').insert({ song_id: id, member_id: bobId })).error).not.toBeNull()

    expect((await bob.from('internal_votes').insert({ song_id: id, member_id: bobId })).error).toBeNull()
    // Retirer le vote d'un autre : sans effet.
    await alice.from('internal_votes').delete().eq('song_id', id).eq('member_id', bobId)
    const { data } = await alice.from('internal_votes').select('member_id').eq('song_id', id)
    expect((data ?? []).map((v) => v.member_id).sort()).toEqual([aliceId, bobId].sort())

    await alice.from('internal_votes').delete().eq('song_id', id).eq('member_id', aliceId)
    const after = await alice.from('internal_votes').select('member_id').eq('song_id', id)
    expect(after.data).toEqual([{ member_id: bobId }])
  })

  it('pas de vote interne hors « À découvrir »', async () => {
    const id = await song('vote hors statut', 'en_cours')
    expect((await alice.from('internal_votes').insert({ song_id: id, member_id: aliceId })).error).not.toBeNull()
  })
})

describe('5. Un morceau ne change jamais de statut automatiquement', () => {
  it('ni les votes internes ni les votes du public ne touchent au statut', async () => {
    const discover = await song('auto découvrir', 'a_decouvrir')
    await alice.from('internal_votes').insert({ song_id: discover, member_id: aliceId })
    await bob.from('internal_votes').insert({ song_id: discover, member_id: bobId })

    const mastered = await song('auto maîtrisé', 'maitrise')
    const session = await activeSession('auto', [mastered], null)
    for (let i = 0; i < 12; i++) await vote(session.slug, mastered, randomUUID())

    const { data } = await alice.from('songs').select('id, status').in('id', [discover, mastered])
    expect(Object.fromEntries((data ?? []).map((s) => [s.id, s.status]))).toEqual({
      [discover]: 'a_decouvrir',
      [mastered]: 'maitrise',
    })
  })
})

describe('6. Les playlists restent indépendantes des statuts', () => {
  it('accepte tous les statuts et ne bouge pas quand un statut change', async () => {
    const ids = [await song('pl a', 'a_decouvrir'), await song('pl b', 'en_cours'), await song('pl c', 'maitrise')]
    const { data: playlist } = await alice.from('playlists').insert({ name: tag('playlist') }).select('id').single()
    for (const id of ids) {
      expect((await alice.rpc('add_song_to_playlist', { p_playlist: playlist!.id, p_song: id })).error).toBeNull()
    }
    const order = async (pid: string) =>
      ((await alice.from('playlist_songs').select('song_id').eq('playlist_id', pid).order('position')).data ?? []).map(
        (r) => r.song_id,
      )
    expect(await order(playlist!.id)).toEqual(ids)

    await bob.rpc('reorder_playlist', { p_playlist: playlist!.id, p_song_ids: [ids[2], ids[0], ids[1]] })
    await alice.from('songs').update({ status: 'a_reviser' }).eq('id', ids[2]!)
    await alice.from('songs').update({ status: 'maitrise' }).eq('id', ids[0]!)
    expect(await order(playlist!.id)).toEqual([ids[2], ids[0], ids[1]])

    const copy = await alice.rpc('duplicate_playlist', { p_playlist: playlist!.id, p_name: tag('playlist copie') })
    expect(await order(copy.data as string)).toEqual([ids[2], ids[0], ids[1]])
  })
})

describe('7. Les votes publics sont isolés par session', () => {
  it('un vote dans une session ne compte pas dans une autre', async () => {
    const id = await song('isolation', 'maitrise')
    const s1 = await activeSession('isolation 1', [id])
    const s2 = await activeSession('isolation 2', [id])
    const p = randomUUID()
    expect((await vote(s1.slug, id, p)).result).toBe('added')
    expect((await vote(s1.slug, id, p)).result).toBe('added') // idempotent
    expect(await votesFor(s1.id, id)).toBe(1)
    expect(await votesFor(s2.id, id)).toBe(0)
    expect((await vote(s2.slug, id, p)).result).toBe('added') // même personne, autre soirée
    expect(await votesFor(s2.id, id)).toBe(1)
    expect(await votesFor(s1.id, id)).toBe(1)
  })

  it('refuse : plafond atteint, tune hors sélection, tune plus maîtrisée, votes fermés', async () => {
    const a = await song('règles a', 'maitrise')
    const b = await song('règles b', 'maitrise')
    const c = await song('règles c', 'maitrise')
    const outside = await song('règles hors sélection', 'maitrise')
    const session = await activeSession('règles', [a, b, c], 2)
    const p = randomUUID()

    expect((await vote(session.slug, a, p)).result).toBe('added')
    expect(await vote(session.slug, b, p)).toEqual({ result: 'added', used: 2 })
    expect((await vote(session.slug, c, p)).result).toBe('limit')
    expect((await vote(session.slug, a, p, false)).result).toBe('removed')
    expect((await vote(session.slug, c, p)).result).toBe('added')

    expect((await vote(session.slug, outside, randomUUID())).result).toBe('not_available')
    await alice.from('songs').update({ status: 'a_reviser' }).eq('id', a)
    expect((await vote(session.slug, a, randomUUID())).result).toBe('not_available')
    expect(((await anon.rpc('public_session_songs', { p_slug: session.slug })).data ?? []).map((s: { id: string }) => s.id)).not.toContain(a)

    await alice.from('concert_sessions').update({ voting_open: false }).eq('id', session.id)
    expect((await vote(session.slug, b, randomUUID())).result).toBe('closed')
    await alice.from('concert_sessions').update({ voting_open: true, status: 'terminee' }).eq('id', session.id)
    expect((await vote(session.slug, b, randomUUID())).result).toBe('closed')
  })

  it('un brouillon est introuvable pour le public', async () => {
    const { data } = await alice
      .from('concert_sessions')
      .insert({ name: tag('brouillon'), starts_on: '2030-01-01' })
      .select('slug')
      .single()
    expect((await anon.rpc('public_get_session', { p_slug: data!.slug })).data).toEqual([])
    expect(((await anon.from('public_concerts').select('slug').eq('slug', data!.slug)).data ?? []).length).toBe(0)
  })
})

describe('8. Un visiteur ne peut pas modifier les votes d’un autre participant', () => {
  it('retirer « son » vote ne touche pas celui des autres ; aucun accès direct à la table', async () => {
    const id = await song('autrui', 'maitrise')
    const session = await activeSession('autrui', [id])
    const p1 = randomUUID()
    const p2 = randomUUID()
    await vote(session.slug, id, p1)
    expect((await vote(session.slug, id, p2, false)).result).toBe('removed')
    expect(await votesFor(session.id, id)).toBe(1)

    expect((await anon.from('public_votes').delete().eq('session_id', session.id)).error).not.toBeNull()
    expect(
      (await anon.from('public_votes').insert({ session_id: session.id, song_id: id, participant_id: randomUUID() })).error,
    ).not.toBeNull()
    // Même un membre ne peut pas écrire de votes publics à la main.
    expect(
      (await alice.from('public_votes').insert({ session_id: session.id, song_id: id, participant_id: randomUUID() })).error,
    ).not.toBeNull()
    expect(await votesFor(session.id, id)).toBe(1)
  })

  it('la limite de fréquence coupe après le maximum', async () => {
    const call = () =>
      admin.rpc('check_rate_limit', { p_bucket: `test:${run}`, p_key: 'k', p_max: 3, p_window_seconds: 3600 })
    const results = []
    for (let i = 0; i < 5; i++) results.push((await call()).data)
    expect(results).toEqual([true, true, true, false, false])
  })
})

describe('9. Une suggestion publique ne devient jamais automatiquement un morceau', () => {
  it('reste une suggestion jusqu’à la décision explicite d’un membre', async () => {
    const title = tag('Suggestion du public')
    const p = randomUUID()
    const submit = (participant: string) =>
      admin.rpc('submit_public_suggestion', { p_title: title, p_artist: 'Artiste Suggéré', p_participant: participant })
    expect((await submit(p)).data).toBe('ok')
    expect((await submit(p)).data).toBe('duplicate')
    expect((await submit(randomUUID())).data).toBe('ok')
    expect((await admin.rpc('submit_public_suggestion', { p_title: '  ', p_artist: 'X' })).data).toBe('invalid')

    const songs = () => alice.from('songs').select('id, status').eq('title', title)
    expect((await songs()).data).toEqual([])

    const { data: rows } = await alice.from('public_suggestions').select('id').eq('title', title)
    expect(rows).toHaveLength(2)
    const created = await bob.rpc('create_song_from_suggestion', { p_suggestion: rows![0]!.id })
    expect(created.error).toBeNull()
    expect((await songs()).data).toEqual([{ id: (created.data as { song_id: string }).song_id, status: 'a_decouvrir' }])
    const { data: after } = await alice.from('public_suggestions').select('status').eq('title', title)
    expect(after).toEqual([{ status: 'retenue' }, { status: 'retenue' }])
  })
})

describe('10. Les comptes non autorisés n’accèdent pas à l’administration', () => {
  it('un compte connecté sans profil ne lit et n’écrit rien', async () => {
    const id = await song('intrus', 'en_cours')
    for (const table of ['songs', 'profiles', 'playlists', 'internal_votes', 'activity_log', 'public_votes']) {
      const { data } = await outsider.from(table).select('*').limit(5)
      expect(data ?? []).toEqual([])
    }
    expect((await outsider.from('songs').insert({ title: tag('intrus écrit'), artist: 'X' })).error).not.toBeNull()
    await outsider.from('songs').update({ status: 'maitrise' }).eq('id', id)
    expect((await alice.from('songs').select('status').eq('id', id).single()).data?.status).toBe('en_cours')
    expect((await outsider.rpc('session_ranking', { p_session: randomUUID() })).data ?? []).toEqual([])
    expect((await outsider.rpc('reorder_playlist', { p_playlist: randomUUID(), p_song_ids: [] })).error).not.toBeNull()
  })

  it('un membre désactivé perd tout accès ; personne ne peut s’accorder des droits', async () => {
    // Bob tente de se nommer propriétaire : colonnes non modifiables.
    expect((await bob.from('profiles').update({ is_owner: true }).eq('id', bobId)).error).not.toBeNull()
    expect((await bob.from('profiles').update({ display_name: 'Bobby' }).eq('id', bobId)).error).toBeNull()
    // Bob ne peut pas modifier le profil d'Alice.
    await bob.from('profiles').update({ display_name: 'Piratée' }).eq('id', aliceId)
    expect((await alice.from('profiles').select('display_name').eq('id', aliceId).single()).data?.display_name).toBe('alice')

    await admin.from('profiles').update({ is_active: false }).eq('id', bobId)
    expect((await bob.from('songs').select('id').limit(1)).data).toEqual([])
    expect((await bob.from('songs').insert({ title: tag('désactivé'), artist: 'X' })).error).not.toBeNull()
  })

  it('les notes personnelles ne sont lisibles que par leur auteur', async () => {
    const id = await song('notes perso', 'en_cours')
    await alice.from('song_member_notes').insert({ song_id: id, member_id: aliceId, body: 'capo 2' })
    const carol = await createUser('carol', { is_owner: false })
    expect((await carol.client.from('song_member_notes').select('*').eq('song_id', id)).data).toEqual([])
    expect(
      (await carol.client.from('song_member_notes').insert({ song_id: id, member_id: aliceId, body: 'écrasée' })).error,
    ).not.toBeNull()
    expect((await alice.from('song_member_notes').select('body').eq('song_id', id)).data).toEqual([{ body: 'capo 2' }])
  })
})
