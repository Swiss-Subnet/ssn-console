import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon } from 'lucide-react';

export const EmailPrompt: FC = () => {
  const { isAuthenticated, profile, userProfileApi, initializeUserProfile } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Don't show anything if not logged in
  if (!isAuthenticated || !userProfileApi) {
    return null;
  }

  // Show registered email if already set
  if (profile?.email) {
    return (
      <div className="mt-8 max-w-md">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500 mb-2">
            <CheckCircleIcon className="size-5" />
            <h2 className="text-lg font-semibold">Email Registered</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            You're signed up with: <span className="font-medium text-foreground">{profile.email}</span>
          </p>
        </div>
      </div>
    );
  }

  // Show form if no email set
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      await userProfileApi.updateMyUserProfile({ email });
      await initializeUserProfile();
      toast.success('Email registered successfully!');
    } catch (error) {
      toast.error('Failed to register email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8 max-w-md">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-2">Welcome! 👋</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Please register your email to receive updates and notifications.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Register Email'}
          </Button>
        </form>
      </div>
    </div>
  );
};
