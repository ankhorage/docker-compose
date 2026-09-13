import type {
  InfraDestroyRequest,
  InfraExecutionContext,
  InfraOwnedResource,
  InfraReconcileResult,
  InfraResourceIdentity,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeResourceObservation,
} from '../../../types/dockerComposeRuntime';
import { getDockerComposeProjectIdentity } from '../utils/getDockerComposeProjectIdentity';
import { createObservedDockerComposeOwner } from '../utils/getDockerComposeResources';

/*** Delete only owned and authorized Compose resources in reverse dependency order. */
export async function destroyDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  request: InfraDestroyRequest,
): Promise<InfraResult<InfraReconcileResult>> {
  if (!isConfirmed(context, request)) return unconfirmedDestroy();
  const identity = getDockerComposeProjectIdentity(context);
  if (!identity.ok) return identity;
  const observed = await options.controlPlane.inspectAsync(identity.value, context.signal);
  if (!observed.ok) return observed;
  const template: InfraOwnedResource['identity'] = {
    projectId: context.projectId,
    environment: context.environment,
    adapter: 'docker-compose',
    resourceId: '',
  };
  const retained = observed.value.resources.filter(
    (resource) => !canDelete(resource, template, request),
  );
  const deletable = observed.value.resources.filter((resource) =>
    canDelete(resource, template, request),
  );
  const destroyed = await options.controlPlane.destroyAsync(
    identity.value,
    orderForRemoval(deletable),
    context.signal,
  );
  if (!destroyed.ok) return destroyed;
  return {
    ok: true,
    value: {
      resources: retained.map((resource) => createObservedDockerComposeOwner(template, resource)),
      outputs: [],
    },
    diagnostics: [],
  };
}

function canDelete(
  resource: DockerComposeResourceObservation,
  template: InfraResourceIdentity,
  request: InfraDestroyRequest,
): boolean {
  if (!resource.persistent) return true;
  return (
    resource.retention === 'delete-on-destroy' &&
    request.persistence.policy === 'delete' &&
    request.persistence.confirmedResources.some(
      (identity) =>
        identity.projectId === template.projectId &&
        identity.environment === template.environment &&
        identity.adapter === template.adapter &&
        identity.resourceId === resource.resourceId,
    )
  );
}

function orderForRemoval(
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

function isConfirmed(context: InfraExecutionContext, request: InfraDestroyRequest): boolean {
  return (
    request.projectId === context.projectId &&
    request.environment === context.environment &&
    request.confirmation.projectId === context.projectId &&
    request.confirmation.environment === context.environment
  );
}

function unconfirmedDestroy(): InfraResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-destroy-unconfirmed',
        message: 'Docker Compose destroy requires exact project and environment confirmation.',
      },
    ],
  };
}
