import { AnonymousIdentity } from '@icp-sdk/core/agent';
import { createIdentity } from '@dfinity/pic';

export const anonymousIdentity = new AnonymousIdentity();
export const controllerIdentity = createIdentity('@Password!1234');
