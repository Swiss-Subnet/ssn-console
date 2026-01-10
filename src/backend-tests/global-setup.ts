import type { TestProject } from 'vitest/node';
import { PocketIcServer } from '@dfinity/pic';

let pic: PocketIcServer | undefined;

export async function setup(project: TestProject): Promise<void> {
  pic = await PocketIcServer.start();
  const url = pic.getUrl();

  project.provide('PIC_URL', url);
}

export async function teardown(): Promise<void> {
  await pic?.stop();
}
