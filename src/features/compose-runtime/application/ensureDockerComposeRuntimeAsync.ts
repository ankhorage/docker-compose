import type {
  InfraExecutionContext,
  InfraReconcileResult,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
} from '../../../types/dockerComposeRuntime';
import {
  createObservedDockerComposeOwner,
  getDockerComposeResources,
} from '../utils/getDockerComposeResources';
import { materializeDockerComposeSecretsAsync } from './materializeDockerComposeSecretsAsync';
import { prepareDockerComposeRuntimeAsync } from './prepareDockerComposeRuntimeAsync';
import { readDockerComposeOutputs } from './readDockerComposeOutputs';

/*** Materialize secrets, converge Compose resources, prune stale owned state and wait for readiness. */
export async function ensureDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<InfraReconcileResult>> {
  const prepared = await prepareDockerComposeRuntimeAsync(options, context, desired);
  if (!prepared.ok) return prepared;
  const { project, access } = prepared.value;
  const observed = await options.controlPlane.inspectAsync(
    project.identity,
    access,
    context.signal,
  );
  if (!observed.ok) return observed;
  const resources = getDockerComposeResources(project);
  const desiredIds = new Set(resources.map(({ owner }) => owner.identity.resourceId));
  const stale = observed.value.resources.filter(({ resourceId }) => !desiredIds.has(resourceId));
  const retained = stale.filter((resource) => resource.persistent);
  const pruneIds = stale
    .filter((resource) => !resource.persistent)
    .map(({ resourceId }) => resourceId);
  const execution = await materializeDockerComposeSecretsAsync(context, project);
  if (!execution.ok) return execution;
  const reconciled = await options.controlPlane.reconcileAsync(
    execution.value,
    access,
    pruneIds,
    context.signal,
  );
  if (!reconciled.ok) return reconciled;
  const ready = await options.controlPlane.waitUntilReadyAsync(
    project.identity,
    access,
    context.signal,
  );
  if (!ready.ok) return ready;
  return {
    ok: true,
    value: {
      resources: [
        ...resources.map(({ owner }) => owner),
        ...retained.map((resource) =>
          createObservedDockerComposeOwner(project.network.owner.identity, resource),
        ),
      ],
      outputs: readDockerComposeOutputs(project.network.owner.identity, ready.value, desiredIds),
    },
    diagnostics: [],
  };
}
