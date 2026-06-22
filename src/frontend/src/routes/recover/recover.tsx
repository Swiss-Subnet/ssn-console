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
import { ApiCallError } from '@/lib/api-models/error';
import { useEffect, useState, type FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

// Branch on the typed RejectionReason (the generated union), not the message.
// The canister's own message is the fallback -- it is already user-facing.
function recoverErrorMessage(err: unknown): string {
  if (!(err instanceof ApiCallError)) {
    return 'Failed to recover account, please try again.';
  }
  const reason = err.reason;
  if (reason) {
    if ('Expired' in reason) {
      return 'This recovery link has expired. Request a new one and open it within 15 minutes.';
    }
    if ('NoVerifiedAccount' in reason) {
      return 'No account with a verified email matches this link. Verify your email first, or request a new link.';
    }
    if ('Invalid' in reason) {
      return 'This recovery link is not valid. Please request a new one.';
    }
  }
  return err.apiMessage || 'Failed to recover account, please try again.';
}

const Recover: FC = () => {
  const navigate = useNavigate();
  const {
    recoverAccountByEmail,
    initializeData,
    isAuthInitialized,
    isAuthenticated,
    isLoggingIn,
    login,
  } = useAppStore();
  const [searchParams] = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Missing recovery token');
      setIsLoading(false);
      return;
    }
    // recover_account_by_email links the caller's principal to the recovered
    // account, so it must run as the new Internet Identity. Gate on auth.
    if (!isAuthInitialized) {
      return;
    }
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        await recoverAccountByEmail(token);
        // The new principal now resolves to the recovered account; reload all
        // account-scoped data, not just the profile.
        await initializeData();
        setIsSuccess(true);
      } catch (err) {
        console.error(err);
        setError(recoverErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [
    token,
    recoverAccountByEmail,
    initializeData,
    isAuthInitialized,
    isAuthenticated,
  ]);

  return (
    <Container>
      <div className="text-center">
        <H1>Account Recovery</H1>
        {isLoading && (
          <p className="text-muted-foreground mt-2">
            Recovering your account, this may take a moment.
          </p>
        )}
      </div>

      <div className="mt-8">
        {isLoading && (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}

        {!isLoading &&
          !isSuccess &&
          !error &&
          token &&
          isAuthInitialized &&
          !isAuthenticated && (
            <div className="mx-auto max-w-md">
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>Sign in to recover</AlertTitle>
                <AlertDescription>
                  Sign in with the Internet Identity you want to link to your
                  account to finish recovery.
                </AlertDescription>
                <AlertAction>
                  <Button
                    variant="link"
                    size="lg"
                    disabled={isLoggingIn}
                    onClick={() => login().catch(console.error)}
                  >
                    {isLoggingIn ? 'Signing in…' : 'Sign in'}
                  </Button>
                </AlertAction>
              </Alert>
            </div>
          )}

        {!isLoading && isSuccess && (
          <div className="mx-auto max-w-md">
            <Alert>
              <CheckCircleIcon />
              <AlertTitle>Recovery Successful</AlertTitle>
              <AlertDescription>
                This Internet Identity is now linked to your account.
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
              <AlertTitle>Recovery Failed</AlertTitle>
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

export default Recover;
