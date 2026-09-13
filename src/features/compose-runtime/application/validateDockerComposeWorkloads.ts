import type { InfraDiagnostic, InfraWorkloadSpec } from '@ankhorage/contracts/infra';

/*** Validate portable invariants required for deterministic Compose projection. */
export function validateDockerComposeWorkloads(
  workloads: readonly InfraWorkloadSpec[],
): readonly InfraDiagnostic[] {
  const diagnostics: InfraDiagnostic[] = [];
  const ids = new Set<string>();
  for (const workload of workloads) {
    if (ids.has(workload.id)) {
      diagnostics.push({
        severity: 'error',
        code: 'docker-compose-workload-duplicate',
        message: `Workload ID ${workload.id} is duplicated.`,
      });
    }
    ids.add(workload.id);
    for (const dependency of workload.dependsOn ?? []) {
      if (!workloads.some(({ id }) => id === dependency)) {
        diagnostics.push({
          severity: 'error',
          code: 'docker-compose-workload-dependency-missing',
          message: `Workload ${workload.id} depends on missing workload ${dependency}.`,
        });
      }
    }
  }
  return diagnostics;
}
