import React from 'react';

/**
 * Traditional Sivakasi Fireworks Letterpress Motifs:
 * 1. Lord Murugan with sacred Vel in Temple Prabhavali Arch (Left motif)
 * 2. Sacred Kalpavriksha / Wish-Fulfilling Auspicious Tree (Right motif)
 */

export const MURUGAN_VEL_SVG_MARKUP = `
<svg width="68" height="88" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Temple Arch (Prabhavali) Outer Rim -->
  <path d="M50 4 C24 4 6 22 6 48 C6 76 12 104 12 114 L88 114 C88 104 94 76 94 48 C94 22 76 4 50 4 Z" fill="none" stroke="#801414" stroke-width="3" stroke-linecap="round"/>
  <!-- Arch Inner Rim -->
  <path d="M50 10 C28 10 12 26 12 48 C12 74 18 98 18 110 L82 110 C82 98 88 74 88 48 C88 26 72 10 50 10 Z" fill="none" stroke="#801414" stroke-width="1.5"/>
  <!-- Kalasam / Pinnacle on Top of Arch -->
  <path d="M50 0 L53 6 L47 6 Z" fill="#801414"/>
  <circle cx="50" cy="2" r="2.5" fill="#801414"/>
  <path d="M44 6 H56 V8 H44 Z" fill="#801414"/>
  <!-- Decorative Flaming Aureole / Prabhavali Rays -->
  <circle cx="20" cy="24" r="2" fill="#801414"/>
  <circle cx="32" cy="14" r="2" fill="#801414"/>
  <circle cx="50" cy="8" r="2.5" fill="#801414"/>
  <circle cx="68" cy="14" r="2" fill="#801414"/>
  <circle cx="80" cy="24" r="2" fill="#801414"/>
  <circle cx="10" cy="42" r="2" fill="#801414"/>
  <circle cx="90" cy="42" r="2" fill="#801414"/>
  <circle cx="10" cy="64" r="2" fill="#801414"/>
  <circle cx="90" cy="64" r="2" fill="#801414"/>
  <!-- Pedestal Base (Peedam) -->
  <rect x="8" y="114" width="84" height="6" rx="2" fill="#801414"/>
  <rect x="4" y="120" width="92" height="7" rx="2" fill="#801414"/>
  <line x1="16" y1="124" x2="84" y2="124" stroke="#FFFFFF" stroke-width="1.5"/>
  <!-- Sacred Vel (Divine Spear) - Centerpiece -->
  <!-- Vel Blade (Elongated Leaf with Sacred Tip) -->
  <path d="M50 16 C42 30 40 44 48 54 L50 56 L52 54 C60 44 58 30 50 16 Z" fill="#801414"/>
  <!-- Vel Inner Glow / Sacred Markings -->
  <path d="M50 20 C45 32 44 42 49 50 L50 52 L51 50 C56 42 55 32 50 20 Z" fill="#FFFFFF"/>
  <path d="M50 24 L50 48" stroke="#801414" stroke-width="1.8"/>
  <!-- Vibhuti (Three Horizontal Sacred Ash Lines) on Vel -->
  <line x1="46" y1="36" x2="54" y2="36" stroke="#801414" stroke-width="1.2"/>
  <line x1="45" y1="39" x2="55" y2="39" stroke="#801414" stroke-width="1.2"/>
  <line x1="46" y1="42" x2="54" y2="42" stroke="#801414" stroke-width="1.2"/>
  <circle cx="50" cy="39" r="1.2" fill="#801414"/>
  <!-- Vel Staff / Spear Handle -->
  <rect x="48.5" y="55" width="3" height="57" fill="#801414"/>
  <!-- Deity Crown (Kireedam) & Silhouette flanking Vel -->
  <path d="M36 46 L40 40 L44 45 L40 50 Z" fill="#801414"/>
  <path d="M64 46 L60 40 L56 45 L60 50 Z" fill="#801414"/>
  <!-- Sacred Deity Aura & Ornaments -->
  <circle cx="38" cy="54" r="5" fill="#801414"/>
  <circle cx="62" cy="54" r="5" fill="#801414"/>
  <!-- Shawl / Garland (Maalai) Draping -->
  <path d="M30 62 C34 78 44 94 48 102" stroke="#801414" stroke-width="3" stroke-linecap="round"/>
  <path d="M70 62 C66 78 56 94 52 102" stroke="#801414" stroke-width="3" stroke-linecap="round"/>
  <!-- Hanging Temple Lamps (Kuthu Vilakku) on sides -->
  <path d="M22 66 L22 84 M18 84 H26 M19 84 L22 89 L25 84" stroke="#801414" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M78 66 L78 84 M74 84 H82 M75 84 L78 89 L81 84" stroke="#801414" stroke-width="1.5" stroke-linecap="round"/>
</svg>
`;

