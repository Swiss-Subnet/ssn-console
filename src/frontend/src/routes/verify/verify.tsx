import { Container } from '@/components/layout/container';
import { H1 } from '@/components/typography/h1';
import {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertAction,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, AlertCircleIcon } from 'lucide-react';
import LoadingSpinner from '@/components/loading-spinner';
import { useAppStore } from '@/lib/store';
import { useEffect, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

const Verify: FC = () => {
  const navigate = useNavigate();
  const { userProfileApi, setEmailVerified } = useAppStore();
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing verification token');
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        await userProfileApi.verifyMyEmail(token);
        setIsSuccess(true);
        setEmailVerified();
      } catch (err) {
        console.error(err);
        setError('Failed to verify email, please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [searchParams, userProfileApi]);

  return (
    <Container>
      <div className="text-center">
        <H1>Email Verification</H1>
        <p className="text-muted-foreground mt-2">
          Verifying your email — this may take a moment.
        </p>
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading && isSuccess && (
          <div className="mx-auto max-w-md">
            <Alert>
              <CheckCircleIcon />
              <AlertTitle>Verification Successful</AlertTitle>
              <AlertDescription>
                Your email address has been verified.
              </AlertDescription>
              <AlertAction>
                <Button variant="link" size="lg" onClick={() => navigate('/')}>
                  Return Home
                </Button>
              </AlertAction>
            </Alert>
          </div>
        )}

        {!isLoading && error && (
          <div className="mx-auto max-w-md">
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <AlertAction>
                <Button variant="link" size="lg" onClick={() => navigate('/')}>
                  Return Home
                </Button>
              </AlertAction>
            </Alert>
          </div>
        )}
      </div>
    </Container>
  );
};

export default Verify;
