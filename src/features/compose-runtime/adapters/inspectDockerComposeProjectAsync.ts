import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';
import type {
  DockerComposeProjectIdentity,
  DockerComposeProjectObservation,
} from '../../../types/dockerComposeRuntime';
import { getDockerComposeOwnershipFilters } from '../utils/getDockerComposeOwnershipFilters';
import { parseDockerComposeInspection } from './parseDockerComposeInspection';

/*** Inspect only Docker resources carrying the exact project/environment/adapter ownership scope. */
export async function inspectDockerComposeProjectAsync(
  session: DockerComposeEngineSession,
  identity: DockerComposeProjectIdentity,
  signal?: AbortSignal,
): Promise<InfraResult<DockerComposeProjectObservation>> {
  const filters = getDockerComposeOwnershipFilters(identity);
  const [containerIds, networkIds, volumeNames] = await Promise.all([
    listAsync(session, ['container', 'ls', '--all', ...filters, '--format', '{{.ID}}'], signal),
    listAsync(session, ['network', 'ls', ...filters, '--format', '{{.ID}}'], signal),
    listAsync(session, ['volume', 'ls', ...filters, '--format', '{{.Name}}'], signal),
  ]);
  if (!containerIds.ok) return containerIds;
  if (!networkIds.ok) return networkIds;
  if (!volumeNames.ok) return volumeNames;
  const [containers, networks, volumes] = await Promise.all([
    inspectAsync(session, 'container', containerIds.value, signal),
    inspectAsync(session, 'network', networkIds.value, signal),
    inspectAsync(session, 'volume', volumeNames.value, signal),
  ]);
  if (!containers.ok) return containers;
  if (!networks.ok) return networks;
  if (!volumes.ok) return volumes;
  return parseDockerComposeInspection({
    identity,
    endpointHost: session.endpointHost,
    containers: containers.value,
    networks: networks.value,
    volumes: volumes.value,
  });
}

async function listAsync(
  session: DockerComposeEngineSession,
  arguments_: readonly string[],
  signal?: AbortSignal,
): Promise<InfraResult<readonly string[]>> {
  const result = await session.runner.runAsync({
    executable: session.executable,
    arguments: arguments_,
    ...(session.environment === undefined ? {} : { environment: session.environment }),
    ...(signal === undefined ? {} : { signal }),
  });
  if (result.exitCode !== 0) return commandFailure();
  return {
    ok: true,
    value: result.stdout
      .split('\n')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    diagnostics: [],
  };
}

async function inspectAsync(
  session: DockerComposeEngineSession,
  kind: 'container' | 'network' | 'volume',
  identities: readonly string[],
  signal?: AbortSignal,
): Promise<InfraResult<string>> {
  if (identities.length === 0) return { ok: true, value: '[]', diagnostics: [] };
  const result = await session.runner.runAsync({
    executable: session.executable,
    arguments: [kind, 'inspect', '--', ...identities],
    ...(session.environment === undefined ? {} : { environment: session.environment }),
    ...(signal === undefined ? {} : { signal }),
  });
  return result.exitCode === 0
    ? { ok: true, value: result.stdout, diagnostics: [] }
    : commandFailure();
}

function commandFailure(): InfraResult<never> {
  return {
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-command-failed',
        message: 'Docker Compose resource inspection failed.',
      },
    ],
  };
}
