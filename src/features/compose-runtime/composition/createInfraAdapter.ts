import type { InfraRuntimeAdapter } from '@ankhorage/contracts/infra';

import { infraAdapterDescriptor } from '../../../constants/infra';
import type { DockerComposeAdapterOptions } from '../../../types/dockerComposeRuntime';
import { destroyDockerComposeRuntimeAsync } from '../application/destroyDockerComposeRuntimeAsync';
import { ensureDockerComposeRuntimeAsync } from '../application/ensureDockerComposeRuntimeAsync';
import { getDockerComposeStatusAsync } from '../application/getDockerComposeStatusAsync';
import { planDockerComposeRuntimeAsync } from '../application/planDockerComposeRuntimeAsync';
import { suspendDockerComposeRuntimeAsync } from '../application/suspendDockerComposeRuntimeAsync';
import { validateDockerComposeRuntimeAsync } from '../application/validateDockerComposeRuntimeAsync';

/***
 * Create the canonical Docker Compose runtime adapter entrypoint.
 *
 * The caller supplies a Docker Compose control-plane boundary. Portable workloads are projected
 * into Compose services, networks, volumes, configs and execution-only secrets.
 *
 * @readme
 */
export function createInfraAdapter(
  options: DockerComposeAdapterOptions,
): InfraRuntimeAdapter<'docker-compose'> {
  return {
    descriptor: infraAdapterDescriptor,
    validateAsync: (context, desired) =>
      validateDockerComposeRuntimeAsync(options, context, desired),
    planAsync: (context, desired) => planDockerComposeRuntimeAsync(options, context, desired),
    ensureAsync: (context, desired) => ensureDockerComposeRuntimeAsync(options, context, desired),
    statusAsync: (context) => getDockerComposeStatusAsync(options, context),
    suspendAsync: (context) => suspendDockerComposeRuntimeAsync(options, context),
    destroyAsync: (context, request) => destroyDockerComposeRuntimeAsync(options, context, request),
  };
}
