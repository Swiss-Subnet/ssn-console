import type {
  TermsAndConditions as ApiTermsAndConditions,
  GetLatestTermsAndConditionsResponse as ApiGetLatestTermsAndConditionsResponse,
  UpsertTermsAndConditionsResponseRequest as ApiUpsertTermsAndConditionsResponseRequest,
  CreateTermsAndConditionsRequest as ApiCreateTermsAndConditionsRequest,
} from '@ssn/backend-api';
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
    content: micromark(res.content),
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

export type UpsertTermsAndConditionsResponseRequest = {
  termsAndConditionsId: string;
  responseType: TermsAndConditionsResponseType;
};

export enum TermsAndConditionsResponseType {
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

export function mapUpsertTermsAndConditionsResponseRequest(
  req: UpsertTermsAndConditionsResponseRequest,
): ApiUpsertTermsAndConditionsResponseRequest {
  return {
    terms_and_conditions_id: req.termsAndConditionsId,
    response_type:
      req.responseType === TermsAndConditionsResponseType.Accepted
        ? { Accept: null }
        : { Reject: null },
  };
}
