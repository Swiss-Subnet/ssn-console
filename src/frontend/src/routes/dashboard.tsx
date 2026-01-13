import { H1 } from '@/components/typography/h1';
import { Button } from '@/components/ui/button';
import { useRequireAuth } from '@/lib/auth';
import { useAppStore } from '@/lib/store';
import { useState, type FC, type FormEvent } from 'react';
import { Toaster, toast } from 'sonner';

const Dashboard: FC = () => {
  useRequireAuth();
  const { identity, profile } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success('Email registered successfully!', {
        description: `We'll send updates to ${email}`,
      });
      setEmail('');
    } catch (error) {
      toast.error('Failed to register email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <H1>Dashboard</H1>

      <div className="mt-8 max-w-md">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Register your email to receive the latest updates.
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
              {isSubmitting ? 'Registering...' : 'Register Email'}
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <div>ID: {profile?.id}</div>
        <div>Principal: {identity?.getPrincipal().toText()}</div>
      </div>
    </>
  );
};

export default Dashboard;
