import type {
  InfraExecutionContext,
  InfraPlanAction,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
  DockerComposeProjectObservation,
  DockerComposeResource,
} from '../../../types/dockerComposeRuntime';
import { getDockerComposeResources } from '../utils/getDockerComposeResources';
import { prepareDockerComposeRuntimeAsync } from './prepareDockerComposeRuntimeAsync';

/*** Plan deterministic Compose create, update, retain and delete operations without mutation. */
export async function planDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<readonly InfraPlanAction[]>> {
  const prepared = await prepareDockerComposeRuntimeAsync(options, context, desired);
  if (!prepared.ok) return prepared;
  const observed = await options.controlPlane.inspectAsync(
    prepared.value.project.identity,
    context.signal,
  );
  if (!observed.ok) return observed;
  return {
    ok: true,
    value: createPlan(
      prepared.value.project.network.owner.identity,
      getDockerComposeResources(prepared.value.project),
      observed.value,
    ),
    diagnostics: [],
  };
}

function createPlan(
  identityTemplate: DockerComposeResource['owner']['identity'],
  desired: readonly DockerComposeResource[],
  observed: DockerComposeProjectObservation,
): readonly InfraPlanAction[] {
  const actual = new Map(observed.resources.map((resource) => [resource.resourceId, resource]));
  const desiredIds = new Set(desired.map(({ owner }) => owner.identity.resourceId));
  const actions: InfraPlanAction[] = desired.map((resource) => {
    const existing = actual.get(resource.owner.identity.resourceId);
    const operation =
      existing === undefined || existing.state === 'absent'
        ? 'create'
        : existing.state === 'ready' && existing.configurationHash === resource.configurationHash
          ? 'noop'
          : 'update';
    return {
      owner: resource.owner.identity,
      operation,
      impact: operation === 'update' ? 'interrupts-service' : 'none',
      detail: `Docker Compose ${resource.kind} ${resource.owner.identity.resourceId}: ${operation}.`,
      dependsOn: resource.owner.dependsOn,
    };
  });
  for (const resource of [...observed.resources]
    .filter(({ resourceId }) => !desiredIds.has(resourceId))
    .sort(({ resourceId: left }, { resourceId: right }) => left.localeCompare(right))) {
    const retained = resource.persistent;
    actions.push({
      owner: { ...identityTemplate, resourceId: resource.resourceId },
      operation: retained ? 'retain' : 'delete',
      impact: retained ? 'none' : 'interrupts-service',
      detail: `Docker Compose resource ${resource.resourceId}: ${retained ? 'retain' : 'delete'}.`,
      dependsOn: resource.dependsOnResourceIds.map((resourceId) => ({
        ...identityTemplate,
        resourceId,
      })),
    });
  }
  return actions;
}
