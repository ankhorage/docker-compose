import type {
  InfraExecutionContext,
  InfraOwnedResource,
  InfraResourceStatus,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type { DockerComposeAdapterOptions } from '../../../types/dockerComposeRuntime';
import { getDockerComposeProjectIdentity } from '../utils/getDockerComposeProjectIdentity';

/*** Return status for every resource owned by the exact Compose project. */
export async function getDockerComposeStatusAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
): Promise<InfraResult<readonly InfraResourceStatus[]>> {
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
  return {
    ok: true,
    value: observed.value.resources.map((resource) => ({
      owner: { ...template, resourceId: resource.resourceId },
      state: resource.state,
      ...(resource.detail === undefined ? {} : { detail: resource.detail }),
    })),
    diagnostics: [],
  };
}
