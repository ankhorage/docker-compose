import type {
  InfraExecutionContext,
  InfraOwnedResource,
  InfraReconcileResult,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
} from '../../../types/dockerComposeRuntime';
import { createObservedDockerComposeOwner } from '../utils/getDockerComposeResources';
import { resolveDockerComposeTargetAsync } from '../utils/resolveDockerComposeTargetAsync';

/*** Stop Compose services while retaining networks, configs, secrets and volumes. */
export async function suspendDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<InfraReconcileResult>> {
  const target = await resolveDockerComposeTargetAsync(context, desired);
  if (!target.ok) return target;
  const observed = await options.controlPlane.inspectAsync(
    target.value.identity,
    target.value.access,
    context.signal,
  );
  if (!observed.ok) return observed;
  const down = await options.controlPlane.downAsync(
    target.value.identity,
    target.value.access,
    context.signal,
  );
  if (!down.ok) return down;
  const template: InfraOwnedResource['identity'] = {
    projectId: context.projectId,
    environment: context.environment,
    adapter: 'docker-compose',
    resourceId: '',
  };
  return {
    ok: true,
    value: {
      resources: observed.value.resources.map((resource) =>
        createObservedDockerComposeOwner(template, resource),
      ),
      outputs: [],
    },
    diagnostics: [],
  };
}
