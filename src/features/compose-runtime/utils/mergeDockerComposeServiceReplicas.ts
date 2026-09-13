import type { DockerComposeResourceObservation } from '../../../types/dockerComposeRuntime';

/** Aggregate several Docker containers into one logical Compose service observation. */
export function mergeDockerComposeServiceReplicas(
  left: DockerComposeResourceObservation,
  right: DockerComposeResourceObservation,
): DockerComposeResourceObservation {
  const state = aggregateReplicaState([left.state, right.state]);
  return {
    ...left,
    state,
    publicOutputs: mergePublicOutputs(left.publicOutputs, right.publicOutputs),
    detail: `Docker container state: ${state}.`,
  };
}

function aggregateReplicaState(
  states: readonly DockerComposeResourceObservation['state'][],
): DockerComposeResourceObservation['state'] {
  if (states.includes('failed')) return 'failed';
  if (states.includes('pending')) return 'pending';
  if (states.every((state) => state === 'ready')) return 'ready';
  if (states.every((state) => state === 'stopped')) return 'stopped';
  if (states.includes('ready') || states.includes('stopped')) return 'degraded';
  return 'unknown';
}

function mergePublicOutputs(
  left: DockerComposeResourceObservation['publicOutputs'],
  right: DockerComposeResourceObservation['publicOutputs'],
): DockerComposeResourceObservation['publicOutputs'] {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  if (keys.size === 0) return undefined;
  return Object.fromEntries(
    [...keys].sort().map((key) => {
      const values = [findOutput(left, key), findOutput(right, key)].filter(
        (value): value is string | number | boolean => value !== undefined,
      );
      return [key, [...values].sort((a, b) => String(a).localeCompare(String(b)))[0]];
    }),
  ) as Readonly<Record<string, string | number | boolean>>;
}

function findOutput(
  outputs: DockerComposeResourceObservation['publicOutputs'],
  key: string,
): string | number | boolean | undefined {
  return outputs === undefined
    ? undefined
    : Object.entries(outputs)
        .find(([name]) => name === key)
        ?.at(1);
}
