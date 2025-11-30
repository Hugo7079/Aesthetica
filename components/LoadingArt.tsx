import React from 'react';

const LoadingArt: React.FC<{ message?: string }> = ({ message = "生成美感素材中..." }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 w-full text-aesthetic-gold">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-aesthetic-gold/20 rounded-full animate-ping"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-t-aesthetic-gold border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
      </div>
      <p className="font-serif text-lg animate-pulse tracking-widest">{message}</p>
    </div>
  );
};

export default LoadingArt;