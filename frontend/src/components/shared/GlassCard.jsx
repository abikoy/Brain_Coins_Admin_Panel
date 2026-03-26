import React from 'react';

const GlassCard = ({ children, className = '', hover = false }) => {
  return (
    <div
      className={`glass-card rounded-xl p-6 ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
