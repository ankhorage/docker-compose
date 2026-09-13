import type { InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeEngineSession,
  DockerComposeSessionResolver,
} from '../../../types/dockerComposeProcess';
import type { DockerComposeControlPlane } from '../../../types/dockerComposeRuntime';
import { createLocalDockerComposeSessionResolver } from './createLocalDockerComposeSessionResolver';
import { inspectDockerComposeProjectAsync } from './inspectDockerComposeProjectAsync';
import { reconcileDockerComposeProjectAsync } from './reconcileDockerComposeProjectAsync';
import { removeDockerComposeResourcesAsync } from './removeDockerComposeResourcesAsync';
import { runDockerComposeCommandAsync } from './runDockerComposeCommandAsync';
import { stopDockerComposeProjectAsync } from './stopDockerComposeProjectAsync';
import { waitForDockerComposeProjectAsync } from './waitForDockerComposeProjectAsync';

/** Create the concrete stateless Docker Compose CLI control plane. */
export function createDockerComposeCliControlPlane(
  resolver: DockerComposeSessionResolver = createLocalDockerComposeSessionResolver(),
): DockerComposeControlPlane {
  return {
    validateAsync: async (_project, access, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      if (!session.ok) return session;
      const docker = await validateCommandAsync(session.value, ['info'], signal);
      if (!docker.ok) return docker;
      return validateCommandAsync(session.value, ['compose', 'version'], signal);
    },
    inspectAsync: async (identity, access, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      return session.ok
        ? inspectDockerComposeProjectAsync(session.value, identity, signal)
        : session;
    },
    reconcileAsync: async (project, access, pruneResourceIds, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      return session.ok
        ? reconcileDockerComposeProjectAsync(session.value, project, pruneResourceIds, signal)
        : session;
    },
    waitUntilReadyAsync: async (identity, access, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      return session.ok
        ? waitForDockerComposeProjectAsync(session.value, identity, signal)
        : session;
    },
    downAsync: async (identity, access, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      return session.ok ? stopDockerComposeProjectAsync(session.value, identity, signal) : session;
    },
    destroyAsync: async (identity, access, resourceIds, signal) => {
      const session = await resolver.resolveAsync(access, signal);
      return session.ok
        ? removeDockerComposeResourcesAsync(session.value, identity, resourceIds, signal)
        : session;
    },
  };
}

async function validateCommandAsync(
  session: DockerComposeEngineSession,
  arguments_: readonly string[],
  signal?: AbortSignal,
): Promise<InfraResult<null>> {
  const result = await runDockerComposeCommandAsync(session, {
    arguments: arguments_,
    ...(signal === undefined ? {} : { signal }),
    failureCode: 'docker-compose-prerequisite-unavailable',
    failureMessage: 'Docker and Docker Compose must be available on the selected target.',
  });
  return result.ok ? { ok: true, value: null, diagnostics: [] } : result;
}
