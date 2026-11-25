// Génère les images dérivées à partir des originaux (jamais modifiés) :
//   assets/originals/logo-jamtonic.png -> public/brand/logo.png + icônes PWA
//   assets/originals/hero-bar.png      -> public/brand/hero-bar.webp
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const NIGHT = '#063B50'
const logoSrc = 'assets/originals/logo-jamtonic.png'
const heroSrc = 'assets/originals/hero-bar.png'

await mkdir('public/brand', { recursive: true })
await mkdir('public/icons', { recursive: true })

// Logo : marges transparentes rognées, largeur 1200.
const logo = await sharp(logoSrc).trim().resize({ width: 1200 }).png({ compressionLevel: 9 }).toBuffer()
await sharp(logo).toFile('public/brand/logo.png')

// Hero : même cadrage, format léger.
await sharp(heroSrc).webp({ quality: 80 }).toFile('public/brand/hero-bar.webp')
await sharp(heroSrc).resize({ width: 960 }).webp({ quality: 72 }).toFile('public/brand/hero-bar-960.webp')

// Icônes : logo centré sur fond bleu nuit.
async function icon(size, ratio, file) {
  const inner = await sharp(logo).resize({ width: Math.round(size * ratio) }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: NIGHT } })
    .composite([{ input: inner, gravity: 'centre' }])
    .png()
    .toFile(file)
}
await icon(192, 0.86, 'public/icons/icon-192.png')
await icon(512, 0.86, 'public/icons/icon-512.png')
await icon(512, 0.62, 'public/icons/icon-maskable-512.png') // zone sûre des icônes masquables
await icon(180, 0.84, 'public/icons/apple-touch-icon.png')
await icon(64, 0.92, 'src/app/icon.png')

console.log('Assets générés dans public/brand, public/icons et src/app/icon.png')
