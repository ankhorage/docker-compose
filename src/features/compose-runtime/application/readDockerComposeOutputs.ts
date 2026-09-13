import type { InfraOwnedResource } from '@ankhorage/contracts/infra';

import type {
  DockerComposeOutput,
  DockerComposeProjectObservation,
} from '../../../types/dockerComposeRuntime';

/*** Read safe public outputs for the selected owned resources. */
export function readDockerComposeOutputs(
  identityTemplate: InfraOwnedResource['identity'],
  observation: DockerComposeProjectObservation,
  selectedResourceIds?: ReadonlySet<string>,
): readonly DockerComposeOutput[] {
  const outputs: DockerComposeOutput[] = [];
  for (const resource of observation.resources) {
    if (selectedResourceIds !== undefined && !selectedResourceIds.has(resource.resourceId))
      continue;
    for (const [name, value] of Object.entries(resource.publicOutputs ?? {}).sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      outputs.push({
        owner: { ...identityTemplate, resourceId: resource.resourceId },
        name,
        visibility: 'public',
        value,
      });
    }
  }
  return outputs;
}
