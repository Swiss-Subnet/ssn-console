import { LoadingButton } from '@/components/loading-button';
import { H1 } from '@/components/typography/h1';
import { TermsAndConditionsResponseType } from '@/lib/api-models';
import { isNil } from '@/lib/nil';
import { useAppStore } from '@/lib/store';
import { showErrorToast } from '@/lib/toast';
import { useState, type FC } from 'react';
import { useNavigate } from 'react-router';

const TermsAndConditions: FC = () => {
  const navigate = useNavigate();
  const { termsAndConditions, upsertTermsAndConditionsResponse } =
    useAppStore();

  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  async function onDeclineTermsAndConditions(): Promise<void> {
    if (isNil(termsAndConditions)) {
      throw new Error('Cannot decline terms and conditions when none exist');
    }

    setIsDeclining(true);
    try {
      await upsertTermsAndConditionsResponse({
        termsAndConditionsId: termsAndConditions.id,
        responseType: TermsAndConditionsResponseType.Rejected,
      });
    } catch (err) {
      showErrorToast('Failed to decline terms and conditions', err);
    } finally {
      navigate('/');
      setIsDeclining(false);
    }
  }

  async function onAcceptTermsAndConditions(): Promise<void> {
    if (isNil(termsAndConditions)) {
      throw new Error('Cannot accept terms and conditions when none exist');
    }

    setIsAccepting(true);
    try {
      await upsertTermsAndConditionsResponse({
        termsAndConditionsId: termsAndConditions.id,
        responseType: TermsAndConditionsResponseType.Accepted,
      });
      navigate('/canisters');
    } catch (err) {
      showErrorToast('Failed to accept terms and conditions', err);
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <>
      <H1>Terms and Conditions</H1>

      <div className="mt-10">
        <p>
          Please read the terms and conditions carefully before accepting them.
        </p>

        <p className="mt-3">
          <span className="mr-2 font-bold">Effective from:</span>
          {termsAndConditions?.createdAt?.toLocaleDateString()}
        </p>

        <p className="mt-3 flex flex-row items-center">
          <span className="mr-2 font-bold">Comment:</span>
          {termsAndConditions?.comment}
        </p>
      </div>

      <div
        className="prose dark:prose-invert mt-10 min-w-full"
        dangerouslySetInnerHTML={{ __html: termsAndConditions?.content ?? '' }}
      />

      <div className="mb-10 flex flex-row justify-end space-x-2">
        <LoadingButton
          type="button"
          variant="ghost"
          size="lg"
          disabled={isAccepting || isDeclining}
          isLoading={isDeclining}
          onClick={() => onDeclineTermsAndConditions()}
        >
          Decline
        </LoadingButton>

        <LoadingButton
          type="button"
          size="lg"
          disabled={isAccepting || isDeclining}
          isLoading={isAccepting}
          onClick={() => onAcceptTermsAndConditions()}
        >
          Accept
        </LoadingButton>
      </div>
    </>
  );
};

export default TermsAndConditions;
