// Map of hero names to avatar image URLs, with fallback

export const HERO_IMAGE_MAP = {
  'Dr. Dokta': new URL('../assets/character_imgs/Dr_Dokta/Dr_Dokta_avatar.jpg', import.meta.url).href,
  'Sr. Sesta': new URL('../assets/character_imgs/Sr_Sesta/sr_sesta_closeup.png', import.meta.url).href,
  'Nurse Temba': new URL('../assets/character_imgs/Nurse_Temba/nurse_temba_closeup.png', import.meta.url).href,
  'Jenita': null, // No asset found; fallback used
  'Mr. Hanz': new URL('../assets/character_imgs/Mr_Hanz/mr_hanz_full_avatar.png', import.meta.url).href,
  'Nthabiseng': new URL('../assets/character_imgs/Nthabiseng/nthabiseng_full_avatar.png', import.meta.url).href,
  'Dina': new URL('../assets/character_imgs/Dina/dina_full_avatar.png', import.meta.url).href,
  'Ray': new URL('../assets/character_imgs/Ray/ray_full_avatar.png', import.meta.url).href,
}

const HERO_FALLBACK = new URL('../assets/character_imgs/Hero/heroes_group.jpg', import.meta.url).href

export function getHeroImageUrl(name){
  return HERO_IMAGE_MAP[name] || HERO_FALLBACK
}
