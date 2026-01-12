import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';

export const Header: React.FC = () => (
  <header className="flex w-full flex-row items-center p-3">
    <a href="#">
      <Logo className="h-13" />
    </a>

    <div className="flex-1" />

    <ModeToggle />
  </header>
);
