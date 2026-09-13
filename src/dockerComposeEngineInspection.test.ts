import { expect, it } from 'bun:test';

import { inspectDockerComposeProjectAsync } from './features/compose-runtime/adapters/inspectDockerComposeProjectAsync';
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

it('lists and inspects only the exact ownership scope through argv-safe commands', async () => {
  const runner = new RecordingRunner([
    success('container-id\n'),
    success('network-id\n'),
    success('volume-name\n'),
    success('[]'),
    success('[]'),
    success('[]'),
  ]);
  const result = await inspectDockerComposeProjectAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
  );

  expect(result).toEqual({
    ok: true,
    value: { state: 'absent', resources: [] },
    diagnostics: [],
  });
  expect(runner.requests.slice(0, 3).map(({ arguments: arguments_ }) => arguments_)).toEqual([
    listArguments('container', '{{.ID}}'),
    listArguments('network', '{{.ID}}'),
    listArguments('volume', '{{.Name}}'),
  ]);
  expect(runner.requests.slice(3).map(({ arguments: arguments_ }) => arguments_)).toEqual([
    ['container', 'inspect', '--', 'container-id'],
    ['network', 'inspect', '--', 'network-id'],
    ['volume', 'inspect', '--', 'volume-name'],
  ]);
});

it('sanitizes Docker stderr and stops before inspect when listing fails', async () => {
  const runner = new RecordingRunner([
    { exitCode: 1, stdout: '', stderr: 'SENTINEL_DOCKER_ERROR' },
    success(''),
    success(''),
  ]);
  const result = await inspectDockerComposeProjectAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
  );

  expect(result).toEqual({
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-command-failed',
        message: 'Docker Compose resource inspection failed.',
      },
    ],
  });
  expect(JSON.stringify(result)).not.toContain('SENTINEL');
  expect(runner.requests).toHaveLength(3);
});

function listArguments(kind: string, format: string): readonly string[] {
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
