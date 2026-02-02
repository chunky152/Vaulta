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
      <img
        src="/logo.jpeg"
        alt="Unbur"
        className={cn(sizeClasses[size].img, 'object-contain')}
      />
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
