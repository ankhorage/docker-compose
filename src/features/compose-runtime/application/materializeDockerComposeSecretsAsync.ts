import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeExecutionProject,
  DockerComposeMaterializedSecret,
  DockerComposeProject,
  DockerComposeSecretValueSegment,
} from '../../../types/dockerComposeRuntime';

/*** Resolve secret references immediately before Compose reconciliation. */
export async function materializeDockerComposeSecretsAsync(
  context: InfraExecutionContext,
  project: DockerComposeProject,
): Promise<InfraResult<DockerComposeExecutionProject>> {
  const secrets: DockerComposeMaterializedSecret[] = [];
  for (const secret of project.secrets) {
    const resolved = await materializeSegmentsAsync(context, secret.segments);
    if (!resolved.ok) return resolved;
    const { segments: _segments, ...publicSecret } = secret;
    secrets.push({ ...publicSecret, value: resolved.value });
  }
  return { ok: true, value: { ...project, secrets }, diagnostics: [] };
}

/*** Resolve and concatenate one ordered execution-only secret value. */
async function materializeSegmentsAsync(
  context: InfraExecutionContext,
  segments: DockerComposeProject['secrets'][number]['segments'],
): Promise<InfraResult<string>> {
  const values: string[] = [];
  for (const segment of segments) {
    if (segment.kind === 'literal') {
      values.push(segment.value);
      continue;
    }
    const resolved =
      segment.reference.source === 'secret-store'
        ? await context.secrets.resolveAsync(segment.reference)
        : await resolveCredentialValueAsync(context, segment.reference);
    if (!resolved.ok) return resolved;
    values.push(resolved.value);
  }
  return { ok: true, value: values.join(''), diagnostics: [] };
}

async function resolveCredentialValueAsync(
  context: InfraExecutionContext,
  reference: Extract<
    Extract<DockerComposeSecretValueSegment, { readonly kind: 'reference' }>['reference'],
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
