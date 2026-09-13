import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeExecutionProject,
  DockerComposeMaterializedSecret,
  DockerComposeProject,
} from '../../../types/dockerComposeRuntime';

/*** Resolve secret references immediately before Compose reconciliation. */
export async function materializeDockerComposeSecretsAsync(
  context: InfraExecutionContext,
  project: DockerComposeProject,
): Promise<InfraResult<DockerComposeExecutionProject>> {
  const secrets: DockerComposeMaterializedSecret[] = [];
  for (const secret of project.secrets) {
    const resolved = await context.secrets.resolveAsync(secret.reference);
    if (!resolved.ok) return resolved;
    const { reference: _reference, ...publicSecret } = secret;
    secrets.push({ ...publicSecret, value: resolved.value });
  }
  return { ok: true, value: { ...project, secrets }, diagnostics: [] };
}
