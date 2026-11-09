import React from 'react';

/** 3D-styled Egyptian dice pyramid with brick lines, golden cap, and dice chute. */
export function PyramidSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 120" className={className} aria-label="Kim tự tháp xúc xắc">
      <defs>
        <linearGradient id="pyrLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbd376" />
          <stop offset="100%" stopColor="#df9f34" />
        </linearGradient>
        <linearGradient id="pyrRight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d99429" />
          <stop offset="100%" stopColor="#9f6314" />
        </linearGradient>
        <linearGradient id="pyrCap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4b8" />
          <stop offset="100%" stopColor="#f5b82e" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="72" cy="106" rx="60" ry="10" fill="rgba(91,58,30,0.22)" />

      {/* Left sunlit face */}
      <polygon
        points="70,12 12,96 74,106"
        fill="url(#pyrLeft)"
        stroke="#6b4214"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Right shaded face */}
      <polygon
        points="70,12 74,106 128,92"
        fill="url(#pyrRight)"
        stroke="#6b4214"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Golden capstone */}
      <polygon
        points="70,12 54,36 72,40 86,34"
        fill="url(#pyrCap)"
        stroke="#6b4214"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Brick lines */}
      <g stroke="#7a4c18" strokeWidth="1.5" opacity="0.55" fill="none">
        <line x1="42" y1="53" x2="73" y2="59" />
        <line x1="73" y1="59" x2="101" y2="52" />
        <line x1="29" y1="72" x2="73" y2="80" />
        <line x1="73" y1="80" x2="114" y2="70" />
        <line x1="55" y1="56" x2="51" y2="75" />
        <line x1="44" y1="74" x2="40" y2="95" />
        <line x1="90" y1="55" x2="94" y2="74" />
      </g>

      {/* Dice exit gate at bottom front */}
      <path
        d="M55,103 L59,84 L71,86 L69,105 Z"
        fill="#3c220a"
        stroke="#6b4214"
        strokeWidth="2"
      />
      {/* Sparkle on apex */}
      <circle cx="66" cy="22" r="2.2" fill="#fff" opacity="0.9" />
    </svg>
  );
}

/** Lush desert palm tree with coconuts. */
export function PalmTreeSvg({ className = '', flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 80 90" className={className} aria-hidden="true">
      <g transform={flip ? 'translate(80,0) scale(-1,1)' : undefined}>
        <ellipse cx="42" cy="83" rx="20" ry="5" fill="rgba(91,58,30,0.18)" />
        {/* Curved trunk */}
        <path
          d="M36,83 Q34,56 44,30 L51,32 Q43,56 45,83 Z"
          fill="#a96830"
          stroke="#5b3514"
          strokeWidth="2"
        />
        <path d="M36,68 Q41,66 45,68 M37,54 Q42,52 46,54 M40,41 Q45,39 48,41" stroke="#6c3f18" strokeWidth="1.6" fill="none" />
        {/* Fronds */}
        <g fill="#2f9e5b" stroke="#1b5e34" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M47,30 Q22,16 8,30 Q25,28 47,30 Z" />
          <path d="M47,30 Q18,28 10,46 Q28,39 47,30 Z" />
          <path d="M47,30 Q36,8 22,12 Q36,20 47,30 Z" />
          <path d="M47,30 Q62,8 74,18 Q60,22 47,30 Z" />
          <path d="M47,30 Q72,22 76,38 Q62,33 47,30 Z" />
          <path d="M47,30 Q64,34 64,50 Q55,39 47,30 Z" />
        </g>
        {/* Coconuts */}
        <circle cx="44" cy="33" r="3.6" fill="#6b3e17" />
        <circle cx="50" cy="34" r="3.4" fill="#593211" />
        <circle cx="47" cy="37" r="3.4" fill="#7a481c" />
      </g>
    </svg>
  );
}

/** Oasis water pool with reeds and stones. */
export function OasisPondSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 65" className={className} aria-hidden="true">
      {/* Grass rim */}
      <ellipse cx="60" cy="38" rx="54" ry="22" fill="#55b86c" stroke="#2d7a43" strokeWidth="2" />
      {/* Water */}
      <ellipse cx="60" cy="39" rx="44" ry="16" fill="#46b8e6" stroke="#2484ad" strokeWidth="1.8" />
      {/* Water shimmer */}
      <ellipse cx="50" cy="35" rx="22" ry="6" fill="#89dcfa" opacity="0.65" />
      <path d="M42,42 Q58,45 76,41" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.75" />
      {/* Rocks */}
      <ellipse cx="20" cy="46" rx="7" ry="4.5" fill="#b89b72" stroke="#6e5839" strokeWidth="1.5" />
      <ellipse cx="28" cy="49" rx="4.5" ry="3" fill="#cdb28a" stroke="#6e5839" strokeWidth="1.3" />
      <ellipse cx="98" cy="30" rx="6" ry="4" fill="#b89b72" stroke="#6e5839" strokeWidth="1.5" />
    </svg>
  );
}

