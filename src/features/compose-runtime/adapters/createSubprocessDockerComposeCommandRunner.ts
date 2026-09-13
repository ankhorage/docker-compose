import { spawn } from 'node:child_process';

import type {
  DockerComposeCommandRequest,
  DockerComposeCommandResult,
  DockerComposeCommandRunner,
} from '../../../types/dockerComposeProcess';

/*** Create the concrete shell-free subprocess boundary used by Docker Compose operations. */
export function createSubprocessDockerComposeCommandRunner(): DockerComposeCommandRunner {
  return { runAsync };
}

/*** Execute one argv-safe command while keeping stdin and execution-only environment values private. */
function runAsync(request: DockerComposeCommandRequest): Promise<DockerComposeCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(request.executable, [...request.arguments], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env:
        request.environment === undefined
          ? process.env
          : { ...process.env, ...request.environment },
      ...(request.signal === undefined ? {} : { signal: request.signal }),
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.once('error', reject);
    child.once('close', (exitCode) =>
      resolve({
        exitCode: exitCode ?? 1,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      }),
    );
    child.stdin.end(request.stdin);
  });
}
