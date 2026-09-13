import type { InfraResult } from '@ankhorage/contracts/infra';
import { expect, it } from 'bun:test';

import type {
  DockerComposeCommandRequest,
  DockerComposeCommandResult,
  DockerComposeCommandRunner,
  DockerComposeProject,
  DockerComposeSessionResolver,
  DockerComposeTargetAccess,
} from './index';
import {
  createDockerComposeCliControlPlane,
  createLocalDockerComposeSessionResolver,
} from './index';

const localAccess: DockerComposeTargetAccess = {
  target: { id: 'local', kind: 'local-host', os: 'linux', architecture: 'amd64' },
  transport: { kind: 'local' },
};

it('validates Docker and Compose through a freshly resolved engine session', async () => {
  const runner = new RecordingRunner();
  const resolver: DockerComposeSessionResolver = {
    resolveAsync: () => success({ runner, executable: 'docker', endpointHost: '127.0.0.1' }),
  };
  const result = await createDockerComposeCliControlPlane(resolver).validateAsync(
    createProject(),
    localAccess,
  );

  expect(result.ok).toBe(true);
  expect(runner.requests.map(({ arguments: arguments_ }) => arguments_)).toEqual([
    ['info'],
    ['compose', 'version'],
  ]);
});

it('requires an explicit host-key-verifying resolver for remote engines', async () => {
  const result = await createLocalDockerComposeSessionResolver().resolveAsync({
    target: {
      id: 'remote',
      kind: 'ssh-host',
      os: 'linux',
      architecture: 'amd64',
      host: '203.0.113.7',
      port: 22,
      user: 'root',
      credential: { source: 'control-plane', name: 'SSH' },
      hostKeyFingerprint: 'SHA256:host',
    },
    transport: {
      kind: 'ssh',
      host: '203.0.113.7',
      port: 22,
      user: 'root',
      credential: { privateKey: 'secret' },
      hostKeyFingerprint: 'SHA256:host',
    },
  });
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain('secret');
});

class RecordingRunner implements DockerComposeCommandRunner {
  readonly requests: DockerComposeCommandRequest[] = [];

  runAsync(request: DockerComposeCommandRequest): Promise<DockerComposeCommandResult> {
    this.requests.push(request);
    return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
  }
}

function createProject(): DockerComposeProject {
  return {
    identity: { projectId: 'sample', environment: 'local', projectName: 'sample-local' },
    network: {
      kind: 'network',
      owner: {
        identity: {
          projectId: 'sample',
          environment: 'local',
          adapter: 'docker-compose',
          resourceId: 'network:default',
        },
        persistent: false,
        retention: 'delete-on-destroy',
        dependsOn: [],
      },
      name: 'sample-local_default',
      configurationHash: 'network-hash',
    },
    volumes: [],
    configs: [],
    secrets: [],
    services: [],
  };
}

function success<T>(value: T): Promise<InfraResult<T>> {
  return Promise.resolve({ ok: true, value, diagnostics: [] });
}
