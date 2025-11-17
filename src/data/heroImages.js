// Centralized image URL resolution that tolerates missing src assets (e.g. on Netlify when Git LFS not yet hydrated)
import { assetUrl } from '../utils/assetPaths.ts'

export const HERO_IMAGE_MAP = {
  'Dr. Dokta': assetUrl('character_imgs/Dr_Dokta/Dr_Dokta_full_avatar_1.png'),
  'Sr. Sesta': assetUrl('character_imgs/Sr_Sesta/sr_sesta_full_avatar.png'),
  'Nurse Temba': assetUrl('character_imgs/Nurse_Temba/nurse_temba_full_avatar.png'),
  'Jenita': assetUrl('character_imgs/Jenita/jenita_full_avatar.png'),
  'Mr. Hanz': assetUrl('character_imgs/Mr_Hanz/mr_hanz_full_avatar.png'),
  'Nthabiseng': assetUrl('character_imgs/Nthabiseng/nthabiseng_full_avatar.png'),
  'Dina': assetUrl('character_imgs/Dina/dina_full_avatar.png'),
  'Ray': assetUrl('character_imgs/Ray/ray_full_avatar.png'),

  // Support Vectors (Allies)
  'Honeybee Medics': assetUrl('character_imgs/ally_avatar/bee_medics.png'),
  'Ladybug Sterilizers': assetUrl('character_imgs/ally_avatar/ladybug_sterilizers.png'),
  'Dragonfly Sentinels': assetUrl('character_imgs/ally_avatar/dragonfly_sentinels.png'),
  'Therapy Dog': assetUrl('character_imgs/ally_avatar/therapy_dog.png'),
}

export const ALLY_IMAGE_MAP = {
  'Honeybee Medics': assetUrl('character_imgs/ally_avatar/bee_medics.png'),
  'Ladybug Sterilizers': assetUrl('character_imgs/ally_avatar/ladybug_sterilizers.png'),
  'Dragonfly Sentinels': assetUrl('character_imgs/ally_avatar/dragonfly_sentinels.png'),
  'Therapy Dog': assetUrl('character_imgs/ally_avatar/therapy_dog.png'),
}

const HERO_FALLBACK = assetUrl('character_imgs/Hero/heroes_group.jpg')


export function getHeroImageUrl(name){
  return HERO_IMAGE_MAP[name] || HERO_FALLBACK
}

export function getAllyImageUrl(name){
  return ALLY_IMAGE_MAP[name] || null
}