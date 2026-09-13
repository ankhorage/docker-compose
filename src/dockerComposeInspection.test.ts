import { expect, it } from 'bun:test';

import { parseDockerComposeInspection } from './features/compose-runtime/adapters/parseDockerComposeInspection';
import { DOCKER_COMPOSE_LABELS } from './features/compose-runtime/utils/dockerComposeLabels';

const identity = {
  projectId: 'sample',
  environment: 'local' as const,
  projectName: 'sample-local',
};

it('reconstructs exact owned resources, readiness and public ports from Docker inspection', () => {
  const inventory = JSON.stringify([
    inventoryEntry('network', 'network:default', 'sample-local_default'),
    inventoryEntry('volume', 'volume:api:data', 'sample-local-api-data', true),
    inventoryEntry('config', 'config:api:0', 'sample-local-api-config-0'),
    inventoryEntry('secret', 'secret:api:file-0', 'sample-local-api-secret-file-0'),
    {
      ...inventoryEntry('service', 'service:api', 'api'),
      publicPorts: [{ name: 'http', target: 8080, protocol: 'tcp' }],
    },
  ]);
  const result = parseDockerComposeInspection({
    identity,
    endpointHost: '127.0.0.1',
    networks: JSON.stringify([
      engineResource('sample-local_default', 'network:default', 'network-hash', false, inventory),
      engineResource('unowned', 'network:default', 'wrong-hash', false, inventory, 'other'),
    ]),
    volumes: JSON.stringify([
      engineResource('sample-local-api-data', 'volume:api:data', 'volume-hash', true),
    ]),
    containers: JSON.stringify([
      {
        Name: '/sample-local-api-1',
        Config: {
          Labels: labels('service:api', 'service-hash', false, inventory),
        },
        State: { Status: 'running', ExitCode: 0, Health: { Status: 'healthy' } },
        NetworkSettings: { Ports: { '8080/tcp': [{ HostIp: '0.0.0.0', HostPort: '49152' }] } },
      },
    ]),
  });

  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.state).toBe('ready');
  expect(result.value.resources.map(({ resourceId, state }) => [resourceId, state])).toEqual([
    ['config:api:0', 'ready'],
    ['network:default', 'ready'],
    ['secret:api:file-0', 'ready'],
    ['service:api', 'ready'],
    ['volume:api:data', 'ready'],
  ]);
  expect(
    result.value.resources.find(({ resourceId }) => resourceId === 'service:api'),
  ).toMatchObject({ publicOutputs: { endpoint: 'http://127.0.0.1:49152', httpPort: 49152 } });
});

it('recovers a retained volume after every project carrier has been removed', () => {
  const result = parseDockerComposeInspection({
    identity,
    endpointHost: '127.0.0.1',
    networks: '[]',
    containers: '[]',
    volumes: JSON.stringify([
      engineResource('sample-local-api-data', 'volume:api:data', 'volume-hash', true),
    ]),
  });

  expect(result).toEqual({
    ok: true,
    value: {
      state: 'retained',
      resources: [
        {
          resourceId: 'volume:api:data',
          state: 'retained',
          configurationHash: 'volume-hash',
          persistent: true,
          retention: 'delete-on-destroy',
          dependsOnResourceIds: [],
          externalId: 'sample-local-api-data',
        },
      ],
    },
    diagnostics: [],
  });
});

it('returns one sanitized diagnostic for malformed owned metadata', () => {
  const result = parseDockerComposeInspection({
    identity,
    endpointHost: '127.0.0.1',
    containers: '[]',
    volumes: '[]',
    networks: JSON.stringify([
      engineResource('sample-local_default', 'network:default', 'hash', false, 'SENTINEL'),
    ]),
  });

  expect(result).toEqual({
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-inspection-invalid',
        message: 'Docker returned invalid or conflicting owned Compose metadata.',
      },
    ],
  });
  expect(JSON.stringify(result)).not.toContain('SENTINEL');
});

function inventoryEntry(
  kind: 'network' | 'volume' | 'config' | 'secret' | 'service',
  resourceId: string,
  externalId: string,
  persistent = false,
) {
  return {
    kind,
    resourceId,
    configurationHash: `${kind}-hash`,
    persistent,
    retention: 'delete-on-destroy',
    dependsOnResourceIds: [],
    externalId,
  };
}

function engineResource(
  name: string,
  resourceId: string,
  configurationHash: string,
  persistent: boolean,
  inventory?: string,
  projectId = 'sample',
) {
  return {
    Name: name,
    Labels: labels(resourceId, configurationHash, persistent, inventory, projectId),
  };
}

function labels(
  resourceId: string,
  configurationHash: string,
  persistent: boolean,
  inventory?: string,
  projectId = 'sample',
): Readonly<Record<string, string>> {
  return {
    [DOCKER_COMPOSE_LABELS.project]: projectId,
    [DOCKER_COMPOSE_LABELS.environment]: 'local',
    [DOCKER_COMPOSE_LABELS.adapter]: 'docker-compose',
    [DOCKER_COMPOSE_LABELS.resourceId]: resourceId,
    [DOCKER_COMPOSE_LABELS.configurationHash]: configurationHash,
    [DOCKER_COMPOSE_LABELS.persistent]: String(persistent),
    [DOCKER_COMPOSE_LABELS.retention]: 'delete-on-destroy',
    [DOCKER_COMPOSE_LABELS.dependencies]: '[]',
    ...(inventory === undefined ? {} : { [DOCKER_COMPOSE_LABELS.inventory]: inventory }),
  };
}
