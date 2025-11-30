import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

const Logo: React.FC<Props> = ({ className = "", size = 40 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" stroke="#d4af37" strokeWidth="2" strokeOpacity="0.5" />
        
        {/* The Eye Shape */}
        <path d="M50 25C75 25 90 50 90 50C90 50 75 75 50 75C25 75 10 50 10 50C10 50 25 25 50 25Z" stroke="#d4af37" strokeWidth="3" fill="none"/>
        
        {/* Iris / Golden Ratio Spiral Hint */}
        <circle cx="50" cy="50" r="12" fill="#d4af37" />
        <path d="M50 38C56.6274 38 62 43.3726 62 50" stroke="#d4af37" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </div>
  );
};

export default Logo;