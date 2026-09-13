import type { InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeProjectIdentity,
  DockerComposeProjectObservation,
  DockerComposeResourceObservation,
} from '../../../types/dockerComposeRuntime';
import { DOCKER_COMPOSE_LABELS } from '../utils/dockerComposeLabels';
import {
  getString,
  getValue,
  isRecord,
  isUnknownArray,
  optionalNumber,
  optionalRecord,
  optionalString,
  optionalStringRecord,
  parseDockerDocument,
  requireRecord,
  requireString,
} from '../utils/dockerJson';
import { mergeDockerComposeServiceReplicas } from '../utils/mergeDockerComposeServiceReplicas';
import {
  type DockerComposeInventoryEntry,
  type DockerComposeInventoryPort,
  parseDockerComposeInventory,
} from '../utils/parseDockerComposeInventory';

interface DockerComposeInspectionInput {
  readonly identity: DockerComposeProjectIdentity;
  readonly containers: string;
  readonly networks: string;
  readonly volumes: string;
  readonly endpointHost: string;
}

interface InspectedResource {
  readonly kind: 'network' | 'volume' | 'service';
  readonly value: Readonly<Record<string, unknown>>;
  readonly labels: Readonly<Record<string, string>>;
}

/*** Parse Docker inspect responses into exact owned, provider-neutral project observations. */
export function parseDockerComposeInspection(
  input: DockerComposeInspectionInput,
): InfraResult<DockerComposeProjectObservation> {
  try {
    const inspected = readInspectedResources(input);
    const owned = inspected.filter(({ labels }) => isOwned(labels, input.identity));
    const inventory = parseDockerComposeInventory(
      owned.filter(({ kind }) => kind === 'service').map(({ labels }) => labels),
      owned.map(({ labels }) => labels),
    );
    const carrierAvailable = owned.some(({ kind }) => kind === 'network' || kind === 'service');
    const actual = readActualResources(owned, inventory, carrierAvailable, input.endpointHost);
    const resources = mergeInventory(inventory, actual, carrierAvailable);
    return {
      ok: true,
      value: { state: aggregateState(resources), resources },
      diagnostics: [],
    };
  } catch {
    return {
      ok: false,
      diagnostics: [
        {
          severity: 'error',
          code: 'docker-compose-inspection-invalid',
          message: 'Docker returned invalid or conflicting owned Compose metadata.',
        },
      ],
    };
  }
}

function readInspectedResources(input: DockerComposeInspectionInput): readonly InspectedResource[] {
  return [
    ...parseDockerDocument(input.networks).map((value) => inspectedResource('network', value)),
    ...parseDockerDocument(input.volumes).map((value) => inspectedResource('volume', value)),
    ...parseDockerDocument(input.containers).map((value) => inspectedResource('service', value)),
  ];
}

function inspectedResource(
  kind: InspectedResource['kind'],
  value: Readonly<Record<string, unknown>>,
): InspectedResource {
  const labels =
    kind === 'service'
      ? optionalStringRecord(optionalRecord(value, 'Config'), 'Labels')
      : optionalStringRecord(value, 'Labels');
  return { kind, value, labels: labels ?? {} };
}

function readActualResources(
  resources: readonly InspectedResource[],
  inventory: readonly DockerComposeInventoryEntry[],
  carrierAvailable: boolean,
  endpointHost: string,
): ReadonlyMap<string, DockerComposeResourceObservation> {
  const byId = new Map<string, DockerComposeResourceObservation>();
  const inventoryById = new Map(inventory.map((entry) => [entry.resourceId, entry]));
  for (const resource of resources) {
    const observation = observeActualResource(
      resource,
      inventoryById.get(requireLabel(resource.labels, DOCKER_COMPOSE_LABELS.resourceId)),
      carrierAvailable,
      endpointHost,
    );
    const existing = byId.get(observation.resourceId);
    if (existing === undefined) byId.set(observation.resourceId, observation);
    else if (resource.kind === 'service' && observation.resourceId.startsWith('service:')) {
      byId.set(observation.resourceId, mergeDockerComposeServiceReplicas(existing, observation));
    } else throw new Error('Duplicate owned Docker resource.');
  }
  return byId;
}

function observeActualResource(
  resource: InspectedResource,
  inventory: DockerComposeInventoryEntry | undefined,
  carrierAvailable: boolean,
  endpointHost: string,
): DockerComposeResourceObservation {
  const metadata = readLabelMetadata(resource.labels);
  const state =
    resource.kind === 'service'
      ? readContainerState(resource.value)
      : resource.kind === 'volume' && metadata.persistent && !carrierAvailable
        ? 'retained'
        : 'ready';
  const publicOutputs =
    resource.kind === 'service' && inventory !== undefined
      ? readPublicOutputs(resource.value, inventory.publicPorts, endpointHost)
      : undefined;
  return {
    ...metadata,
    state,
    externalId:
      resource.kind === 'service' && inventory !== undefined
        ? inventory.externalId
        : readExternalId(resource.value),
    ...(publicOutputs === undefined ? {} : { publicOutputs }),
    ...(resource.kind === 'service' ? { detail: `Docker container state: ${state}.` } : {}),
  };
}

