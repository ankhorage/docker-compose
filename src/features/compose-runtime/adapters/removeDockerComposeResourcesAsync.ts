import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';
import type { DockerComposeProjectIdentity } from '../../../types/dockerComposeRuntime';
import { getDockerComposeOwnershipFilters } from '../utils/getDockerComposeOwnershipFilters';
import { runDockerComposeCommandAsync } from './runDockerComposeCommandAsync';

/*** Remove only exact owned resource IDs, preserving the caller's dependency-safe ordering. */
export async function removeDockerComposeResourcesAsync(
  session: DockerComposeEngineSession,
  identity: DockerComposeProjectIdentity,
  resourceIds: readonly string[],
  signal?: AbortSignal,
): Promise<InfraResult<null>> {
  for (const resourceId of resourceIds) {
    const kind = getEngineKind(resourceId);
    if (kind === 'logical') continue;
    if (kind === undefined) return invalidResourceId();
    const names = await listResourceNamesAsync(session, identity, resourceId, kind, signal);
    if (!names.ok) return names;
    if (names.value.length === 0) continue;
    const removed = await runDockerComposeCommandAsync(session, {
      arguments: removeArguments(kind, names.value),
      ...(signal === undefined ? {} : { signal }),
      failureCode: 'docker-compose-remove-failed',
      failureMessage: 'Docker Compose owned resource removal failed.',
    });
    if (!removed.ok) return removed;
  }
  return { ok: true, value: null, diagnostics: [] };
}

async function listResourceNamesAsync(
  session: DockerComposeEngineSession,
  identity: DockerComposeProjectIdentity,
  resourceId: string,
  kind: 'container' | 'network' | 'volume',
  signal?: AbortSignal,
): Promise<InfraResult<readonly string[]>> {
  const result = await runDockerComposeCommandAsync(session, {
    arguments: [
      kind,
      'ls',
      ...(kind === 'container' ? ['--all'] : []),
      ...getDockerComposeOwnershipFilters(identity, resourceId),
      '--format',
      kind === 'volume' ? '{{.Name}}' : '{{.ID}}',
    ],
    ...(signal === undefined ? {} : { signal }),
    failureCode: 'docker-compose-remove-inspection-failed',
    failureMessage: 'Docker Compose owned resource lookup failed.',
  });
  return result.ok
    ? {
        ok: true,
        value: result.value
          .split('\n')
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
        diagnostics: [],
      }
    : result;
}

function removeArguments(
  kind: 'container' | 'network' | 'volume',
  names: readonly string[],
): readonly string[] {
  return kind === 'container'
    ? ['container', 'rm', '--force', '--', ...names]
    : [kind, 'rm', '--', ...names];
}

function getEngineKind(
  resourceId: string,
): 'container' | 'network' | 'volume' | 'logical' | undefined {
  if (resourceId.startsWith('service:')) return 'container';
  if (resourceId.startsWith('network:')) return 'network';
  if (resourceId.startsWith('volume:')) return 'volume';
  if (resourceId.startsWith('config:') || resourceId.startsWith('secret:')) return 'logical';
  return undefined;
}

function invalidResourceId(): InfraResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-resource-id-invalid',
        message: 'Docker Compose removal received an invalid resource identity.',
      },
    ],
  };
}
