import { CAMEL_HEX, isCrazy, type CamelColor } from '@camelup/shared';

const SHADE_HEX: Record<CamelColor, { light: string; mid: string; dark: string; rug: string }> = {
  red: { light: '#ff7a7e', mid: '#e5484d', dark: '#a82429', rug: '#ffd86b' },
  yellow: { light: '#fff078', mid: '#f5cb0a', dark: '#b58900', rug: '#e5484d' },
  blue: { light: '#7dc0ff', mid: '#3e8ef7', dark: '#1d5bbf', rug: '#ffd86b' },
  green: { light: '#66d49a', mid: '#30a46c', dark: '#196b43', rug: '#ffd86b' },
  purple: { light: '#bc85f0', mid: '#8e4ec6', dark: '#59258a', rug: '#ffd86b' },
  black: { light: '#525252', mid: '#2b2b2b', dark: '#111111', rug: '#ff6b6b' },
  white: { light: '#ffffff', mid: '#f2efe9', dark: '#bfb6a8', rug: '#3e8ef7' },
};

export function CamelIcon({
  color,
  flip = false,
  stackIndex,
  stackSize = 1,
}: {
  color: CamelColor;
  flip?: boolean;
  /** 0 = bottom of stack, stackSize - 1 = top of stack */
  stackIndex?: number;
  stackSize?: number;
}) {
  const palette = SHADE_HEX[color] ?? {
    light: CAMEL_HEX[color],
    mid: CAMEL_HEX[color],
    dark: '#222',
    rug: '#ffd86b',
  };
  const gradId = `camel-grad-${color}`;
  const crazy = isCrazy(color);
  const stroke = color === 'black' ? '#090909' : '#3a2312';

  return (
    <svg viewBox="0 0 88 60" className="camel-svg" aria-label={color}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="55%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </linearGradient>
      </defs>

      <g transform={flip ? 'translate(88,0) scale(-1,1)' : undefined}>
        {/* Cute tufted tail */}
        <path
          d="M14,29 Q6,31 5,40"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="5" cy="42" rx="3" ry="4" fill={palette.dark} stroke={stroke} strokeWidth="2" />

        {/* Back legs (slightly darker for depth) */}
        <rect
          x="21"
          y="38"
          width="6.5"
          height="18"
          rx="3.2"
          fill={palette.dark}
          stroke={stroke}
          strokeWidth="2.2"
        />
        <rect
          x="48"
          y="38"
          width="6.5"
          height="18"
          rx="3.2"
          fill={palette.dark}
          stroke={stroke}
          strokeWidth="2.2"
        />

        {/* Single smooth camel silhouette (body + hump + curved neck + snout) */}
        <path
          d="
            M 13,34
            C 12,24 19,20 25,20
            C 28,11 39,10 44,19
            C 48,20 52,22 54,24
            C 57,17 59,10 64,7
            C 66,4 70,4 72,7
            C 79,7 84,11 83,16
            C 82,20 77,21 72,20
            C 69,26 66,35 61,40
            C 58,43 52,44 45,44
            L 22,44
            C 16,44 13,40 13,34
            Z
          "
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Rounded ear */}
        <ellipse
          cx="65"
          cy="7"
          rx="2.6"
          ry="4.2"
          transform="rotate(-22 65 7)"
          fill={palette.mid}
          stroke={stroke}
          strokeWidth="2"
        />

        {/* Decorative saddle blanket */}
        <path
          d="M23,21 Q34,14 46,21 L45,35 Q34,38 24,35 Z"
          fill={palette.rug}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M25,31 L29,34 L34,31 L39,34 L43,31"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Front legs */}
        <rect
          x="16"
          y="39"
          width="7"
          height="18"
          rx="3.4"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="2.3"
        />
        <rect
          x="43"
          y="39"
          width="7"
          height="18"
          rx="3.4"
          fill={`url(#${gradId})`}
          stroke={stroke}
          strokeWidth="2.3"
        />
        {/* Hooves */}
        <path d="M16,54 H23 M43,54 H50" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />

        {/* Bridle & smile */}
        <path
          d="M72,19 Q76,18 79,15"
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="80" cy="12" r="1.1" fill={stroke} />

        {/* Eye (crazy camels get mischievous wild eyes) */}
        <circle cx="72.5" cy="11.5" r="3.1" fill="#fff" stroke={stroke} strokeWidth="1.5" />
        <circle cx={crazy ? '72' : '73.3'} cy="11.5" r={crazy ? '1.3' : '1.7'} fill="#111" />
        <circle cx="73.8" cy="10.7" r="0.7" fill="#fff" />
        {crazy && (
          <path d="M69,8 L76,10" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        )}
      </g>

      {/* Stack order badge on saddle when 2+ camels share a space */}
      {stackSize > 1 && stackIndex !== undefined && (
        <g transform="translate(34, 27)">
          <circle
            r="7.8"
            fill="rgba(255,252,240,0.96)"
            stroke="#3a2312"
            strokeWidth="1.8"
          />
          <text
            y="3.3"
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="800"
            fill="#3a2312"
          >
            {stackIndex + 1}
          </text>
        </g>
      )}
    </svg>
  );
}
