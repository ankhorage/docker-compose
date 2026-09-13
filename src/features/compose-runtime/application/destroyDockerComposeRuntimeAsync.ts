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
  DockerComposeDesiredState,
  DockerComposeResourceObservation,
} from '../../../types/dockerComposeRuntime';
import { createObservedDockerComposeOwner } from '../utils/getDockerComposeResources';
import { orderDockerComposeResourceIdsForRemoval } from '../utils/orderDockerComposeResourceIdsForRemoval';
import { resolveDockerComposeTargetAsync } from '../utils/resolveDockerComposeTargetAsync';

/*** Delete only owned and authorized Compose resources in reverse dependency order. */
export async function destroyDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
  request: InfraDestroyRequest,
): Promise<InfraResult<InfraReconcileResult>> {
  if (!isConfirmed(context, request)) return unconfirmedDestroy();
  const target = await resolveDockerComposeTargetAsync(context, desired);
  if (!target.ok) return target;
  const observed = await options.controlPlane.inspectAsync(
    target.value.identity,
    target.value.access,
    context.signal,
  );
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
    target.value.identity,
    target.value.access,
    orderDockerComposeResourceIdsForRemoval(deletable),
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
