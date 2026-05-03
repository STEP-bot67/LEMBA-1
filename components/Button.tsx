import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-fredoka font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-amber-400 text-amber-950 border-b-4 border-amber-600 hover:bg-amber-300",
    secondary: "bg-indigo-500 text-white border-b-4 border-indigo-700 hover:bg-indigo-400",
    success: "bg-green-500 text-white border-b-4 border-green-700 hover:bg-green-400",
    outline: "bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 border-b-4"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
    xl: "px-10 py-5 text-2xl"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
};