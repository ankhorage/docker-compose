import type {
  InfraDestroyRequest,
  InfraExecutionContext,
  InfraResourceIdentity,
  InfraRuntimeDesiredState,
  InfraWorkloadSpec,
} from '@ankhorage/contracts/infra';
import { expect, it } from 'bun:test';

import { createInfraAdapter, projectDockerComposeProject } from './index';
import { FakeDockerComposeControlPlane } from './runtimeFixtures.test';

it('plans and converges the complete portable Compose lifecycle', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const context = createContext('local');
  const desired = createDesired(false, false);

  const initial = await adapter.planAsync(context, desired);
  expect(initial.ok && initial.value.every(({ operation }) => operation === 'create')).toBe(true);
  const ensured = await adapter.ensureAsync(context, desired);
  expect(ensured.ok && ensured.value.outputs.some(({ name }) => name === 'endpoint')).toBe(true);
  const converged = await adapter.planAsync(context, desired);
  expect(converged.ok && converged.value.every(({ operation }) => operation === 'noop')).toBe(true);
  expect((await adapter.statusAsync(context, desired)).ok).toBe(true);
  expect((await adapter.suspendAsync(context, desired)).ok).toBe(true);
  expect(controlPlane.state).toBe('stopped');
  expect((await adapter.ensureAsync(context, desired)).ok).toBe(true);
  expect((await adapter.destroyAsync(context, desired, createDestroyRequest('local'))).ok).toBe(
    true,
  );
  expect(controlPlane.state).toBe('absent');
});

it('projects services, networks, volumes, configs and secret references without Kubernetes leakage', () => {
  const context = createContext('local');
  const desired = createDesired(true, true);
  const projected = projectDockerComposeProject(context, desired, {
    projectId: 'sample',
    environment: 'local',
    projectName: 'sample-local',
  });

  expect(projected.ok).toBe(true);
  if (!projected.ok) return;
  expect(projected.value.services).toHaveLength(1);
  expect(projected.value.volumes).toHaveLength(1);
  expect(projected.value.configs).toHaveLength(1);
  expect(projected.value.secrets).toHaveLength(2);
  expect(JSON.stringify(projected.value)).not.toContain('runtime-secret');
  expect(JSON.stringify(projected.value).toLowerCase()).not.toContain('kubernetes');
});

it('materializes secrets only across the reconcile boundary', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const result = await adapter.ensureAsync(createContext('local'), createDesired(false, true));

  expect(result.ok).toBe(true);
  expect(controlPlane.lastSecretValues).toEqual(['runtime-secret', 'runtime-secret']);
  expect(JSON.stringify(result)).not.toContain('runtime-secret');
});

it('materializes keyed bootstrap credentials only across the reconcile boundary', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const desired = createDesired(false, false);
  const [workload] = desired.workloads;
  if (workload === undefined) throw new Error('Invalid workload fixture.');
  const result = await adapter.ensureAsync(createContext('local'), {
    ...desired,
    workloads: [
      {
        ...workload,
        environment: {
          BOOTSTRAP_TOKEN: {
            kind: 'credential',
            reference: { source: 'control-plane', name: 'SERVICE_BOOTSTRAP' },
            key: 'token',
          },
        },
      },
    ],
  });

  expect(result.ok).toBe(true);
  expect(controlPlane.lastSecretValues).toEqual(['bootstrap-token']);
  expect(JSON.stringify(result)).not.toContain('bootstrap-token');
});

it('retains volumes by default and removes them only with resource-scoped confirmation', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const context = createContext('local');
  const desired = createDesired(true, false);
  const ensured = await adapter.ensureAsync(context, desired);
  expect(ensured.ok).toBe(true);
  if (!ensured.ok) return;
  const volume = ensured.value.resources.find(({ identity }) =>
    identity.resourceId.startsWith('volume:'),
  );
  expect(volume).toBeDefined();

  const retained = await adapter.destroyAsync(context, desired, createDestroyRequest('local'));
  expect(retained.ok && retained.value.resources).toHaveLength(1);
  expect(controlPlane.state).toBe('retained');
  const destroyed = await adapter.destroyAsync(
    context,
    desired,
    createDestroyRequest('local', volume?.identity),
  );
  expect(destroyed.ok && destroyed.value.resources).toHaveLength(0);
  expect(controlPlane.state).toBe('absent');
});

