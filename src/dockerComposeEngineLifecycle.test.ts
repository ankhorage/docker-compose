import { expect, it } from 'bun:test';

import { stopDockerComposeProjectAsync } from './features/compose-runtime/adapters/stopDockerComposeProjectAsync';
import { waitForDockerComposeProjectAsync } from './features/compose-runtime/adapters/waitForDockerComposeProjectAsync';
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

it('stops only running containers carrying the exact ownership scope', async () => {
  const runner = new RecordingRunner([success('container-a\ncontainer-b\n'), success('')]);
  const result = await stopDockerComposeProjectAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
  );

  expect(result.ok).toBe(true);
  expect(runner.requests.at(-1)?.arguments).toEqual([
    'container',
    'stop',
    '--',
    'container-a',
    'container-b',
  ]);
});

it('returns a canonical timeout without leaking provider output', async () => {
  const runner = new RecordingRunner([success(''), success(''), success('')]);
  const result = await waitForDockerComposeProjectAsync(
    { runner, executable: 'docker', endpointHost: '127.0.0.1' },
    identity,
    undefined,
    0,
    0,
  );

  expect(result).toEqual({
    ok: false,
    diagnostics: [
      {
        severity: 'error',
        code: 'docker-compose-readiness-timeout',
        message: 'Docker Compose project readiness timeout.',
      },
    ],
  });
});

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
