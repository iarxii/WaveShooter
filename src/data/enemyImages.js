// Tolerant enemy avatar resolution using assetUrl (supports fallback to public assets on CI where src might be incomplete)
import { assetUrl } from '../utils/assetPaths.ts'

export const ENEMY_IMAGE_MAP = {
  // Pathogens
  'MRSA': assetUrl('character_imgs/enemy_avatar/Pathogen/MRSA_Pathogen.png'),
  'VRE': assetUrl('character_imgs/enemy_avatar/Pathogen/VRE_Pathogen.png'),
  'K. pneumoniae ESBL': assetUrl('character_imgs/enemy_avatar/Pathogen/K._pneumoniae_ESBL_Pathogen.png'),
  'K. pneumoniae CRE': assetUrl('character_imgs/enemy_avatar/Pathogen/K._pneumoniae_CRE_Pathogen.png'),
  'A. baumannii MDR': assetUrl('character_imgs/enemy_avatar/Pathogen/A._baumannii_MDR_Pathogen.png'),
  'A. baumannii XDR': assetUrl('character_imgs/enemy_avatar/Pathogen/A._baumannii_XDR_Pathogen.png'),
  'P. aeruginosa MDR': assetUrl('character_imgs/enemy_avatar/Pathogen/P._aeruginosa_MDR_Pathogen.png'),
  'P. aeruginosa XDR': assetUrl('character_imgs/enemy_avatar/Pathogen/P._aeruginosa_XDR_Pathogen.png'),
  'Enterobacter ESBL': assetUrl('character_imgs/enemy_avatar/Pathogen/Enterobacter_ESBL_Pathogen.png'),
  'Enterobacter CRE': assetUrl('character_imgs/enemy_avatar/Pathogen/Enterobacter_CRE_Pathogen.png'),
  'E. coli ESBL': assetUrl('character_imgs/enemy_avatar/Pathogen/E._coli_ESBL_Pathogen.png'),
  'E. coli CRE': assetUrl('character_imgs/enemy_avatar/Pathogen/E._coli_CRE_Pathogen.png'),
  'Candida auris': assetUrl('character_imgs/enemy_avatar/Pathogen/Candida_auris_Pathogen_Fungal.png'),
  'C. difficile': assetUrl('character_imgs/enemy_avatar/Pathogen/C._difficile_Pathogen.png'),

  // Mutagens
  'UV Radiation': assetUrl('character_imgs/enemy_avatar/Mutagen/UV_Radiation_Mutagen.png'),
  'Benzene': assetUrl('character_imgs/enemy_avatar/Mutagen/Benzene_Mutagen.png'),
  'X-rays': assetUrl('character_imgs/enemy_avatar/Mutagen/X_Rays_1_Mutagen.png'),
  'Nitrosamines': assetUrl('character_imgs/enemy_avatar/Mutagen/Nitrosamines_1_Mutagen.png'),

  // Viruses (Major Bosses)
  'Influenza': assetUrl('character_imgs/enemy_avatar/Virus/Influenza_Virus.png'),
  'Hepatitis C': assetUrl('character_imgs/enemy_avatar/Virus/Hepatitis_C_Virus.png'),
  'Rotavirus': assetUrl('character_imgs/enemy_avatar/Virus/Rotavirus_Virus.png'),
  'Bacteriophage': assetUrl('character_imgs/enemy_avatar/Virus/Bacteriophage_Virus.png'),
  'Papillomavirus': assetUrl('character_imgs/enemy_avatar/Virus/Papillomavirus_Virus.png'),
  'Ebolavirus': assetUrl('character_imgs/enemy_avatar/Virus/Ebolavirus_Virus.png'),
  'Adenovirus': assetUrl('character_imgs/enemy_avatar/Virus/Adenovirus_Virus.png'),
  'HIV': assetUrl('character_imgs/enemy_avatar/Virus/HIV_Virus.png'),
}

export function getEnemyImageUrl(name){
  return ENEMY_IMAGE_MAP[name] || null
}
