import React from 'react';



const Button = React.forwardRef(({ 

  className = '', 

  variant = 'default', 

  size = 'default', 

  children, 

  ...props 

}, ref) => {

  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  

  const variants = {

    default: "bg-[rgb(147,51,234)] text-white hover:bg-[rgb(120,41,187)]",

    outline: "border-2 border-royal-purple text-royal-purple hover:bg-royal-purple hover:text-white",

    ghost: "hover:bg-gray-100 text-[rgb(147,51,234)]",

    secondary: "bg-electric-cyan text-white hover:opacity-90",

  };

  

  const sizes = {

    default: "h-10 px-4 py-2",

    sm: "h-9 rounded-md px-3",

    lg: "h-11 rounded-md px-8",

    icon: "h-10 w-10",

  };



  return (

    <button

      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}

      ref={ref}

      {...props}

    >

      {children}

    </button>

  );

});



Button.displayName = "Button";



export default Button;

