import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';
import type {
  DockerComposeExecutionProject,
  DockerComposeProjectObservation,
} from '../../../types/dockerComposeRuntime';
import { orderDockerComposeResourceIdsForRemoval } from '../utils/orderDockerComposeResourceIdsForRemoval';
import { inspectDockerComposeProjectAsync } from './inspectDockerComposeProjectAsync';
import { removeDockerComposeResourcesAsync } from './removeDockerComposeResourcesAsync';
import { renderDockerComposeCliInput } from './renderDockerComposeCliInput';
import { runDockerComposeCommandAsync } from './runDockerComposeCommandAsync';

/*** Converge one exact Compose project from stdin and remove only explicitly selected stale resources. */
export async function reconcileDockerComposeProjectAsync(
  session: DockerComposeEngineSession,
  project: DockerComposeExecutionProject,
  pruneResourceIds: readonly string[],
  signal?: AbortSignal,
): Promise<InfraResult<DockerComposeProjectObservation>> {
  const observed = await inspectDockerComposeProjectAsync(session, project.identity, signal);
  if (!observed.ok) return observed;
  const selected = new Set(pruneResourceIds);
  const stale = observed.value.resources.filter(({ resourceId }) => selected.has(resourceId));
  const removed = await removeDockerComposeResourcesAsync(
    session,
    project.identity,
    orderDockerComposeResourceIdsForRemoval(stale),
    signal,
  );
  if (!removed.ok) return removed;
  const input = renderDockerComposeCliInput(project);
  const reconciled = await runDockerComposeCommandAsync(session, {
    arguments: [
      'compose',
      '--project-name',
      project.identity.projectName,
      '--file',
      '-',
      'up',
      '--detach',
      '--remove-orphans',
    ],
    stdin: input.document,
    environment: input.environment,
    ...(signal === undefined ? {} : { signal }),
    failureCode: 'docker-compose-reconcile-failed',
    failureMessage: 'Docker Compose project reconciliation failed.',
  });
  if (!reconciled.ok) return reconciled;
  return inspectDockerComposeProjectAsync(session, project.identity, signal);
}
