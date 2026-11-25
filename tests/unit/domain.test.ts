import { describe, expect, it } from 'vitest'
import { formatDuration, formatTotalDuration, parseDuration } from '@/lib/domain/format'
import { emailToLogin, LOGIN_DOMAIN, loginToEmail, parseIdentifier } from '@/lib/domain/login'
import { normalize } from '@/lib/domain/normalize'
import { songSchema, suggestionSchema } from '@/lib/domain/schemas'
import { hashNetwork, signParticipant, verifyParticipant } from '@/lib/security/token'
import { analyse, detectColumns, parseCsv, resolve } from '@/lib/import/catalogue'

describe('normalisation (détection des doublons)', () => {
  it('ignore accents, casse, ponctuation et espaces', () => {
    expect(normalize('  Hôtel   California! ')).toBe('hotel california')
    expect(normalize('HOTEL CALIFORNIA')).toBe(normalize('Hôtel California'))
    expect(normalize("Sweet Child O' Mine")).toBe('sweet child o mine')
    expect(normalize('Cœur de loup')).toBe('coeur de loup')
  })
  it('garde les chiffres et supporte le vide', () => {
    expect(normalize('1979')).toBe('1979')
    expect(normalize(null)).toBe('')
  })
})

describe('durées', () => {
  it('lit et écrit mm:ss', () => {
    expect(parseDuration('3:45')).toBe(225)
    expect(parseDuration('225')).toBe(225)
    expect(parseDuration('')).toBeNull()
    expect(Number.isNaN(parseDuration('trois minutes'))).toBe(true)
    expect(formatDuration(225)).toBe('3:45')
    expect(formatTotalDuration(45 * 60)).toBe('45 min')
    expect(formatTotalDuration(95 * 60)).toBe('1 h 35')
  })
})

describe('validation', () => {
  const base = { status: 'a_decouvrir', links: [], genres: [], tags: [] }
  it('exige le titre et l’artiste', () => {
    expect(songSchema.safeParse({ ...base, title: '  ', artist: 'Eagles' }).success).toBe(false)
    expect(songSchema.safeParse({ ...base, title: 'Hotel California', artist: '' }).success).toBe(false)
    const ok = songSchema.safeParse({ ...base, title: ' Hotel  California ', artist: 'Eagles', duration_seconds: '6:30', year: '1977' })
    expect(ok.success && ok.data).toMatchObject({ title: 'Hotel California', duration_seconds: 390, year: 1977 })
  })
  it('lit la tonalité et le BPM, tous deux facultatifs', () => {
    const song = { ...base, title: 'A', artist: 'B' }
    const ok = songSchema.safeParse({ ...song, musical_key: '  La  m ', bpm: ' 120 ' })
    expect(ok.success && ok.data).toMatchObject({ musical_key: 'La m', bpm: 120 })
    const empty = songSchema.safeParse({ ...song, musical_key: '', bpm: '' })
    expect(empty.success && empty.data).toMatchObject({ musical_key: null, bpm: null })
    expect(songSchema.safeParse({ ...song, bpm: 'vite' }).success).toBe(false)
    expect(songSchema.safeParse({ ...song, bpm: '999' }).success).toBe(false)
  })
  it('refuse un statut inconnu et un lien non http', () => {
    expect(songSchema.safeParse({ ...base, title: 'A', artist: 'B', status: 'appris' }).success).toBe(false)
    expect(
      songSchema.safeParse({ ...base, title: 'A', artist: 'B', links: [{ label: 'x', url: 'javascript:alert(1)' }] }).success,
    ).toBe(false)
  })
  it('limite les suggestions du public à 120 caractères', () => {
    expect(suggestionSchema.safeParse({ title: 'x'.repeat(121), artist: 'B' }).success).toBe(false)
    expect(suggestionSchema.safeParse({ title: 'Africa', artist: 'Toto' }).success).toBe(true)
  })
})

