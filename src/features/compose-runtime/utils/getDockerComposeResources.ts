import type { InfraOwnedResource } from '@ankhorage/contracts/infra';

import type {
  DockerComposeProject,
  DockerComposeResource,
} from '../../../types/dockerComposeRuntime';

/** Return the deterministic dependency-first resource sequence. */
export function getDockerComposeResources(
  project: DockerComposeProject,
): readonly DockerComposeResource[] {
  return [
    project.network,
    ...project.volumes,
    ...project.configs,
    ...project.secrets,
    ...project.services,
  ];
}

/** Rebuild an ownership record from trusted Compose ownership metadata. */
export function createObservedDockerComposeOwner(
  template: InfraOwnedResource['identity'],
  resource: {
    readonly resourceId: string;
    readonly persistent: boolean;
    readonly retention: InfraOwnedResource['retention'];
    readonly dependsOnResourceIds: readonly string[];
    readonly externalId?: string;
  },
): InfraOwnedResource {
  return {
    identity: { ...template, resourceId: resource.resourceId },
    ...(resource.externalId === undefined ? {} : { externalId: resource.externalId }),
    persistent: resource.persistent,
    retention: resource.retention,
    dependsOn: resource.dependsOnResourceIds.map((resourceId) => ({ ...template, resourceId })),
  };
}
