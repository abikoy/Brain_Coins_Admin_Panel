import React from 'react';



// components/ui/Badge.js - Add premium variant

const Badge = ({ variant = 'secondary', children, ...props }) => {

  const variantStyles = {

    primary: 'bg-royal-purple text-white',

    secondary: 'bg-gray-100 text-gray-700',

    success: 'bg-green-100 text-green-700',

    danger: 'bg-red-100 text-red-700',

    warning: 'bg-amber-100 text-amber-700',

    premium: 'bg-amber-100 text-amber-700 border border-amber-300', // Add this

  };



  return (

    <span

      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}

      {...props}

    >

      {children}

    </span>

  );

};





export default Badge;