import type {
  InfraOutput,
  InfraResult,
  InfraWorkloadScalarValue,
  InfraWorkloadValue,
} from '@ankhorage/contracts/infra';

import type { DockerComposeSecretValueSegment } from '../../../types/dockerComposeRuntime';

export type ResolvedDockerComposeValue =
  | { readonly kind: 'public'; readonly value: string }
  | {
      readonly kind: 'secret';
      readonly segments: readonly DockerComposeSecretValueSegment[];
    };

/*** Resolve public values while preserving secret references for execution-time materialization. */
export function resolveDockerComposeValue(
  outputs: readonly InfraOutput[],
  value: InfraWorkloadValue,
  workloadId: string,
  target: string,
): InfraResult<ResolvedDockerComposeValue> {
  const values = value.kind === 'template' ? value.segments : [value];
  const segments: DockerComposeSecretValueSegment[] = [];
  for (const valueSegment of values) {
    const resolved = resolveSegment(outputs, valueSegment, workloadId, target);
    if (!resolved.ok) return resolved;
    segments.push(resolved.value);
  }
  return segments.every((segment) => segment.kind === 'literal')
    ? {
        ok: true,
        value: { kind: 'public', value: segments.map(({ value }) => value).join('') },
        diagnostics: [],
      }
    : { ok: true, value: { kind: 'secret', segments }, diagnostics: [] };
}

/*** Resolve one scalar segment while retaining privileged references. */
function resolveSegment(
  outputs: readonly InfraOutput[],
  value: InfraWorkloadScalarValue,
  workloadId: string,
  target: string,
): InfraResult<DockerComposeSecretValueSegment> {
  if (value.kind === 'literal') return success(value);
  if (value.kind === 'secret') return success({ kind: 'reference', reference: value.reference });
  if (value.kind === 'credential') {
    return success({
      kind: 'reference',
      reference: { ...value.reference, key: value.key },
    });
  }
  const matches = outputs.filter(
    (output) => output.owner.resourceId === value.resourceId && output.name === value.output,
  );
  const [output] = matches;
  if (matches.length !== 1 || output === undefined) {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'docker-compose-output-unresolved',
          message: `Workload ${workloadId} ${target} output ${value.resourceId}.${value.output} did not resolve uniquely.`,
        },
      ],
    };
  }
  return output.visibility === 'secret'
    ? success({ kind: 'reference', reference: output.reference })
    : success({ kind: 'literal', value: String(output.value) });
}

/*** Create a successful scalar-segment result. */
function success(
  value: DockerComposeSecretValueSegment,
): InfraResult<DockerComposeSecretValueSegment> {
  return { ok: true, value, diagnostics: [] };
}
