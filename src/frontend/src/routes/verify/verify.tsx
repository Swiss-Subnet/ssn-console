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
function verifyErrorMessage(err: unknown): string {
  if (!(err instanceof ApiCallError)) {
    return 'Failed to verify email, please try again.';
  }
  const reason = err.reason;
  if (reason) {
    if ('Expired' in reason) {
      return 'This verification link has expired. Request a new one and open it within 15 minutes.';
    }
    if ('EmailMismatch' in reason) {
      return 'This link verifies a different email than the one on your account. Sign in with the right account, or request a new link.';
    }
    if ('Invalid' in reason) {
      return 'This verification link is not valid. Please request a new one.';
    }
  }
  return err.apiMessage || 'Failed to verify email, please try again.';
}

const Verify: FC = () => {
  const navigate = useNavigate();
  const {
    userProfileApi,
    setEmailVerified,
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
      setError('Missing verification token');
      setIsLoading(false);
      return;
    }
    // verify_email is keyed on the caller's principal, so an anonymous
    // session is rejected by the canister. Gate on auth before calling.
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
        await userProfileApi.verifyMyEmail(token);
        setIsSuccess(true);
        setEmailVerified();
      } catch (err) {
        console.error(err);
        setError(verifyErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token, userProfileApi, isAuthInitialized, isAuthenticated]);

  return (
    <Container>
      <div className="text-center">
        <H1>Email Verification</H1>
        {isLoading && (
          <p className="text-muted-foreground mt-2">
            Verifying your email, this may take a moment.
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
                <AlertTitle>Sign in to verify</AlertTitle>
                <AlertDescription>
                  Sign in with Internet Identity to finish verifying your email.
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
