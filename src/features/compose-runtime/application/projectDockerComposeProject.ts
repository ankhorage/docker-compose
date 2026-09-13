import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeConfig,
  DockerComposeDesiredState,
  DockerComposeProject,
  DockerComposeProjectIdentity,
  DockerComposeSecret,
  DockerComposeService,
  DockerComposeVolume,
} from '../../../types/dockerComposeRuntime';
import { createDockerComposeNetwork } from '../utils/dockerComposeResourceFactories';
import { projectDockerComposeWorkload } from './projectDockerComposeWorkload';
import { validateDockerComposeWorkloads } from './validateDockerComposeWorkloads';

/***
 * Project portable workloads into deterministic Compose services, networks, volumes, configs and
 * secret references without Kubernetes-specific concepts or resolved secret values.
 *
 * @readme
 */
export function projectDockerComposeProject(
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
  identity: DockerComposeProjectIdentity,
): InfraResult<DockerComposeProject> {
  const diagnostics = validateDockerComposeWorkloads(desired.workloads);
  if (diagnostics.length > 0) return { ok: false, diagnostics };
  const network = createDockerComposeNetwork(context, identity);
  const volumes: DockerComposeVolume[] = [];
  const configs: DockerComposeConfig[] = [];
  const secrets: DockerComposeSecret[] = [];
  const services: DockerComposeService[] = [];
  for (const workload of desired.workloads) {
    const projected = projectDockerComposeWorkload({
      context,
      outputs: desired.availableOutputs,
      identity,
      network,
      workload,
    });
    if (!projected.ok) return projected;
    volumes.push(...projected.value.volumes);
    configs.push(...projected.value.configs);
    secrets.push(...projected.value.secrets);
    services.push(projected.value.service);
  }
  return {
    ok: true,
    value: { identity, network, volumes, configs, secrets, services },
    diagnostics: [],
  };
}
