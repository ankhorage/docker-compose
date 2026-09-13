import type {
  InfraExecutionContext,
  InfraRuntimeDesiredState,
  InfraWorkloadSpec,
} from '@ankhorage/contracts/infra';
import { expect, it } from 'bun:test';

import { createInfraAdapter } from './index';
import { FakeDockerComposeControlPlane } from './runtimeFixtures.test';

it('materializes privileged templates only at reconcile and keeps public templates public', async () => {
  const controlPlane = new FakeDockerComposeControlPlane();
  const adapter = createInfraAdapter({ controlPlane });
  const result = await adapter.ensureAsync(createContext(), createDesired());

  expect(result.ok).toBe(true);
  expect(controlPlane.lastSecretValues).toEqual([
    'postgres://postgres:runtime-secret@db:5432/postgres',
  ]);
  expect(controlPlane.lastEnvironmentValues.PUBLIC_URL).toBe('https://api.example.test/auth/v1');
  expect(JSON.stringify(result)).not.toContain('runtime-secret');
});

/*** Create desired state containing public and privileged ordered templates. */
function createDesired(): InfraRuntimeDesiredState<'docker-compose'> {
  const workload: InfraWorkloadSpec = {
    id: 'api',
    artifact: { kind: 'image', image: 'registry.example/api@sha256:abc' },
    environment: {
      PUBLIC_URL: {
        kind: 'template',
        segments: [
          { kind: 'literal', value: 'https://' },
          { kind: 'output', resourceId: 'service:gateway', output: 'host' },
          { kind: 'literal', value: '/auth/v1' },
        ],
      },
      DATABASE_URL: {
        kind: 'template',
        segments: [
          { kind: 'literal', value: 'postgres://postgres:' },
          { kind: 'secret', reference: createSecretReference() },
          { kind: 'literal', value: '@db:5432/postgres' },
        ],
      },
    },
  };
  return {
    selection: { provider: 'docker-compose' },
    targets: [{ id: 'host', kind: 'local-host', os: 'linux', architecture: 'amd64' }],
    workloads: [workload],
    availableOutputs: [
      {
        owner: {
          projectId: 'sample',
          environment: 'local',
          adapter: 'supabase',
          resourceId: 'service:gateway',
        },
        name: 'host',
        visibility: 'public',
        value: 'api.example.test',
      },
    ],
  };
}

/*** Create the execution context used only at the reconcile boundary. */
function createContext(): InfraExecutionContext {
  return {
    projectId: 'sample',
    environment: 'local',
    desired: {
      deployment: {
        compute: { provider: 'local' },
        runtime: { provider: 'docker-compose' },
      },
    },
    credentials: {
      resolveAsync: () => Promise.resolve({ ok: true, value: {}, diagnostics: [] }),
    },
    secrets: {
      resolveAsync: () => Promise.resolve({ ok: true, value: 'runtime-secret', diagnostics: [] }),
    },
  };
}

/*** Create one canonical secret reference. */
function createSecretReference() {
  return {
    source: 'secret-store' as const,
    projectId: 'sample',
    environment: 'local' as const,
    ref: 'runtime',
    key: 'token',
  };
}
