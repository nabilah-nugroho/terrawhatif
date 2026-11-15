import React from 'react';

export type TerraMood = 'temperate' | 'frozen' | 'hot';

interface TerraAvatarProps {
  size?: number;
  mood?: TerraMood;
  className?: string;
}

export const TerraAvatar: React.FC<TerraAvatarProps> = ({
  size = 52,
  mood = 'temperate',
  className = '',
}) => {
  const palette =
    mood === 'frozen'
      ? {
          ring: '#67e8f9',
          core: '#a5f3fc',
          glow: 'rgba(103, 232, 249, 0.25)',
          eye: '#083344',
        }
      : mood === 'hot'
        ? {
            ring: '#fbbf24',
            core: '#fcd34d',
            glow: 'rgba(251, 191, 36, 0.28)',
            eye: '#451a03',
          }
        : {
            ring: '#2dd4bf',
            core: '#5eead4',
            glow: 'rgba(45, 212, 191, 0.24)',
            eye: '#042f2e',
          };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`TERRA companion orb (${mood})`}
      className={`${mood === 'frozen' ? 'animate-[wiggle_0.45s_ease-in-out_infinite]' : ''} ${className}`}
    >
      {/* Ambient soft aura */}
      <circle cx="32" cy="32" r="29" fill={palette.glow} />

      {/* Outer scanner gimbal ring */}
      <circle
        cx="32"
        cy="32"
        r="26"
        stroke={palette.ring}
        strokeOpacity="0.45"
        strokeWidth="1.2"
        strokeDasharray={mood === 'hot' ? '3 3' : '6 4'}
      />

      {/* Tilted orbital ring */}
      <ellipse
        cx="32"
        cy="32"
        rx="24"
        ry="9.5"
        transform="rotate(-20 32 32)"
        stroke={palette.ring}
        strokeOpacity="0.8"
        strokeWidth="1.4"
      />

      {/* Main orb body */}
      <circle
        cx="32"
        cy="32"
        r="16"
        fill="#0b1322"
        stroke={palette.ring}
        strokeWidth="1.8"
      />

      {/* Inner glowing faceplate */}
      <circle cx="32" cy="32" r="12.5" fill={palette.core} fillOpacity="0.92" />

      {/* Expressive eyes & mouth */}
      {mood === 'temperate' && (
        <g stroke={palette.eye} strokeWidth="2" strokeLinecap="round" fill="none">
          {/* Happy curved eyes */}
          <path d="M25.5 30.5c1-1.8 2.6-1.8 3.6 0" />
          <path d="M34.9 30.5c1-1.8 2.6-1.8 3.6 0" />
          {/* Gentle smile */}
          <path d="M28.5 35.5c1.8 2 5.2 2 7 0" />
        </g>
      )}

      {mood === 'frozen' && (
        <g>
          {/* Shivering squeezed eyes */}
          <path
            d="M25 29.5l3.5 1.5-3.5 1.5M39 29.5l-3.5 1.5 3.5 1.5"
            stroke={palette.eye}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Chattering wavy mouth */}
          <path
            d="M27.5 36.2l1.8-1 1.8 1 1.8-1 1.8 1 1.8-1"
            stroke={palette.eye}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Frost sparkles */}
          <path
            d="M13 18h4M15 16v4M49 16h4M51 14v4M50 47h3M51.5 45.5v3"
            stroke="#e0f2fe"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      )}

      {mood === 'hot' && (
        <g>
          {/* Alarmed wide eyes */}
          <circle cx="27.2" cy="30.2" r="2.1" fill={palette.eye} />
          <circle cx="36.8" cy="30.2" r="2.1" fill={palette.eye} />
          <circle cx="26.6" cy="29.6" r="0.7" fill="#fff" />
          <circle cx="36.2" cy="29.6" r="0.7" fill="#fff" />
          {/* Worried O-mouth */}
          <ellipse cx="32" cy="36.2" rx="2.6" ry="2.2" fill={palette.eye} />
          {/* Heat wave ticks */}
          <path
            d="M26 11c1.2-1.5 0-3 1.2-4.5M32 10c1.2-1.5 0-3 1.2-4.5M38 11c1.2-1.5 0-3 1.2-4.5"
            stroke="#fb923c"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Orbiting beacon */}
      <circle cx="53" cy="24" r="2.4" fill="#f8fafc" />
    </svg>
  );
};
