import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { useState, type FC, type FormEvent } from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon } from 'lucide-react';

export const EmailPrompt: FC = () => {
  const { profile, setEmail: setEmailInStore } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Show registered email if already set
if (profile?.email && !isEditing) {
    return (
      <Card className="mt-8 max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
            <CheckCircleIcon className="size-5" />
            <CardTitle>Email Registered</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            You're signed up with: <span className="font-medium text-foreground">{profile.email}</span>
          </p>
          <button
            onClick={() => { setEmail(profile.email ?? ''); setIsEditing(true); }}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            Edit
          </button>
        </CardContent>
      </Card>
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
      await setEmailInStore(email);
      toast.success('Email registered successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to register email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-8 max-w-md">
      <CardHeader>
        <CardTitle>Welcome! 👋</CardTitle>
        <CardDescription>
          Please register your email to receive updates and notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <LoadingButton type="submit" className="w-full" isLoading={isSubmitting}>
            Register Email
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
};