describe('identifiant anonyme du participant', () => {
  const key = 'k'.repeat(40)
  const id = '2f1c7c0e-8f4a-4c57-9d0b-3a2b1c4d5e6f'
  it('accepte un jeton signé par le serveur', () => {
    expect(verifyParticipant(signParticipant(id, key), key)).toBe(id)
  })
  it('refuse un identifiant fabriqué, modifié ou signé avec une autre clé', () => {
    const token = signParticipant(id, key)
    const other = '9a1c7c0e-8f4a-4c57-9d0b-3a2b1c4d5e6f'
    expect(verifyParticipant(id, key)).toBeNull()
    expect(verifyParticipant(`${other}.${token.split('.')[1]}`, key)).toBeNull()
    expect(verifyParticipant(signParticipant(id, 'z'.repeat(40)), key)).toBeNull()
    expect(verifyParticipant('nimporte.quoi', key)).toBeNull()
    expect(verifyParticipant(undefined, key)).toBeNull()
  })
  it('hache l’adresse réseau, différemment chaque jour', () => {
    const a = hashNetwork('203.0.113.7', '2026-11-22', key)
    expect(a).not.toContain('203.0.113.7')
    expect(a).toBe(hashNetwork('203.0.113.7', '2026-11-22', key))
    expect(a).not.toBe(hashNetwork('203.0.113.7', '2026-11-23', key))
  })
})

describe('import CSV du catalogue', () => {
  it('lit guillemets, virgules et lignes vides', () => {
    expect(parseCsv('Titre,Artiste\n"Hello, Goodbye",The Beatles\n\n"Dis ""oui""",X\n')).toEqual([
      ['Titre', 'Artiste'],
      ['Hello, Goodbye', 'The Beatles'],
      [''],
      ['Dis "oui"', 'X'],
    ])
  })

  it('trouve les colonnes d’après les en-têtes', () => {
    expect(detectColumns([['Setlist disponible'], ['Artiste', 'Titre', 'Catégorie']])).toEqual({
      headerIndex: 1,
      columns: { artist: 0, title: 1, category: 2 },
    })
  })

  it('traite les lignes de section comme des catégories, sans en faire des statuts', () => {
    const rows = parseCsv(
      ['Titre,Artiste', 'Rock,', 'Highway to Hell,AC/DC', 'Pop,', 'Billie Jean,Michael Jackson', 'À apprendre,', 'Africa,Toto'].join('\n'),
    )
    const result = analyse(rows)
    expect(result.categories).toEqual(['Rock', 'Pop', 'À apprendre'])
    expect(result.entries.map((e) => [e.title, e.category, e.status])).toEqual([
      ['Highway to Hell', 'Rock', null],
      ['Billie Jean', 'Pop', null],
      ['Africa', 'À apprendre', null],
    ])
  })

  it('signale doublons et valeurs manquantes sans rien inventer', () => {
    const rows = parseCsv(
      ['Titre,Artiste,Statut,Durée', 'Zombie,The Cranberries,Maîtrisé,5:06', 'ZOMBIE,the cranberries,,', 'Sans artiste,,,', 'Creep,Radiohead,presque prête,abc'].join('\n'),
    )
    const result = analyse(rows)
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0]).toMatchObject({ status: 'maitrise', duration_seconds: 306 })
    expect(result.entries[1]).toMatchObject({ title: 'Creep', status: null, duration_seconds: null })
    expect(result.issues.map((i) => i.level)).toEqual(['attention', 'attention', 'attention', 'attention'])
  })

  it('refuse d’importer une tune sans statut décidé par le band', () => {
    const entries = analyse(parseCsv('Titre,Artiste,Catégorie\nA,B,Rock\nC,D,À apprendre\nE,F,Franco')).entries
    const { ready, unresolved } = resolve(entries, {
      defaultStatus: null,
      categories: { Rock: { genre: 'Rock', status: 'maitrise' }, 'a apprendre': { status: 'a_apprendre' }, Franco: { genre: 'Franco' } },
    })
    expect(ready.map((e) => [e.title, e.finalStatus, e.genre])).toEqual([
      ['A', 'maitrise', 'Rock'],
      ['C', 'a_apprendre', null],
    ])
    expect(unresolved).toHaveLength(1)
    expect(unresolved[0]?.message).toContain('E — F')
  })
})

describe('connexion par identifiant', () => {
  it('range un identifiant sous le domaine interne et laisse un courriel intact', () => {
    expect(loginToEmail('  Florian ')).toBe(`florian@${LOGIN_DOMAIN}`)
    expect(loginToEmail('Toi@Exemple.com')).toBe('toi@exemple.com')
  })
  it('refuse un identifiant invalide', () => {
    expect(loginToEmail('a')).toBeNull()
    expect(loginToEmail('deux mots')).toBeNull()
    expect(parseIdentifier('-florian')).toBeNull()
  })
  it("affiche l'identifiant plutôt que le courriel interne", () => {
    expect(emailToLogin(`jamtonic@${LOGIN_DOMAIN}`)).toBe('jamtonic')
    expect(emailToLogin('toi@exemple.com')).toBe('toi@exemple.com')
  })
})
