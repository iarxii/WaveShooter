// Map of enemy names to avatar image URLs bundled by Vite
// Images live under src/assets/character_imgs/enemy_avatar/{Pathogen|Mutagen|Virus}

export const ENEMY_IMAGE_MAP = {
  // Pathogens
  'MRSA': new URL('../assets/character_imgs/enemy_avatar/Pathogen/MRSA_Pathogen.png', import.meta.url).href,
  'VRE': new URL('../assets/character_imgs/enemy_avatar/Pathogen/VRE_Pathogen.png', import.meta.url).href,
  'K. pneumoniae ESBL': new URL('../assets/character_imgs/enemy_avatar/Pathogen/K._pneumoniae_ESBL_Pathogen.png', import.meta.url).href,
  'K. pneumoniae CRE': new URL('../assets/character_imgs/enemy_avatar/Pathogen/K._pneumoniae_CRE_Pathogen.png', import.meta.url).href,
  'A. baumannii MDR': new URL('../assets/character_imgs/enemy_avatar/Pathogen/A._baumannii_MDR_Pathogen.png', import.meta.url).href,
  'A. baumannii XDR': new URL('../assets/character_imgs/enemy_avatar/Pathogen/A._baumannii_XDR_Pathogen.png', import.meta.url).href,
  'P. aeruginosa MDR': new URL('../assets/character_imgs/enemy_avatar/Pathogen/P._aeruginosa_MDR_Pathogen.png', import.meta.url).href,
  'P. aeruginosa XDR': new URL('../assets/character_imgs/enemy_avatar/Pathogen/P._aeruginosa_XDR_Pathogen.png', import.meta.url).href,
  'Enterobacter ESBL': new URL('../assets/character_imgs/enemy_avatar/Pathogen/Enterobacter_ESBL_Pathogen.png', import.meta.url).href,
  'Enterobacter CRE': new URL('../assets/character_imgs/enemy_avatar/Pathogen/Enterobacter_CRE_Pathogen.png', import.meta.url).href,
  'E. coli ESBL': new URL('../assets/character_imgs/enemy_avatar/Pathogen/E._coli_ESBL_Pathogen.png', import.meta.url).href,
  'E. coli CRE': new URL('../assets/character_imgs/enemy_avatar/Pathogen/E._coli_CRE_Pathogen.png', import.meta.url).href,
  'Candida auris': new URL('../assets/character_imgs/enemy_avatar/Pathogen/Candida_auris_Pathogen_Fungal.png', import.meta.url).href,
  'C. difficile': new URL('../assets/character_imgs/enemy_avatar/Pathogen/C._difficile_Pathogen.png', import.meta.url).href,

  // Mutagens
  'UV Radiation': new URL('../assets/character_imgs/enemy_avatar/Mutagen/UV_Radiation_Mutagen.png', import.meta.url).href,
  'Benzene': new URL('../assets/character_imgs/enemy_avatar/Mutagen/Benzene_Mutagen.png', import.meta.url).href,
  'X-rays': new URL('../assets/character_imgs/enemy_avatar/Mutagen/X_Rays_1_Mutagen.png', import.meta.url).href,
  'Nitrosamines': new URL('../assets/character_imgs/enemy_avatar/Mutagen/Nitrosamines_1_Mutagen.png', import.meta.url).href,

  // Viruses (Major Bosses)
  'Influenza': new URL('../assets/character_imgs/enemy_avatar/Virus/Influenza_Virus.png', import.meta.url).href,
  'Hepatitis C': new URL('../assets/character_imgs/enemy_avatar/Virus/Hepatitis_C_Virus.png', import.meta.url).href,
  'Rotavirus': new URL('../assets/character_imgs/enemy_avatar/Virus/Rotavirus_Virus.png', import.meta.url).href,
  'Bacteriophage': new URL('../assets/character_imgs/enemy_avatar/Virus/Bacteriophage_Virus.png', import.meta.url).href,
  'Papillomavirus': new URL('../assets/character_imgs/enemy_avatar/Virus/Papillomavirus_Virus.png', import.meta.url).href,
  'Ebolavirus': new URL('../assets/character_imgs/enemy_avatar/Virus/Ebolavirus_Virus.png', import.meta.url).href,
  'Adenovirus': new URL('../assets/character_imgs/enemy_avatar/Virus/Adenovirus_Virus.png', import.meta.url).href,
  'HIV': new URL('../assets/character_imgs/enemy_avatar/Virus/HIV_Virus.png', import.meta.url).href,
}

export function getEnemyImageUrl(name){
  return ENEMY_IMAGE_MAP[name] || null
}
