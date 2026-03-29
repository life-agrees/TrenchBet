import React from 'react';

export const TrenchyBetLogo = ({ className = "w-12 h-12" }) => (
  <svg 
    className={className} 
    viewBox="0 0 320 205" 
    xmlns="http://www.w3.org/2000/svg"
    aria-label="TrenchyBet Logo"
    role="img"
  >
    <defs>
      <marker id="arrowHead" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M 1 1.5 L 10.5 6 L 1 10.5 Z" fill="#CDFF00" stroke="none"/>
      </marker>
    </defs>
    <rect x="8" y="18" width="116" height="23" fill="#edf0e0" rx="3"/>
    <rect x="53" y="41" width="26" height="150" fill="#edf0e0" rx="2"/>
    <path d="M 145 18 L 145 191 L 169 191 C 292 191 292 100 169 100 C 285 100 285 18 169 18 Z" fill="#edf0e0"/>
    <polyline
      points="5,200 32,180 49,187 66,112 86,118 112,150 140,146 163,78 194,87 230,50 260,25 290,8"
      stroke="#CDFF00" 
      strokeWidth="8" 
      fill="none"
      strokeLinecap="round" 
      strokeLinejoin="round"
      markerEnd="url(#arrowHead)"
    />
  </svg>
);
