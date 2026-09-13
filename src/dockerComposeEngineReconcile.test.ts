import { expect, it } from 'bun:test';

import { reconcileDockerComposeProjectAsync } from './features/compose-runtime/adapters/reconcileDockerComposeProjectAsync';
import type {
  DockerComposeCommandRequest,
  DockerComposeCommandResult,
  DockerComposeCommandRunner,
  DockerComposeExecutionProject,
} from './index';

it('reconciles Compose input through stdin and then re-inspects exact owned state', async () => {
  const runner = new RecordingRunner([
    success(''),
    success(''),
    success(''),
    success(''),
    success(''),
    success(''),
    success(''),
  ]);
  const result = await reconcileDockerComposeProjectAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    createProject(),
    [],
  );

  expect(result).toEqual({
    ok: true,
    value: { state: 'absent', resources: [] },
    diagnostics: [],
  });
  const command = runner.requests.find(({ arguments: arguments_ }) =>
    arguments_.includes('compose'),
  );
  expect(command?.arguments).toEqual([
    'compose',
    '--project-name',
    'sample-local',
    '--file',
    '-',
    'up',
    '--detach',
    '--remove-orphans',
  ]);
  expect(command?.stdin).toContain('sample-local_default');
});

function createProject(): DockerComposeExecutionProject {
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

class RecordingRunner implements DockerComposeCommandRunner {
  readonly requests: DockerComposeCommandRequest[] = [];

  constructor(private readonly responses: DockerComposeCommandResult[]) {}

  runAsync(request: DockerComposeCommandRequest): Promise<DockerComposeCommandResult> {
    this.requests.push(request);
    const response = this.responses.shift();
    if (response === undefined) throw new Error('Missing Docker command fixture response.');
    return Promise.resolve(response);
  }
}

function success(stdout: string): DockerComposeCommandResult {
  return { exitCode: 0, stdout, stderr: '' };
}
