/** Reads an uploaded Actions artifact BACK from GitHub and re-hashes it. Never logs tokens or contents. */
import type { ArtifactRef, ArtifactVerification, RunManifest } from './ledger';
import { readZip, sha256 } from './evidence';

export const REPOSITORY = 'Shaik-Nvd/fhoneify';

async function api(path: string, token: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, { redirect: 'manual', headers: {
    Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
}

export async function artifactMetadata(artifactId: number, token: string): Promise<ArtifactRef & { runId: number; expired: boolean }> {
  const res = await api(`/repos/${REPOSITORY}/actions/artifacts/${artifactId}`, token);
  if (!res.ok) throw new Error(`artifact metadata request failed: HTTP ${res.status}`);
  const a = await res.json() as { id: number; name: string; size_in_bytes: number; expires_at: string; expired: boolean; workflow_run?: { id: number } };
  const runId = a.workflow_run?.id;
  if (!runId) throw new Error('artifact has no workflow run');
  return { id: a.id, name: a.name, sizeBytes: a.size_in_bytes, expiresAt: a.expires_at, expired: a.expired, runId,
    url: `https://github.com/${REPOSITORY}/actions/runs/${runId}/artifacts/${a.id}` };
}

/** Downloads the archive. The signed blob URL is fetched WITHOUT the GitHub token. */
export async function downloadArtifactZip(artifactId: number, token: string): Promise<Buffer> {
  const res = await api(`/repos/${REPOSITORY}/actions/artifacts/${artifactId}/zip`, token);
  const location = res.headers.get('location');
  if (res.status !== 302 || !location || !/^https:\/\//.test(location)) throw new Error(`artifact download was not redirected: HTTP ${res.status}`);
  const blob = await fetch(location);
  if (!blob.ok) throw new Error(`artifact blob download failed: HTTP ${blob.status}`);
  return Buffer.from(await blob.arrayBuffer());
}

export async function verifyArtifact(artifactId: number, token: string, expectedRunId?: number):
  Promise<ArtifactVerification & { zip: Buffer }> {
  const meta = await artifactMetadata(artifactId, token);
  if (meta.expired) throw new Error('artifact already expired');
  if (expectedRunId !== undefined && meta.runId !== expectedRunId) throw new Error('artifact belongs to a different workflow run');
  const zip = await downloadArtifactZip(artifactId, token);
  const files = readZip(zip);
  const recovered: Record<string, string> = {};
  for (const [name, bytes] of files) if (/^[A-Za-z0-9_-]+\.fhc$/.test(name)) recovered[name] = sha256(bytes);
  const manifestBytes = files.get('manifest.json');
  const manifest = manifestBytes ? JSON.parse(manifestBytes.toString('utf8')) as RunManifest : null;
  const { runId: _runId, expired: _expired, ...artifact } = meta;
  return { artifact, recovered, manifest, zip };
}
