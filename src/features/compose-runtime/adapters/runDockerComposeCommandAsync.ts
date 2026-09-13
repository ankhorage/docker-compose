import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeEngineSession } from '../../../types/dockerComposeProcess';

interface DockerComposeEngineCommand {
  readonly arguments: readonly string[];
  readonly stdin?: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly failureCode: string;
  readonly failureMessage: string;
}

/*** Run one Docker command and reduce all provider/process failures to a safe canonical diagnostic. */
export async function runDockerComposeCommandAsync(
  session: DockerComposeEngineSession,
  command: DockerComposeEngineCommand,
): Promise<InfraResult<string>> {
  try {
    const environment = { ...session.environment, ...command.environment };
    const result = await session.runner.runAsync({
      executable: session.executable,
      arguments: command.arguments,
      ...(command.stdin === undefined ? {} : { stdin: command.stdin }),
      ...(Object.keys(environment).length === 0 ? {} : { environment }),
      ...(command.signal === undefined ? {} : { signal: command.signal }),
    });
    return result.exitCode === 0
      ? { ok: true, value: result.stdout, diagnostics: [] }
      : failure(command.failureCode, command.failureMessage);
  } catch {
    return failure(command.failureCode, command.failureMessage);
  }
}

function failure(code: string, message: string): InfraResult<never> {
  return { ok: false, diagnostics: [{ severity: 'error', code, message }] };
}
