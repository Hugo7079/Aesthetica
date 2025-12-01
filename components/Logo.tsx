import React from 'react';

interface Props {
  className?: string;
  size?: number;
}

const Logo: React.FC<Props> = ({ className = "", size = 40 }) => {
  const src = `${import.meta.env.BASE_URL}icons/icon-192.png`;
  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-full bg-[#111] ${className}`} style={{ width: size, height: size }}>
      <img 
        src={src} 
        alt="Aesthetica logo" 
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

export default Logo;
