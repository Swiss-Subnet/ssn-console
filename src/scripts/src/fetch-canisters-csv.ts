import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import type {
  CanisterWithOwner,
  PaginationMetaResponse,
} from '@ssn/backend-api';
import { parseArgs } from 'node:util';

const options = {
  network: {
    type: 'string',
    short: 'n',
  },
} as const;

const { values } = parseArgs({ options });

const NETWORK = values.network ?? 'ic';
const LIMIT_PER_PAGE = 100;
const OUTPUT_FILE = 'canisters_export.csv';

type Res = {
  meta: PaginationMetaResponse;
  canisters: Array<CanisterWithOwner>;
};

function fetchPage(page: number): Res {
  const arg = `"(record { limit = opt ${LIMIT_PER_PAGE}; page = opt ${page} })"`;
  const command = `dfx canister call backend list_all_canisters ${arg} --network ${NETWORK} --output json`;

  console.log(`Fetching page ${page}...`);

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const response = JSON.parse(output);

    if ('Err' in response) {
      throw new Error(`API returned an error: ${JSON.stringify(response.Err)}`);
    }

    return response.Ok as Res;
  } catch (error) {
    console.error(
      `Failed to fetch page ${page}. Check your dfx identity and canister status.`,
    );
    throw error;
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

async function main() {
  let currentPage = 1;
  let totalPages = 1;
  const allCanisters: CanisterWithOwner[] = [];

  do {
    const data = fetchPage(currentPage);
    allCanisters.push(...data.canisters);

    totalPages = Number(data.meta.total_pages);
    currentPage++;
  } while (currentPage <= totalPages);

  console.log(
    `\nSuccessfully fetched ${allCanisters.length} records. Generating CSV...`,
  );

  const csvRows = ['Canister ID,Canister Principal ID,User ID,Email'];

  for (const canister of allCanisters) {
    const id = escapeCsv(canister.id);
    const principal = escapeCsv(canister.principal_id);
    const user = escapeCsv(canister.user_id);

    const emailStr = canister.email?.[0] ?? '';
    const email = escapeCsv(emailStr);

    csvRows.push(`${id},${principal},${user},${email}`);
  }

  writeFileSync(`../../${OUTPUT_FILE}`, csvRows.join('\n'), 'utf-8');
  console.log(`✅ Export complete! Saved to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});
