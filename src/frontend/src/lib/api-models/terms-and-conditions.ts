import { mapOkResponse } from '@/lib/api-models/error';
import type {
  TermsAndConditions as ApiTermsAndConditions,
  TermsAndConditionsListItem as ApiTermsAndConditionsListItem,
  GetLatestTermsAndConditionsResponse as ApiGetLatestTermsAndConditionsResponse,
  ListTermsAndConditionsResponse as ApiListTermsAndConditionsResponse,
  UpsertTermsAndConditionsDecisionRequest as ApiUpsertTermsAndConditionsDecisionRequest,
  CreateTermsAndConditionsRequest as ApiCreateTermsAndConditionsRequest,
} from '@ssn/backend-api';
import { micromark } from 'micromark';

export type GetLatestTermsAndConditionsResponse = TermsAndConditions | null;

export function mapGetLatestTermsAndConditionForUserResponse(
  res: ApiGetLatestTermsAndConditionsResponse,
): GetLatestTermsAndConditionsResponse {
  const okRes = mapOkResponse(res);

  if (okRes.length === 0) {
    return null;
  }

  return mapTermsAndConditionsResponse(okRes[0]);
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

export type TermsAndConditionsListItem = {
  id: string;
  content: string;
  comment: string;
  createdAt: Date;
  createdBy: string;
};

export function mapTermsAndConditionsListItemResponse(
  res: ApiTermsAndConditionsListItem,
): TermsAndConditionsListItem {
  return {
    id: res.id,
    content: micromark(res.content),
    comment: res.comment,
    createdAt: new Date(Number(res.created_at / 1_000_000n)),
    createdBy: res.created_by,
  };
}

export function mapListTermsAndConditionsResponse(
  res: ApiListTermsAndConditionsResponse,
): TermsAndConditionsListItem[] {
  const items = mapOkResponse(res);
  return items.map(mapTermsAndConditionsListItemResponse).reverse();
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
