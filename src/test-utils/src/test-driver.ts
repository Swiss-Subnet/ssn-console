import {
  generateRandomIdentity,
  PocketIc,
  type SubnetTopology,
} from '@dfinity/pic';
import { controllerIdentity } from './identity';
import type { Principal } from '@icp-sdk/core/principal';
import { incrementCanisterId } from './canister-id';

export class BaseTestDriver {
  protected constructor(public readonly pic: PocketIc) {}

  public async setEnvironmentVariable(
    canisterId: Principal,
    name: string,
    value: string,
  ): Promise<void> {
    await this.pic.updateCanisterSettings({
      canisterId,
      environmentVariables: [{ name, value }],
      sender: controllerIdentity.getPrincipal(),
    });
  }

  public async createCanisters(numCanisters = 1): Promise<Principal[]> {
    const canisterIds = [];

    for (let i = 0; i < numCanisters; i++) {
      const canisterId = await this.pic.createCanister({
        sender: controllerIdentity.getPrincipal(),
      });
      canisterIds.push(canisterId);
    }

    return canisterIds;
  }

  public async createControllerChanges(
    canisterId: Principal,
    numChanges = 1,
    controllers = [controllerIdentity.getPrincipal()],
  ): Promise<void> {
    for (let i = 0; i < numChanges; i++) {
      const additionalController = generateRandomIdentity();

      await this.pic.updateCanisterSettings({
        canisterId,
        sender: controllerIdentity.getPrincipal(),
        controllers: [...controllers, additionalController.getPrincipal()],
      });
    }
  }

  protected async getSubnet(): Promise<SubnetTopology> {
    const subnets = await this.pic.getApplicationSubnets();
    const firstSubnet = subnets.at(0);
    if (!firstSubnet) {
      throw new Error('An application subnet was not created by pocket ic');
    }

    return firstSubnet;
  }

  protected async getSubnetCanisterRanges(
    rangeSize = 10,
  ): Promise<[Principal, Principal][]> {
    const subnet = await this.getSubnet();

    return subnet.canisterRanges.map<[Principal, Principal]>(({ start }) => {
      const stepsToTake = Math.max(0, rangeSize - 1);
      return [start, incrementCanisterId(start, stepsToTake)];
    });
  }
}
