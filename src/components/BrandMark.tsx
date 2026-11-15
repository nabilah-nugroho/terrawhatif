import React from 'react';

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 24, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 ${className}`}
  >
    {/* Outer orbital tilt ellipse */}
    <ellipse
      cx="16"
      cy="16"
      rx="13.5"
      ry="5.5"
      transform="rotate(-24 16 16)"
      stroke="#38bdf8"
      strokeOpacity="0.65"
      strokeWidth="1.4"
    />
    {/* Planetary core horizon */}
    <circle
      cx="16"
      cy="16"
      r="7.2"
      fill="#0b1322"
      stroke="#e2e8f0"
      strokeOpacity="0.85"
      strokeWidth="1.35"
    />
    {/* Calibrated atmospheric arc */}
    <path
      d="M10.4 13.5A6.2 6.2 0 0 1 21.6 13.5"
      stroke="#7dd3fc"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    {/* Meridian horizon line */}
    <path
      d="M9.6 17.5H22.4"
      stroke="#38bdf8"
      strokeOpacity="0.5"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
    {/* Orbiting solar/sentinel node */}
    <circle cx="26.2" cy="11.3" r="2.1" fill="#fbbf24" />
  </svg>
);
