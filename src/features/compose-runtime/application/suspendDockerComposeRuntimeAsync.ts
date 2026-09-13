import type {
  InfraExecutionContext,
  InfraOwnedResource,
  InfraReconcileResult,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type { DockerComposeAdapterOptions } from '../../../types/dockerComposeRuntime';
import { getDockerComposeProjectIdentity } from '../utils/getDockerComposeProjectIdentity';
import { createObservedDockerComposeOwner } from '../utils/getDockerComposeResources';

/*** Stop Compose services while retaining networks, configs, secrets and volumes. */
export async function suspendDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
): Promise<InfraResult<InfraReconcileResult>> {
  const identity = getDockerComposeProjectIdentity(context);
  if (!identity.ok) return identity;
  const observed = await options.controlPlane.inspectAsync(identity.value, context.signal);
  if (!observed.ok) return observed;
  const down = await options.controlPlane.downAsync(identity.value, context.signal);
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
