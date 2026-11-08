import React from 'react';

interface SparkMindaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Official SPARK MINDA Corporate Logo (EXACT MATCH to Reference Image):
 * 
 * 1. Background Structure:
 *    - Left container: Sky Blue rounded capsule (#009ee3) containing the word "SPARK".
 *    - Right container: Pure White rounded box with Sky Blue (#009ee3) text "MINDA".
 *    - The White "MINDA" box has a Sky Blue border (#009ee3) and is enveloped by a thick crisp White border/capsule contour.
 *    - The whole logo is a unified rounded rectangular badge where the left is Blue and the right is White.
 * 
 * 2. Typography & Lettering:
 *    - Left "SPARK":
 *      - 'S', 'P', 'R', 'K' are solid white (#ffffff), bold, crisp sans-serif.
 *      - 'A' consists of two red diagonal legs (#e31b23) meeting at apex without crossbar.
 *      - At the apex of 'A', there is a radiant multi-directional red/coral starburst flare with white luminous core.
 *    - Right "MINDA":
 *      - Solid Sky Blue (#009ee3), bold, condensed/geometric sans-serif sitting inside the clean white box.
 * 
 * 3. Bottom Line & Tagline:
 *    - Solid black line beneath SPARK.
 *    - "POWERED BY PASSION" in bold red on the right beneath MINDA.
 */
export default function SparkMindaLogo({ className, size = 'md' }: SparkMindaLogoProps) {
  const sizeClasses = {
    sm: 'h-6 sm:h-7 w-[105px] sm:w-[125px]',
    md: 'h-7 sm:h-8 w-[130px] sm:w-[155px]',
    lg: 'h-9 sm:h-11 w-[165px] sm:w-[195px]',
    xl: 'h-12 sm:h-14 w-[215px] sm:w-[250px]'
  };

  const containerSizes = {
    sm: 'px-1.5 py-1',
    md: 'px-2 py-1.5',
    lg: 'px-2.5 py-2',
    xl: 'px-3 py-2.5'
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 bg-white rounded-lg shadow-sm border border-slate-200/80 transition-all ${containerSizes[size]} ${className || ''}`}>
      <svg
        viewBox="0 0 960 310"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizeClasses[size]} h-auto object-contain block`}
        aria-label="SPARK MINDA - POWERED BY PASSION"
      >
        <defs>
          {/* Luminous aura behind starburst flare on apex of 'A' */}
          <radialGradient id="sparkAuraRef" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="25%" stopColor="#ffedd5" stopOpacity={0.9} />
            <stop offset="55%" stopColor="#f87171" stopOpacity={0.65} />
            <stop offset="80%" stopColor="#009ee3" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#009ee3" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* ================================================================= */}
        {/* 1. UPPER SECTION: OFFICIAL BADGE AS IN REFERENCE IMAGE            */}
        {/* ================================================================= */}

        {/* 1.1 LEFT BLUE CAPSULE (Cyan-Blue #009ee3) */}
        <rect
          x="10"
          y="10"
          width="940"
          height="216"
          rx="32"
          ry="32"
          fill="#009ee3"
        />

        {/* 1.2 RIGHT WHITE "MINDA" BOX WITH CRISP BLUE OUTLINE & WHITE OUTER WRAP */}
        {/* White outer perimeter separating MINDA from the blue capsule seamlessly */}
        <rect
          x="490"
          y="10"
          width="460"
          height="216"
          rx="32"
          ry="32"
          fill="#ffffff"
        />

        {/* Blue inner outline framing MINDA exactly as in image (1).jpg */}
        <rect
          x="502"
          y="20"
          width="434"
          height="196"
          rx="22"
          ry="22"
          fill="#ffffff"
          stroke="#009ee3"
          strokeWidth="7"
        />

        {/* 1.3 LEFT SECTION: "SPARK" */}
        {/* Letter 'S' */}
        <text
          x="45"
          y="164"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="116"
          letterSpacing="0"
        >
          S
        </text>

        {/* Letter 'P' */}
        <text
          x="128"
          y="164"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="116"
          letterSpacing="0"
        >
          P
        </text>

        {/* STYLIZED 'A' (DUA BATANG DIAGONAL MERAH + RADIANT STARBURST FLARE) */}
        <g id="spark-stylized-a">
          {/* Ambient Glow Halo */}
          <circle cx="236" cy="62" r="46" fill="url(#sparkAuraRef)" />

          {/* 16-Ray Multi-Directional Red/Coral Starburst (Matching reference image) */}
          {/* Cardinal Long Rays */}
          <line x1="236" y1="12" x2="236" y2="116" stroke="#e31b23" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="184" y1="62" x2="288" y2="62" stroke="#e31b23" strokeWidth="2.8" strokeLinecap="round" />
          {/* 45-degree Diagonal Long Rays */}
          <line x1="199" y1="25" x2="273" y2="99" stroke="#e31b23" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="199" y1="99" x2="273" y2="25" stroke="#e31b23" strokeWidth="2.4" strokeLinecap="round" />
          {/* Intermediate Accent Rays */}
          <line x1="216" y1="16" x2="256" y2="108" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" opacity={0.95} />
          <line x1="216" y1="108" x2="256" y2="16" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" opacity={0.95} />
          <line x1="190" y1="42" x2="282" y2="82" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" opacity={0.95} />
          <line x1="190" y1="82" x2="282" y2="42" stroke="#f87171" strokeWidth="1.6" strokeLinecap="round" opacity={0.95} />

          {/* Luminous Center Point */}
          <circle cx="236" cy="62" r="13" fill="#ffffff" opacity={0.65} />
          <circle cx="236" cy="62" r="6" fill="#ffffff" />

          {/* Dua Kaki Diagonal Merah (Bertemu di Puncak, TANPA Crossbar) */}
          <polygon points="236,58 242,65 204,168 184,168" fill="#e31b23" />
          <polygon points="236,58 230,65 268,168 288,168" fill="#e31b23" />
        </g>

        {/* Letter 'R' */}
        <text
          x="300"
          y="164"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="116"
          letterSpacing="0"
        >
          R
        </text>

        {/* Letter 'K' */}
        <text
          x="382"
          y="164"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="116"
          letterSpacing="0"
        >
          K
        </text>

        {/* 1.4 RIGHT SECTION: "MINDA" (WARNA BIRU MUDA #009ee3 DI DALAM KOTAK PUTIH) */}
        <text
          x="719"
          y="164"
          textAnchor="middle"
          fill="#009ee3"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="120"
          letterSpacing="1"
        >
          MINDA
        </text>

        {/* ================================================================= */}
        {/* 2. LOWER SECTION: GARIS HITAM & "POWERED BY PASSION"              */}
        {/* ================================================================= */}

        {/* 2.1 Garis horizontal hitam persis di bawah bagian "SPARK" */}
        <line
          x1="18"
          y1="262"
          x2="455"
          y2="262"
          stroke="#111827"
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* 2.2 Subtitle "POWERED BY PASSION" merah persis di bawah bagian "MINDA" */}
        <text
          x="502"
          y="272"
          fill="#e31b23"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="34"
          letterSpacing="1.5"
        >
          POWERED BY PASSION
        </text>
      </svg>
    </div>
  );
}
