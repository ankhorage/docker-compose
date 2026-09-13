import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';
import type {
  DockerComposeProjectIdentity,
  DockerComposeProjectObservation,
} from '../../../types/dockerComposeRuntime';
import { inspectDockerComposeProjectAsync } from './inspectDockerComposeProjectAsync';

/*** Poll exact owned Compose state until ready, failed, aborted or timed out. */
export async function waitForDockerComposeProjectAsync(
  session: DockerComposeEngineSession,
  identity: DockerComposeProjectIdentity,
  signal?: AbortSignal,
  timeoutMs = 120_000,
  pollIntervalMs = 250,
): Promise<InfraResult<DockerComposeProjectObservation>> {
  const startedAt = Date.now();
  for (;;) {
    if (signal?.aborted === true) return readinessFailure('aborted');
    const observed = await inspectDockerComposeProjectAsync(session, identity, signal);
    if (!observed.ok) return observed;
    if (observed.value.state === 'ready') return observed;
    if (observed.value.state === 'failed') return readinessFailure('failed');
    if (Date.now() - startedAt >= timeoutMs) return readinessFailure('timeout');
    await waitAsync(pollIntervalMs);
  }
}

function waitAsync(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readinessFailure(reason: 'aborted' | 'failed' | 'timeout'): InfraResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: `docker-compose-readiness-${reason}`,
        message: `Docker Compose project readiness ${reason}.`,
      },
    ],
  };
}
