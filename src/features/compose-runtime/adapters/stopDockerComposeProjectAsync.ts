import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';
import type { DockerComposeProjectIdentity } from '../../../types/dockerComposeRuntime';
import { getDockerComposeOwnershipFilters } from '../utils/getDockerComposeOwnershipFilters';
import { runDockerComposeCommandAsync } from './runDockerComposeCommandAsync';

/*** Stop only running service containers in the exact ownership scope. */
export async function stopDockerComposeProjectAsync(
  session: DockerComposeEngineSession,
  identity: DockerComposeProjectIdentity,
  signal?: AbortSignal,
): Promise<InfraResult<null>> {
  const listed = await runDockerComposeCommandAsync(session, {
    arguments: [
      'container',
      'ls',
      ...getDockerComposeOwnershipFilters(identity),
      '--format',
      '{{.ID}}',
    ],
    ...(signal === undefined ? {} : { signal }),
    failureCode: 'docker-compose-stop-inspection-failed',
    failureMessage: 'Docker Compose running service lookup failed.',
  });
  if (!listed.ok) return listed;
  const ids = listed.value
    .split('\n')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (ids.length === 0) return { ok: true, value: null, diagnostics: [] };
  const stopped = await runDockerComposeCommandAsync(session, {
    arguments: ['container', 'stop', '--', ...ids],
    ...(signal === undefined ? {} : { signal }),
    failureCode: 'docker-compose-stop-failed',
    failureMessage: 'Docker Compose service suspension failed.',
  });
  return stopped.ok ? { ok: true, value: null, diagnostics: [] } : stopped;
}
