import React from "react";

// Minimalist representation of the ESA shield (heraldic / inspired)
export default function EsaShield() {
  return (
    <svg
      width="110"
      height="130"
      viewBox="0 0 110 130"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Brasão da Escola de Sargentos das Armas"
      role="img"
    >
      {/* Outer gold border */}
      <path
        d="M55 4 L100 18 V70 C100 95 78 116 55 126 C32 116 10 95 10 70 V18 Z"
        fill="#e8b53d"
        stroke="#9a6f12"
        strokeWidth="2"
      />
      {/* Inner shield body */}
      <path
        d="M55 12 L93 23 V69 C93 91 75 109 55 117 C35 109 17 91 17 69 V23 Z"
        fill="#1d6b3a"
        stroke="#0d3a1e"
        strokeWidth="1.5"
      />
      {/* Top red banner with ESA */}
      <rect x="22" y="22" width="66" height="14" fill="#b51b25" />
      <text
        x="55"
        y="33"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#ffffff"
        fontFamily="Arial, sans-serif"
        letterSpacing="2"
      >
        ESA
      </text>
      {/* Central golden cross/star */}
      <g transform="translate(55,72)">
        <circle r="20" fill="#0d3a1e" />
        <path
          d="M0,-18 L4,-4 L18,0 L4,4 L0,18 L-4,4 L-18,0 L-4,-4 Z"
          fill="#e8b53d"
          stroke="#9a6f12"
          strokeWidth="1"
        />
        <circle r="4" fill="#b51b25" />
      </g>
      {/* Crossed swords hint */}
      <line x1="30" y1="95" x2="80" y2="55" stroke="#cccccc" strokeWidth="2" />
      <line x1="80" y1="95" x2="30" y2="55" stroke="#cccccc" strokeWidth="2" />
    </svg>
  );
}
