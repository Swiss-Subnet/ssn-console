import type {
  TermsAndConditions as ApiTermsAndConditions,
  GetLatestTermsAndConditionsResponse as ApiGetLatestTermsAndConditionsResponse,
  UpsertTermsAndConditionsDecisionRequest as ApiUpsertTermsAndConditionsDecisionRequest,
  CreateTermsAndConditionsRequest as ApiCreateTermsAndConditionsRequest,
} from '@ssn/backend-api';
import DOMPurify from 'dompurify';
import { micromark } from 'micromark';

export type GetLatestTermsAndConditionsResponse = TermsAndConditions | null;

export function mapGetLatestTermsAndConditionForUserResponse(
  res: ApiGetLatestTermsAndConditionsResponse,
): GetLatestTermsAndConditionsResponse {
  if (res.length === 0) {
    return null;
  }

  return mapTermsAndConditionsResponse(res[0]);
}

export type TermsAndConditions = {
  id: string;
  content: string;
  comment: string;
  createdAt: Date;
  hasAccepted: boolean;
};

export function mapTermsAndConditionsResponse(
  res: ApiTermsAndConditions,
): TermsAndConditions {
  return {
    id: res.id,
    content: DOMPurify.sanitize(micromark(res.content)),
    comment: res.comment,
    createdAt: new Date(Number(res.created_at / 1_000_000n)),
    hasAccepted: res.has_accepted,
  };
}

export type CreateTermsAndConditionsRequest = {
  content: string;
  comment: string;
};

export function mapCreateTermsAndConditionsRequest(
  req: CreateTermsAndConditionsRequest,
): ApiCreateTermsAndConditionsRequest {
  return {
    content: req.content,
    comment: req.comment,
  };
}

export type UpsertTermsAndConditionsDecisionRequest = {
  termsAndConditionsId: string;
  decisionType: TermsAndConditionsDecisionType;
};

export enum TermsAndConditionsDecisionType {
  Accept = 'Accept',
  Reject = 'Reject',
}

export function mapUpsertTermsAndConditionsDecisionRequest(
  req: UpsertTermsAndConditionsDecisionRequest,
): ApiUpsertTermsAndConditionsDecisionRequest {
  return {
    terms_and_conditions_id: req.termsAndConditionsId,
    decision_type:
      req.decisionType === TermsAndConditionsDecisionType.Accept
        ? { Accept: null }
        : { Reject: null },
  };
}
