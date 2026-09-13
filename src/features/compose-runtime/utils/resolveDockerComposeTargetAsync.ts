import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeDesiredState,
  DockerComposeProjectIdentity,
  DockerComposeTargetAccess,
} from '../../../types/dockerComposeRuntime';
import { getDockerComposeProjectIdentity } from './getDockerComposeProjectIdentity';

interface DockerComposeTargetResolution {
  readonly identity: DockerComposeProjectIdentity;
  readonly access: DockerComposeTargetAccess;
}

/** Validate one portable target and resolve SSH credentials only for the active execution. */
export async function resolveDockerComposeTargetAsync(
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<DockerComposeTargetResolution>> {
  const identity = getDockerComposeProjectIdentity(context, desired.selection.projectName);
  if (!identity.ok) return identity;
  const [target] = desired.targets;
  if (desired.targets.length !== 1 || target === undefined) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'docker-compose-target-invalid',
          message: 'Docker Compose requires exactly one portable local-host or ssh-host target.',
        },
      ],
    };
  }
  if (target.kind === 'local-host') {
    return {
      ok: true,
      value: { identity: identity.value, access: { target, transport: { kind: 'local' } } },
      diagnostics: [],
    };
  }
  const credential = await context.credentials.resolveAsync(target.credential);
  if (!credential.ok) return credential;
  return {
    ok: true,
    value: {
      identity: identity.value,
      access: {
        target,
        transport: {
          kind: 'ssh',
          host: target.host,
          port: target.port,
          user: target.user,
          hostKeyFingerprint: target.hostKeyFingerprint,
          credential: credential.value,
        },
      },
    },
    diagnostics: [],
  };
}
