import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkTo?: string | null;
}

const sizeClasses = {
  sm: { img: 'h-6 w-auto', text: 'text-lg' },
  md: { img: 'h-8 w-auto', text: 'text-xl' },
  lg: { img: 'h-10 w-auto', text: 'text-2xl' },
};

export function Logo({
  size = 'md',
  showText = true,
  className,
  linkTo = '/',
}: LogoProps) {
  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width="200"
        height="250"
        viewBox="0 0 200 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(sizeClasses[size].img, 'object-contain')}
      >
        <rect width="200" height="250" fill="black" />
        <path
          d="M60 70V120C60 142.091 77.9086 160 100 160C122.091 160 140 142.091 140 120V70H155V120C155 150.376 130.376 175 100 175C69.6243 175 45 150.376 45 120V70H60Z"
          fill="white"
        />
        <circle cx="100" cy="115" r="22" fill="white" />
        <text x="100" y="220" fill="white" font-family="Arial, sans-serif" font-size="32" text-anchor="middle" font-weight="400">Unbur</text>
      </svg>
      {showText && (
        <span className={cn('font-bold', sizeClasses[size].text)}>Unbur</span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
