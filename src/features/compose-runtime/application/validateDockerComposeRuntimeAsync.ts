import type { InfraExecutionContext, InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeAdapterOptions,
  DockerComposeDesiredState,
} from '../../../types/dockerComposeRuntime';
import { prepareDockerComposeRuntimeAsync } from './prepareDockerComposeRuntimeAsync';

/*** Validate target, portable workloads and Compose prerequisites without mutation. */
export async function validateDockerComposeRuntimeAsync(
  options: DockerComposeAdapterOptions,
  context: InfraExecutionContext,
  desired: DockerComposeDesiredState,
): Promise<InfraResult<null>> {
  const prepared = await prepareDockerComposeRuntimeAsync(options, context, desired);
  return prepared.ok ? { ok: true, value: null, diagnostics: [] } : prepared;
}
