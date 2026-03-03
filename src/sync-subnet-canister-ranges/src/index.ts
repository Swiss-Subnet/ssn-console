import {
  HttpAgent,
  Certificate,
  LookupSubtreeStatus,
  type HashTree,
  type NodeLabel,
  NodeType,
  lookup_path,
  LookupPathStatus,
  decodeCanisterRanges,
} from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';

async function getSubnetCanisterRanges(
  subnetIdStr: string,
): Promise<[Principal, Principal][]> {
  const subnetId = Principal.from(subnetIdStr);
  const agent = HttpAgent.createSync({
    host: 'https://icp-api.io',
    shouldFetchRootKey: true,
  });

  const path = [
    new TextEncoder().encode('canister_ranges'),
    subnetId.toUint8Array(),
  ];
  const response = await agent.readSubnetState(subnetId, {
    paths: [path],
  });

  const cert = await Certificate.create({
    certificate: response.certificate,
    rootKey: agent.rootKey!,
    principal: { subnetId },
    agent,
  });

  const lookupResult = cert.lookup_subtree(path);
  if (lookupResult.status !== LookupSubtreeStatus.Found) {
    throw new Error('Canister ranges not found.');
  }

  const canisterRangePaths = getCanisterRangeShardPaths(lookupResult.value);
  if (canisterRangePaths.length === 0) {
    throw new Error('No shards returned');
  }

  return canisterRangePaths.map(path => {
    const shardLookupResult = lookup_path([path], lookupResult.value);
    if (shardLookupResult.status !== LookupPathStatus.Found) {
      throw new Error('Canister range shard not found.');
    }

    return decodeCanisterRanges(shardLookupResult.value)[0];
  });
}

function getCanisterRangeShardPaths(
  canisterRangeShards: HashTree,
): Array<NodeLabel> {
  const shardPaths: Array<NodeLabel> = [];

  for (const path of list_paths([], canisterRangeShards)) {
    const firstLabel = path[0];
    if (!firstLabel) {
      throw new Error('Path is invalid');
    }
    shardPaths.push(firstLabel);
  }

  return shardPaths;
}

function list_paths(
  path: Array<NodeLabel>,
  tree: HashTree,
): Array<Array<NodeLabel>> {
  switch (tree[0]) {
    case NodeType.Empty | NodeType.Pruned: {
      return [];
    }
    case NodeType.Leaf: {
      return [path];
    }
    case NodeType.Fork: {
      return list_paths(path, tree[1]).concat(list_paths(path, tree[2]));
    }
    case NodeType.Labeled: {
      const label = tree[1];
      const subtree = tree[2];
      const pathWithLabel = [...path, label];
      return list_paths(pathWithLabel, subtree);
    }
    default: {
      throw new Error('Unrecognized node type');
    }
  }
}

const SWISS_SUBNET_ID =
  '3zsyy-cnoqf-tvlun-ymf55-tkpca-ox7uw-kfxoh-7khwq-2gz43-wafem-lqe';

getSubnetCanisterRanges(SWISS_SUBNET_ID)
  .then(ranges => {
    console.log('\n✅ Successfully retrieved canister ranges:');
    console.table(ranges.map(([start, end]) => [start.toText(), end.toText()]));
  })
  .catch(error => {
    console.error('\n❌ Error fetching canister ranges:', error.message);
  });
