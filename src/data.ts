// Dataset loader. Fetches the pipeline-generated JSON with graceful error
// handling and a retry-friendly signature.

import type { Dataset, Employer, Group, Meta } from './types.ts';

const BASE = import.meta.env.BASE_URL || '/';

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}data/${path}`, { signal });
  if (!res.ok) throw new Error(`Failed to load ${path} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export async function loadDataset(signal?: AbortSignal): Promise<Dataset> {
  const [meta, employers, groups] = await Promise.all([
    getJson<Meta>('meta.json', signal),
    getJson<Employer[]>('employers.json', signal),
    getJson<Group[]>('groups.json', signal),
  ]);
  return { meta, employers, groups };
}
