import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Fragment, type FC } from 'react';
import { Link } from 'react-router';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export const Breadcrumbs: FC<BreadcrumbsProps> = ({ items, className }) => (
  <nav
    aria-label="Breadcrumb"
    className={cn(
      'text-muted-foreground flex flex-wrap items-center gap-1 text-xs',
      className,
    )}
  >
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <Fragment key={`${index}-${item.label}`}>
          {index > 0 && <ChevronRight className="size-3 shrink-0" />}
          {item.to && !isLast ? (
            <Link
              to={item.to}
              className="hover:text-foreground max-w-[16ch] truncate transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'max-w-[24ch] truncate',
                isLast && 'text-foreground font-medium',
              )}
              aria-current={isLast ? 'page' : undefined}
            >
              {item.label}
            </span>
          )}
        </Fragment>
      );
    })}
  </nav>
);
