import type { TestProject } from 'vitest/node';
import {
  startPocketIcServer,
  type PocketIcServerHandle,
} from '@ssn/test-utils';

let server: PocketIcServerHandle | undefined;

export async function setup(project: TestProject): Promise<void> {
  server = await startPocketIcServer();
  project.provide('PIC_URL', server.url);
}

export async function teardown(): Promise<void> {
  await server?.stop();
}
