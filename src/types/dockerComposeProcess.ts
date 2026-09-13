import type { InfraResult } from '@ankhorage/contracts/infra';

import type { DockerComposeTargetAccess } from './dockerComposeRuntime';

/** One shell-free process invocation used by the Docker Compose CLI adapter. */
export interface DockerComposeCommandRequest {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly stdin?: string;
  /** Execution-only values. Callers must never copy this map into diagnostics or artifacts. */
  readonly environment?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

export interface DockerComposeCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/** Injectable process boundary for deterministic CLI tests. */
export interface DockerComposeCommandRunner {
  runAsync(request: DockerComposeCommandRequest): Promise<DockerComposeCommandResult>;
}

/** One resolved local or verified-SSH Docker engine execution session. */
export interface DockerComposeEngineSession {
  readonly runner: DockerComposeCommandRunner;
  readonly executable: string;
  readonly environment?: Readonly<Record<string, string>>;
  readonly endpointHost: string;
}

/** Resolve one local or verified remote Docker engine for a single stateless operation. */
export interface DockerComposeSessionResolver {
  resolveAsync(
    access: DockerComposeTargetAccess,
    signal?: AbortSignal,
  ): Promise<InfraResult<DockerComposeEngineSession>>;
}

/** Serialized Compose input and its execution-only interpolation environment. */
export interface DockerComposeCliInput {
  readonly document: string;
  readonly environment: Readonly<Record<string, string>>;
}
