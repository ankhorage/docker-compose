import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeProjectIdentity } from '../../../types/dockerComposeRuntime';

/** Resolve the canonical Docker Compose project identity. */
export function getDockerComposeProjectIdentity(
  context: InfraExecutionContext,
  projectName?: string,
): InfraResult<DockerComposeProjectIdentity> {
  const { runtime } = context.desired.deployment;
  if (runtime.provider !== 'docker-compose') {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'docker-compose-selection-invalid',
          message: 'Docker Compose requires the canonical docker-compose runtime selection.',
        },
      ],
    };
  }
  return {
    ok: true,
    value: {
      projectId: context.projectId,
      environment: context.environment,
      projectName: toComposeName(
        projectName ?? runtime.projectName ?? `${context.projectId}-${context.environment}`,
      ),
    },
    diagnostics: [],
  };
}

/** Normalize into a deterministic Compose project name. */
export function toComposeName(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ankhorage'
  );
}
