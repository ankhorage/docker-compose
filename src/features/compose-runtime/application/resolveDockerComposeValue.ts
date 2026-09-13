import type { InfraOutput, InfraResult, InfraWorkloadValue } from '@ankhorage/contracts/infra';

import type { DockerComposeSecret } from '../../../types/dockerComposeRuntime';

export type ResolvedDockerComposeValue =
  | { readonly kind: 'public'; readonly value: string }
  | {
      readonly kind: 'secret';
      readonly reference: DockerComposeSecret['reference'];
    };

/*** Resolve public values while preserving secret references for execution-time materialization. */
export function resolveDockerComposeValue(
  outputs: readonly InfraOutput[],
  value: InfraWorkloadValue,
  workloadId: string,
  target: string,
): InfraResult<ResolvedDockerComposeValue> {
  if (value.kind === 'literal') {
    return { ok: true, value: { kind: 'public', value: value.value }, diagnostics: [] };
  }
  if (value.kind === 'secret') {
    return { ok: true, value: { kind: 'secret', reference: value.reference }, diagnostics: [] };
  }
  if (value.kind === 'credential') {
    return {
      ok: true,
      value: {
        kind: 'secret',
        reference: { ...value.reference, key: value.key },
      },
      diagnostics: [],
    };
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
    ? { ok: true, value: { kind: 'secret', reference: output.reference }, diagnostics: [] }
    : { ok: true, value: { kind: 'public', value: String(output.value) }, diagnostics: [] };
}
