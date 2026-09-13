import type { InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeEngineSession,
  DockerComposeSessionResolver,
} from '../../../types/dockerComposeProcess';
import { createSubprocessDockerComposeCommandRunner } from './createSubprocessDockerComposeCommandRunner';

/** Create the default resolver for the current local Docker engine. */
export function createLocalDockerComposeSessionResolver(): DockerComposeSessionResolver {
  const runner = createSubprocessDockerComposeCommandRunner();
  return {
    resolveAsync: (access) => {
      if (access.transport.kind !== 'local') return Promise.resolve(remoteResolverRequired());
      const session: DockerComposeEngineSession = {
        runner,
        executable: 'docker',
        endpointHost: '127.0.0.1',
      };
      return Promise.resolve({ ok: true, value: session, diagnostics: [] });
    },
  };
}

function remoteResolverRequired(): InfraResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-remote-session-required',
        message: 'Remote Docker Compose requires an injected host-key-verifying session resolver.',
      },
    ],
  };
}
