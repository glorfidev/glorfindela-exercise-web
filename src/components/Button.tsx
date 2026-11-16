import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
};

const variants = {
  primary: 'bg-mint-300 text-ink shadow-card hover:bg-mint-400',
  secondary: 'bg-white text-ink shadow-card hover:bg-mint-50',
  ghost: 'bg-transparent text-muted hover:bg-white/70 hover:text-ink',
};

export default function Button({ children, className = '', icon, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={`focus-ring inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
