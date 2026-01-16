import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { anonymousIdentity, controllerIdentity, TestDriver } from '../support';
import { generateRandomIdentity } from '@dfinity/pic';

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

      await expect(driver.actor.list_trusted_partners()).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      driver.actor.setIdentity(aliceIdentity);

      await expect(driver.actor.list_trusted_partners()).rejects.toThrowError(
        /Only controllers can perform this action/,
      );
    });

    it('should return an empty array when there are no trusted partners', async () => {
      driver.actor.setIdentity(controllerIdentity);

      const partners = await driver.actor.list_trusted_partners();
      expect(partners).toEqual([]);
    });

    it('should return all trusted partners', async () => {
      const alicePartnerIdentity = generateRandomIdentity();
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);

      const alicePartner = await driver.actor.create_trusted_partner({
        name: 'Alice',
        principal_id: alicePartnerIdentity.getPrincipal().toText(),
      });
      const bobPartner = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });

      const partners = await driver.actor.list_trusted_partners();

      expect(partners.length).toBe(2);
      expect(partners).toContainEqual(alicePartner);
      expect(partners).toContainEqual(bobPartner);
    });
  });

  describe('create_trusted_partner', () => {
    it('should return an error for an anonymous user', async () => {
      const alicePartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(anonymousIdentity);
      await expect(
        driver.actor.create_trusted_partner({
          name: 'Alice',
          principal_id: alicePartnerIdentity.getPrincipal().toText(),
        }),
      ).rejects.toThrowError(
        /Anonymous users are not allowed to perform this action/,
      );
    });

    it('should return an error for a non-controller user', async () => {
      const aliceIdentity = generateRandomIdentity();
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(aliceIdentity);
      await expect(
        driver.actor.create_trusted_partner({
          name: 'Bob',
          principal_id: bobPartnerIdentity.getPrincipal().toText(),
        }),
      ).rejects.toThrowError(/Only controllers can perform this action/);
    });

    it('should create a trusted partner', async () => {
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      const bobPartner = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });

      expect(bobPartner).toEqual({
        id: expect.any(String),
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
        name: 'Bob',
      });
    });

    it('should return an error if a partner with the same principal ID already exists', async () => {
      const bobPartnerIdentity = generateRandomIdentity();

      driver.actor.setIdentity(controllerIdentity);
      const existingPartner = await driver.actor.create_trusted_partner({
        name: 'Bob',
        principal_id: bobPartnerIdentity.getPrincipal().toText(),
      });

      await expect(
        driver.actor.create_trusted_partner({
          name: 'Robert',
          principal_id: bobPartnerIdentity.getPrincipal().toText(),
        }),
      ).rejects.toThrowError(
        new RegExp(
          `Trusted partner for principal ${bobPartnerIdentity.getPrincipal().toText()} already exists with id ${existingPartner.id}`,
        ),
      );
    });
  });
});
