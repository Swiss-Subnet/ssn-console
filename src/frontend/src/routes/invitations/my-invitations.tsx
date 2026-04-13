import { Container } from '@/components/layout/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/loading-button';
import { useAppStore } from '@/lib/store';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { ArrowLeft } from 'lucide-react';
import { useState, type FC } from 'react';
import { useNavigate } from 'react-router';

const MyInvitations: FC = () => {
  const navigate = useNavigate();
  const { myInvites, acceptOrgInvite, declineOrgInvite } = useAppStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onAccept(inviteId: string): Promise<void> {
    setBusyId(inviteId);
    try {
      await acceptOrgInvite(inviteId);
      showSuccessToast('Invitation accepted');
    } catch (err) {
      showErrorToast('Failed to accept invitation', err);
    } finally {
      setBusyId(null);
    }
  }

  async function onDecline(inviteId: string): Promise<void> {
    setBusyId(inviteId);
    try {
      await declineOrgInvite(inviteId);
      showSuccessToast('Invitation declined');
    } catch (err) {
      showErrorToast('Failed to decline invitation', err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Container>
      <div className="space-y-6">
        <div className="mx-auto max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/', { replace: true })}
          >
            <ArrowLeft className="mr-1 size-3.5" />
            Back
          </Button>
        </div>

        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Your invitations</CardTitle>
          </CardHeader>

          <CardContent>
            {myInvites.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                You have no pending invitations.
              </p>
            ) : (
              <ul className="divide-y">
                {myInvites.map(inv => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{inv.orgName}</p>
                      <p className="text-muted-foreground text-xs">
                        Expires{' '}
                        {new Date(
                          Number(inv.expiresAtNs / 1_000_000n),
                        ).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        isLoading={busyId === inv.id}
                        onClick={() => onDecline(inv.id)}
                      >
                        Decline
                      </LoadingButton>
                      <LoadingButton
                        size="sm"
                        isLoading={busyId === inv.id}
                        onClick={() => onAccept(inv.id)}
                      >
                        Accept
                      </LoadingButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default MyInvitations;
