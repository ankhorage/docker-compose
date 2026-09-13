import { createHash } from 'node:crypto';

import type {
  InfraExecutionContext,
  InfraOwnedResource,
  InfraSecretReference,
  InfraWorkloadSpec,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeConfig,
  DockerComposeNetwork,
  DockerComposeProjectIdentity,
  DockerComposeSecret,
  DockerComposeVolume,
} from '../../../types/dockerComposeRuntime';
import { toComposeName } from './getDockerComposeProjectIdentity';

export function createDockerComposeNetwork(
  context: InfraExecutionContext,
  identity: DockerComposeProjectIdentity,
): DockerComposeNetwork {
  const owner = createDockerComposeOwner(
    context,
    'network:default',
    false,
    'delete-on-destroy',
    [],
  );
  const spec = { kind: 'network' as const, owner, name: `${identity.projectName}_default` };
  return { ...spec, configurationHash: hashDockerComposeResource(spec) };
}

export function createDockerComposeVolume(
  context: InfraExecutionContext,
  identity: DockerComposeProjectIdentity,
  workloadId: string,
  volume: NonNullable<InfraWorkloadSpec['persistence']>[number],
): DockerComposeVolume {
  const owner = createDockerComposeOwner(
    context,
    `volume:${workloadId}:${volume.id}`,
    true,
    volume.retention,
    [],
  );
  const spec = {
    kind: 'volume' as const,
    owner,
    name: getDockerComposeVolumeName(identity, workloadId, volume.id),
    sizeGiB: volume.sizeGiB,
  };
  return { ...spec, configurationHash: hashDockerComposeResource(spec) };
}

export function getDockerComposeVolumeName(
  identity: DockerComposeProjectIdentity,
  workloadId: string,
  volumeId: string,
): string {
  return toComposeName(`${identity.projectName}-${workloadId}-${volumeId}`);
}

export function createDockerComposeConfig(
  context: InfraExecutionContext,
  identity: DockerComposeProjectIdentity,
  workloadId: string,
  index: number,
  path: string,
  content: string,
): DockerComposeConfig {
  const owner = createDockerComposeOwner(
    context,
    `config:${workloadId}:${index}`,
    false,
    'delete-on-destroy',
    [],
  );
  const spec = {
    kind: 'config' as const,
    owner,
    name: toComposeName(`${identity.projectName}-${workloadId}-config-${index}`),
    content,
  };
  return { ...spec, configurationHash: hashDockerComposeResource({ ...spec, path }) };
}

export function createDockerComposeSecret(
  context: InfraExecutionContext,
  identity: DockerComposeProjectIdentity,
  workloadId: string,
  suffix: string,
  reference: InfraSecretReference,
  target: DockerComposeSecret['target'],
): DockerComposeSecret {
  const owner = createDockerComposeOwner(
    context,
    `secret:${workloadId}:${suffix}`,
    false,
    'delete-on-destroy',
    [],
  );
  const spec = {
    kind: 'secret' as const,
    owner,
    name: toComposeName(`${identity.projectName}-${workloadId}-secret-${suffix}`),
    reference,
    target,
  };
  return { ...spec, configurationHash: hashDockerComposeResource(spec) };
}

export function createDockerComposeOwner(
  context: InfraExecutionContext,
  resourceId: string,
  persistent: boolean,
  retention: InfraOwnedResource['retention'],
  dependencies: readonly InfraOwnedResource[],
): InfraOwnedResource {
  return {
    identity: {
      projectId: context.projectId,
      environment: context.environment,
      adapter: 'docker-compose',
      resourceId,
    },
    persistent,
    retention,
    dependsOn: dependencies.map(({ identity }) => identity),
  };
}

export function hashDockerComposeResource(value: object): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
