import React, { createContext, useContext, useState } from 'react';

// Tabs Context
const TabsContext = createContext();

// Main Tabs component
export const Tabs = ({ 
  value, 
  onValueChange, 
  defaultValue, 
  className = '', 
  children 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '0');
  
  const currentValue = value !== undefined ? value : internalValue;
  const handleValueChange = value !== undefined ? onValueChange : setInternalValue;

  return (
    <TabsContext.Provider value={{ 
      value: currentValue, 
      onValueChange: handleValueChange 
    }}>
      <div className={`tabs ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

// TabsList component
export const TabsList = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`flex space-x-1 rounded-lg bg-gray-100 p-1 ${className}`}>
      {children}
    </div>
  );
};

// TabsTrigger component
export const TabsTrigger = ({ 
  value, 
  className = '', 
  title = '',
  children,
  ...props 
}) => {
  const { value: currentValue, onValueChange } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      title={title}
      className={`
        flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
        ${isActive 
          ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// TabsContent component
export const TabsContent = ({ 
  value, 
  className = '', 
  children 
}) => {
  const { value: currentValue } = useContext(TabsContext);
  const isActive = currentValue === value;

  if (!isActive) return null;

  return (
    <div className={`mt-4 ${className}`}>
      {children}
    </div>
  );
};

export default Tabs;