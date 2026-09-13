import type {
  InfraExecutionContext,
  InfraOwnedResource,
  InfraResourceStatus,
  InfraResult,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
} from '../../../types/dockerComposeRuntime';
import { resolveDockerComposeTargetAsync } from '../utils/resolveDockerComposeTargetAsync';

/*** Return status for every resource owned by the exact Compose project. */
export async function getDockerComposeStatusAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<readonly InfraResourceStatus[]>> {
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
