import React from 'react';

const GlassCard = ({ children, className = '', hover = false }) => {
  return (
    <div
      className={`glass-card rounded-xl p-6 transition-all duration-300 ${
        hover ? 'hover:shadow-2xl hover:scale-[1.02]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
