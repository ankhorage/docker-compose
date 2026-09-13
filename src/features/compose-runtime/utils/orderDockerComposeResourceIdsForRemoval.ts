import type { DockerComposeResourceObservation } from '../../../types/dockerComposeRuntime';

/** Return selected resources in reverse dependency order for safe teardown. */
export function orderDockerComposeResourceIdsForRemoval(
  resources: readonly DockerComposeResourceObservation[],
): readonly string[] {
  const byId = new Map(resources.map((resource) => [resource.resourceId, resource]));
  const visited = new Set<string>();
  const dependencyFirst: string[] = [];
  const visit = (resourceId: string): void => {
    if (visited.has(resourceId)) return;
    const resource = byId.get(resourceId);
    if (resource === undefined) return;
    visited.add(resourceId);
    for (const dependency of resource.dependsOnResourceIds) visit(dependency);
    dependencyFirst.push(resourceId);
  };
  for (const resource of [...resources].sort(({ resourceId: left }, { resourceId: right }) =>
    left.localeCompare(right),
  )) {
    visit(resource.resourceId);
  }
  return dependencyFirst.reverse();
}