export const KALPAVRIKSHA_TREE_SVG_MARKUP = `
<svg width="68" height="88" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Sacred Kalpavriksha (Auspicious Tree of Life) -->
  <!-- Stepped Peedam / Kumbham Pot Base -->
  <rect x="10" y="118" width="80" height="4" rx="1.5" fill="#801414"/>
  <rect x="4" y="122" width="92" height="6" rx="2" fill="#801414"/>
  <!-- Poorna Kumbham / Sacred Urn Base -->
  <path d="M36 118 C34 108 40 100 50 100 C60 100 66 108 64 118 Z" fill="#801414"/>
  <circle cx="50" cy="108" r="3.5" fill="#FFFFFF"/>
  <circle cx="50" cy="108" r="1.5" fill="#801414"/>
  <!-- Robust Tree Trunk -->
  <path d="M47 100 L47 68 C47 62 44 56 40 52 L36 48 M53 100 L53 68 C53 62 56 56 60 52 L64 48" stroke="#801414" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="47" y="60" width="6" height="40" fill="#801414"/>
  <!-- Dense Auspicious Foliage Branches (Peepal / Mango sacred leaves in tiers) -->
  <!-- Topmost Apex Foliage -->
  <path d="M50 4 C44 14 44 26 50 32 C56 26 56 14 50 4 Z" fill="#801414"/>
  <path d="M38 14 C34 24 38 32 46 34 C44 24 40 18 38 14 Z" fill="#801414"/>
  <path d="M62 14 C66 24 62 32 54 34 C56 24 60 18 62 14 Z" fill="#801414"/>
  <!-- Second Tier Broad Foliage -->
  <path d="M26 24 C20 34 26 44 36 44 C34 34 28 28 26 24 Z" fill="#801414"/>
  <path d="M74 24 C80 34 74 44 64 44 C66 34 72 28 74 24 Z" fill="#801414"/>
  <circle cx="50" cy="24" r="5" fill="#801414"/>
  <!-- Middle Tier Grand Canopy -->
  <path d="M16 38 C10 48 18 60 30 58 C28 46 20 42 16 38 Z" fill="#801414"/>
  <path d="M84 38 C90 48 82 60 70 58 C72 46 80 42 84 38 Z" fill="#801414"/>
  <circle cx="34" cy="38" r="4.5" fill="#801414"/>
  <circle cx="66" cy="38" r="4.5" fill="#801414"/>
  <circle cx="50" cy="44" r="6" fill="#801414"/>
  <!-- Lower Spreading Branches & Auspicious Fruits (Manga / Kalpavriksha Ratna) -->
  <path d="M10 56 C6 68 18 78 30 72 C26 62 16 60 10 56 Z" fill="#801414"/>
  <path d="M90 56 C94 68 82 78 70 72 C74 62 84 60 90 56 Z" fill="#801414"/>
  <!-- Sacred Hanging Fruits / Wish-granting gems -->
  <circle cx="22" cy="74" r="3.5" fill="#801414"/>
  <circle cx="78" cy="74" r="3.5" fill="#801414"/>
  <circle cx="30" cy="66" r="3" fill="#801414"/>
  <circle cx="70" cy="66" r="3" fill="#801414"/>
  <circle cx="40" cy="58" r="3.5" fill="#801414"/>
  <circle cx="60" cy="58" r="3.5" fill="#801414"/>
  <!-- Ornamental Garland Flowers Surrounding Base -->
  <circle cx="24" cy="112" r="3" fill="#801414"/>
  <circle cx="76" cy="112" r="3" fill="#801414"/>
  <circle cx="16" cy="114" r="2.5" fill="#801414"/>
  <circle cx="84" cy="114" r="2.5" fill="#801414"/>
</svg>
`;

export const DeityMuruganIcon: React.FC<{ style?: React.CSSProperties; className?: string }> = ({
  style,
  className,
}) => (
  <div
    className={className}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    dangerouslySetInnerHTML={{ __html: MURUGAN_VEL_SVG_MARKUP }}
  />
);

export const KalpavrikshaTreeIcon: React.FC<{ style?: React.CSSProperties; className?: string }> = ({
  style,
  className,
}) => (
  <div
    className={className}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    dangerouslySetInnerHTML={{ __html: KALPAVRIKSHA_TREE_SVG_MARKUP }}
  />
);