it('carries remote host verification and keeps SSH credentials out of results', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const result = await adapter.ensureAsync(createContext('production'), createRemoteDesired());

  expect(result.ok).toBe(true);
  expect(
    controlPlane.lastAccess?.transport.kind === 'ssh' &&
      controlPlane.lastAccess.transport.hostKeyFingerprint,
  ).toBe('SHA256:compose-host');
  expect(JSON.stringify(result)).not.toContain('ssh-private-key');
});

function createDesired(
  persistent: boolean,
  withSecrets: boolean,
): InfraRuntimeDesiredState<'docker-compose'> {
  const secret = {
    source: 'secret-store' as const,
    projectId: 'sample',
    environment: 'local' as const,
    ref: 'runtime',
    key: 'token',
  };
  const workload: InfraWorkloadSpec = {
    id: 'api',
    artifact: { kind: 'image', image: 'registry.example/api@sha256:abc' },
    ports: [{ name: 'http', port: 8080 }],
    exposure: 'public',
    environment: {
      MODE: { kind: 'literal', value: 'production' },
      ...(withSecrets ? { TOKEN: { kind: 'secret' as const, reference: secret } } : {}),
    },
    files: [
      { path: '/app/config.json', content: { kind: 'literal', value: '{}' } },
      ...(withSecrets
        ? [{ path: '/run/secrets/token', content: { kind: 'secret' as const, reference: secret } }]
        : []),
    ],
    ...(persistent
      ? {
          persistence: [
            { id: 'data', mountPath: '/data', sizeGiB: 1, retention: 'delete-on-destroy' },
          ],
        }
      : {}),
  };
  return {
    selection: { provider: 'docker-compose' },
    targets: [{ id: 'host', kind: 'local-host', os: 'linux', architecture: 'amd64' }],
    workloads: [workload],
    availableOutputs: [],
  };
}

function createRemoteDesired(): InfraRuntimeDesiredState<'docker-compose'> {
  return {
    ...createDesired(false, false),
    targets: [
      {
        id: 'compose-host',
        kind: 'ssh-host',
        os: 'linux',
        architecture: 'amd64',
        host: 'compose.example.test',
        port: 22,
        user: 'root',
        hostKeyFingerprint: 'SHA256:compose-host',
        credential: { source: 'control-plane', name: 'COMPOSE_SSH' },
      },
    ],
  };
}

function createContext(environment: 'local' | 'production'): InfraExecutionContext {
  return {
    projectId: 'sample',
    environment,
    desired: {
      deployment:
        environment === 'local'
          ? { compute: { provider: 'local' }, runtime: { provider: 'docker-compose' } }
          : {
              compute: { provider: 'hetzner', location: 'fsn1' },
              runtime: { provider: 'docker-compose' },
            },
      networking: { domain: 'api.sample.test' },
    },
    credentials: {
      resolveAsync: ({ name }) => {
        const value: Readonly<Record<string, string>> =
          name === 'SERVICE_BOOTSTRAP'
            ? { token: 'bootstrap-token' }
            : { privateKey: 'ssh-private-key' };
        return Promise.resolve({
          ok: true,
          value,
          diagnostics: [],
        });
      },
    },
    secrets: {
      resolveAsync: () => Promise.resolve({ ok: true, value: 'runtime-secret', diagnostics: [] }),
    },
  };
}

function createDestroyRequest(
  environment: 'local' | 'production',
  confirmedResource?: InfraResourceIdentity,
): InfraDestroyRequest {
  return {
    projectId: 'sample',
    environment,
    confirmation: { projectId: 'sample', environment },
    persistence:
      confirmedResource === undefined
        ? { policy: 'retain' }
        : { policy: 'delete', confirmedResources: [confirmedResource] },
  };
}