/** Striped bazaar / betting booth tent with awning and counter. */
export function BettingTentSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 85" className={className} aria-hidden="true">
      <ellipse cx="55" cy="78" rx="48" ry="6" fill="rgba(91,58,30,0.2)" />
      {/* Back interior */}
      <rect x="20" y="38" width="70" height="38" rx="3" fill="#5a3315" stroke="#42240d" strokeWidth="2" />
      {/* Counter */}
      <rect x="16" y="56" width="78" height="20" rx="4" fill="#d99b4e" stroke="#6b3e17" strokeWidth="2" />
      <line x1="18" y1="64" x2="92" y2="64" stroke="#996425" strokeWidth="1.6" />
      {/* Ticket cards on counter */}
      <rect x="28" y="49" width="10" height="9" rx="1.5" fill="#e5484d" stroke="#3b2210" strokeWidth="1.3" />
      <rect x="42" y="49" width="10" height="9" rx="1.5" fill="#f5d90a" stroke="#3b2210" strokeWidth="1.3" />
      <rect x="56" y="49" width="10" height="9" rx="1.5" fill="#3e8ef7" stroke="#3b2210" strokeWidth="1.3" />
      <circle cx="76" cy="54" r="4" fill="#fbbf24" stroke="#78440a" strokeWidth="1.3" />

      {/* Tent roof */}
      <polygon
        points="55,10 10,38 100,38"
        fill="#e5484d"
        stroke="#6b2023"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <polygon points="55,10 32,38 48,38" fill="#fff5df" />
      <polygon points="55,10 62,38 78,38" fill="#fff5df" />

      {/* Scalloped awning */}
      <g stroke="#6b2023" strokeWidth="1.6">
        <path d="M10,38 L25,38 L25,44 Q17.5,49 10,44 Z" fill="#e5484d" />
        <path d="M25,38 L40,38 L40,44 Q32.5,49 25,44 Z" fill="#fff5df" />
        <path d="M40,38 L55,38 L55,44 Q47.5,49 40,44 Z" fill="#e5484d" />
        <path d="M55,38 L70,38 L70,44 Q62.5,49 55,44 Z" fill="#fff5df" />
        <path d="M70,38 L85,38 L85,44 Q77.5,49 70,44 Z" fill="#e5484d" />
        <path d="M85,38 L100,38 L100,44 Q92.5,49 85,44 Z" fill="#fff5df" />
      </g>

      {/* Top pennant flag */}
      <line x1="55" y1="2" x2="55" y2="12" stroke="#5b3514" strokeWidth="2" />
      <polygon points="55,2 72,6 55,10" fill="#f5b82e" stroke="#6b4214" strokeWidth="1.2" />
    </svg>
  );
}

/** Desert saguaro cactus with small rocks. */
export function CactusSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={className} aria-hidden="true">
      <ellipse cx="30" cy="64" rx="18" ry="4" fill="rgba(91,58,30,0.18)" />
      <path
        d="M25,63 L25,18 Q25,11 30,11 Q35,11 35,18 L35,63 Z"
        fill="#399e5a"
        stroke="#1d5930"
        strokeWidth="2"
      />
      <path
        d="M25,42 L15,42 Q10,42 10,36 L10,25 Q10,21 14,21 Q18,21 18,25 L18,34 L25,34"
        fill="#399e5a"
        stroke="#1d5930"
        strokeWidth="2"
      />
      <path
        d="M35,36 L45,36 Q50,36 50,30 L50,21 Q50,17 46,17 Q42,17 42,21 L42,28 L35,28"
        fill="#399e5a"
        stroke="#1d5930"
        strokeWidth="2"
      />
      {/* Cactus flower */}
      <circle cx="30" cy="10" r="3.2" fill="#f76b8a" stroke="#9e2a45" strokeWidth="1.2" />
    </svg>
  );
}

/** Checkered finish arch on space 1. */
export function FinishArchSvg({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 36" className={className} aria-hidden="true">
      <rect x="6" y="8" width="5" height="26" rx="1.5" fill="#8c5320" stroke="#4a2a0d" strokeWidth="1.4" />
      <rect x="49" y="8" width="5" height="26" rx="1.5" fill="#8c5320" stroke="#4a2a0d" strokeWidth="1.4" />
      <rect x="4" y="3" width="52" height="10" rx="2" fill="#fff" stroke="#3b2210" strokeWidth="1.5" />
      {/* Checkered squares */}
      <g fill="#222">
        <rect x="6" y="4" width="6" height="4" />
        <rect x="18" y="4" width="6" height="4" />
        <rect x="30" y="4" width="6" height="4" />
        <rect x="42" y="4" width="6" height="4" />
        <rect x="12" y="8" width="6" height="4" />
        <rect x="24" y="8" width="6" height="4" />
        <rect x="36" y="8" width="6" height="4" />
        <rect x="48" y="8" width="6" height="4" />
      </g>
    </svg>
  );
}
