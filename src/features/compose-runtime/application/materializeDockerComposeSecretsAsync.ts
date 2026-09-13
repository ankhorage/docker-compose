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
    const resolved =
      secret.reference.source === 'secret-store'
        ? await context.secrets.resolveAsync(secret.reference)
        : await resolveCredentialValueAsync(context, secret.reference);
    if (!resolved.ok) return resolved;
    const { reference: _reference, ...publicSecret } = secret;
    secrets.push({ ...publicSecret, value: resolved.value });
  }
  return { ok: true, value: { ...project, secrets }, diagnostics: [] };
}

async function resolveCredentialValueAsync(
  context: InfraExecutionContext,
  reference: Extract<
    DockerComposeProject['secrets'][number]['reference'],
    { source: 'control-plane' }
  >,
): Promise<InfraResult<string>> {
  const resolved = await context.credentials.resolveAsync(reference);
  if (!resolved.ok) return resolved;
  const value = resolved.value[reference.key];
  return value === undefined
    ? {
        ok: false,
        diagnostics: [
          {
            severity: 'error',
            code: 'docker-compose-credential-key-missing',
            message: 'A required control-plane credential field is missing.',
          },
        ],
      }
    : { ok: true, value, diagnostics: [] };
}
