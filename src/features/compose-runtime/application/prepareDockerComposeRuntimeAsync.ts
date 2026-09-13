import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
  DockerComposeProject,
  DockerComposeTargetAccess,
} from '../../../types/dockerComposeRuntime';
import { resolveDockerComposeTargetAsync } from '../utils/resolveDockerComposeTargetAsync';
import { projectDockerComposeProject } from './projectDockerComposeProject';

interface PreparedDockerComposeRuntime {
  readonly project: DockerComposeProject;
  readonly access: DockerComposeTargetAccess;
}

/*** Resolve target access, project workloads and validate Compose prerequisites. */
export async function prepareDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<PreparedDockerComposeRuntime>> {
  const target = await resolveDockerComposeTargetAsync(context, desired);
  if (!target.ok) return target;
  const project = projectDockerComposeProject(context, desired, target.value.identity);
  if (!project.ok) return project;
  const validation = await options.controlPlane.validateAsync(
    project.value,
    target.value.access,
    context.signal,
  );
  if (!validation.ok) return validation;
  return {
    ok: true,
    value: { project: project.value, access: target.value.access },
    diagnostics: [],
  };
}
