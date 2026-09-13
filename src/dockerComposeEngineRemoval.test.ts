import { expect, it } from 'bun:test';

import { removeDockerComposeResourcesAsync } from './features/compose-runtime/adapters/removeDockerComposeResourcesAsync';
import type {
  DockerComposeCommandRequest,
  DockerComposeCommandResult,
  DockerComposeCommandRunner,
} from './index';

const identity = {
  projectId: 'sample',
  environment: 'local' as const,
  projectName: 'sample-local',
};

it('removes exact owned engine resources in the requested order and skips logical resources', async () => {
  const runner = new RecordingRunner([
    success('container-a\ncontainer-b\n'),
    success(''),
    success('sample-local-data\n'),
    success(''),
  ]);
  const result = await removeDockerComposeResourcesAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
    ['service:api', 'config:api:0', 'secret:api:0', 'volume:api:data'],
  );

  expect(result.ok).toBe(true);
  expect(runner.requests.map(({ arguments: arguments_ }) => arguments_)).toEqual([
    listArguments('container', 'service:api', '{{.ID}}'),
    ['container', 'rm', '--force', '--', 'container-a', 'container-b'],
    listArguments('volume', 'volume:api:data', '{{.Name}}'),
    ['volume', 'rm', '--', 'sample-local-data'],
  ]);
});

it('rejects unknown resource IDs without executing a Docker command', async () => {
  const runner = new RecordingRunner([]);
  const result = await removeDockerComposeResourcesAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
    ['bucket:foreign'],
  );

  expect(result.ok).toBe(false);
  expect(runner.requests).toHaveLength(0);
});

function listArguments(kind: string, resourceId: string, format: string): readonly string[] {
  return [
    kind,
    'ls',
    ...(kind === 'container' ? ['--all'] : []),
    '--filter',
    'label=com.ankhorage.infra.project=sample',
    '--filter',
    'label=com.ankhorage.infra.environment=local',
    '--filter',
    'label=com.ankhorage.infra.adapter=docker-compose',
    '--filter',
    `label=com.ankhorage.infra.resource-id=${resourceId}`,
    '--format',
    format,
  ];
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
