import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TestDriver,
  unauthenticatedError,
  unauthorizedError,
} from '../support';
import { generateRandomIdentity } from '@dfinity/pic';
import {
  anonymousIdentity,
  controllerIdentity,
  extractOkResponse,
} from '@ssn/test-utils';

describe('Trusted Partners', () => {
  let driver: TestDriver;

  beforeEach(async () => {
    driver = await TestDriver.create();
  });

  afterEach(async () => {
    await driver.tearDown();
  });

  describe('list_trusted_partners', () => {
    it('should return an error for an anonymous user', async () => {
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.list_trusted_partners();
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.list_trusted_partners();
      expect(res).toEqual(unauthorizedError);
    });

    it('should return an empty array when there are no trusted partners', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const partnersRes = await driver.actor.list_trusted_partners();
      const partners = extractOkResponse(partnersRes);
      expect(partners).toEqual([]);
    });

    it('should return all trusted partners', async () => {
      const alicePartnerIdentity = generateRandomIdentity();
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);

      const alicePartnerRes = await driver.actor.create_trusted_partner({
        name: 'Alice',
        principal_id: alicePartnerIdentity.getPrincipal().toText(),
      });
      const alicePartner = extractOkResponse(alicePartnerRes);

      const bobPartnerRes = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });
      const bobPartner = extractOkResponse(bobPartnerRes);

      const partnersRes = await driver.actor.list_trusted_partners();
      const partners = extractOkResponse(partnersRes);

      expect(partners.length).toBe(2);
      expect(partners).toContainEqual(alicePartner);
      expect(partners).toContainEqual(bobPartner);
    });
  });

  describe('create_trusted_partner', () => {
    it('should return an error for an anonymous user', async () => {
      const alicePartnerIdentity = generateRandomIdentity();
      driver.actor.setIdentity(anonymousIdentity);

      const res = await driver.actor.create_trusted_partner({
        name: 'Alice',
        principal_id: alicePartnerIdentity.getPrincipal().toText(),
      });
      expect(res).toEqual(unauthenticatedError);
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);

      const res = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });
      expect(res).toEqual(unauthorizedError);
    });

    it('should create a trusted partner', async () => {
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      const bobPartnerRes = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });
      const bobPartner = extractOkResponse(bobPartnerRes);

      expect(bobPartner).toEqual({
        id: expect.any(String),
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
        name: 'Bob',
      });
    });

    it('should return an error if a partner with the same principal ID already exists', async () => {
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      const existingPartnerRes = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });
      const existingPartner = extractOkResponse(existingPartnerRes);

      const res = await driver.actor.create_trusted_partner({
        name: 'Robert',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });
      expect(res).toEqual({
        Err: {
          code: [{ ClientError: {} }],
          message: `Trusted partner for principal ${bobPartnerIdentity.getPrincipal().toText()} already exists with id ${existingPartner.id}`,
        },
      });
    });
  });
});