function mergeInventory(
  inventory: readonly DockerComposeInventoryEntry[],
  actual: ReadonlyMap<string, DockerComposeResourceObservation>,
  carrierAvailable: boolean,
): readonly DockerComposeResourceObservation[] {
  const merged = inventory.map((entry) => {
    const observed = actual.get(entry.resourceId);
    if (observed !== undefined) return observed;
    return {
      resourceId: entry.resourceId,
      state:
        entry.kind === 'config' || entry.kind === 'secret'
          ? carrierAvailable
            ? 'ready'
            : 'absent'
          : 'absent',
      configurationHash: entry.configurationHash,
      persistent: entry.persistent,
      retention: entry.retention,
      dependsOnResourceIds: entry.dependsOnResourceIds,
      externalId: entry.externalId,
    } satisfies DockerComposeResourceObservation;
  });
  for (const observation of actual.values()) {
    if (!inventory.some(({ resourceId }) => resourceId === observation.resourceId)) {
      merged.push(observation);
    }
  }
  return merged.sort(({ resourceId: left }, { resourceId: right }) => left.localeCompare(right));
}

function readLabelMetadata(
  labels: Readonly<Record<string, string>>,
): Omit<DockerComposeResourceObservation, 'state' | 'externalId' | 'publicOutputs' | 'detail'> {
  const persistent = requireLabel(labels, DOCKER_COMPOSE_LABELS.persistent);
  const retention = requireLabel(labels, DOCKER_COMPOSE_LABELS.retention);
  return {
    resourceId: requireLabel(labels, DOCKER_COMPOSE_LABELS.resourceId),
    configurationHash: requireLabel(labels, DOCKER_COMPOSE_LABELS.configurationHash),
    persistent: persistent === 'true' ? true : persistent === 'false' ? false : invalidBoolean(),
    retention:
      retention === 'retain' || retention === 'delete-on-destroy' ? retention : invalidRetention(),
    dependsOnResourceIds: parseStringArray(
      requireLabel(labels, DOCKER_COMPOSE_LABELS.dependencies),
    ),
  };
}

function readContainerState(
  container: Readonly<Record<string, unknown>>,
): DockerComposeResourceObservation['state'] {
  const state = requireRecord(getValue(container, 'State'));
  const status = requireString(state, 'Status');
  const health = optionalRecord(state, 'Health');
  const healthStatus = optionalString(health, 'Status');
  if (status === 'running') {
    if (healthStatus === 'unhealthy') return 'failed';
    return healthStatus === undefined || healthStatus === 'healthy' ? 'ready' : 'pending';
  }
  if (status === 'created' || status === 'restarting') return 'pending';
  if (status === 'paused' || (status === 'exited' && optionalNumber(state, 'ExitCode') === 0)) {
    return 'stopped';
  }
  return status === 'dead' || status === 'exited' ? 'failed' : 'unknown';
}

function readPublicOutputs(
  container: Readonly<Record<string, unknown>>,
  ports: readonly DockerComposeInventoryPort[],
  endpointHost: string,
): Readonly<Record<string, string | number>> | undefined {
  const network = optionalRecord(container, 'NetworkSettings');
  const bindings = optionalRecord(network, 'Ports');
  const output: Record<string, string | number> = {};
  for (const port of ports) {
    const value = getValue(bindings, `${port.target}/${port.protocol}`);
    if (!isUnknownArray(value)) continue;
    const first = value.at(0);
    if (!isRecord(first)) continue;
    const hostPort = Number(optionalString(first, 'HostPort'));
    if (!Number.isInteger(hostPort) || hostPort < 1 || hostPort > 65_535) continue;
    output[`${port.name}Port`] = hostPort;
    if (output.endpoint === undefined) {
      const scheme = port.name === 'http' || port.name === 'https' ? port.name : port.protocol;
      output.endpoint = `${scheme}://${endpointHost}:${hostPort}`;
    }
  }
  return Object.keys(output).length === 0 ? undefined : output;
}

function aggregateState(
  resources: readonly DockerComposeResourceObservation[],
): DockerComposeProjectObservation['state'] {
  const states = resources.map(({ state }) => state);
  if (states.length === 0 || states.every((state) => state === 'absent')) return 'absent';
  if (states.includes('failed')) return 'failed';
  if (states.includes('pending')) return 'pending';
  if (states.includes('degraded')) return 'degraded';
  if (states.includes('unknown')) return 'unknown';
  const services = resources.filter(({ resourceId }) => resourceId.startsWith('service:'));
  if (services.length > 0 && services.every(({ state }) => state === 'stopped')) return 'stopped';
  if (states.every((state) => state === 'retained')) return 'retained';
  return 'ready';
}

function isOwned(
  labels: Readonly<Record<string, string>>,
  identity: DockerComposeProjectIdentity,
): boolean {
  return (
    getString(labels, DOCKER_COMPOSE_LABELS.project) === identity.projectId &&
    getString(labels, DOCKER_COMPOSE_LABELS.environment) === identity.environment &&
    getString(labels, DOCKER_COMPOSE_LABELS.adapter) === 'docker-compose'
  );
}

function readExternalId(value: Readonly<Record<string, unknown>>): string {
  return requireString(value, 'Name').replace(/^\/+/, '');
}

function requireLabel(labels: Readonly<Record<string, string>>, name: string): string {
  const value = getString(labels, name);
  if (value === undefined || value.length === 0)
    throw new Error('Missing Compose ownership label.');
  return value;
}

function parseStringArray(value: string): readonly string[] {
  const parsed: unknown = JSON.parse(value);
  if (!isUnknownArray(parsed) || !parsed.every((entry) => typeof entry === 'string')) {
    throw new Error('Invalid Compose dependency labels.');
  }
  return parsed;
}

function invalidBoolean(): never {
  throw new Error('Invalid Compose boolean label.');
}

function invalidRetention(): never {
  throw new Error('Invalid Compose retention label.');
}
