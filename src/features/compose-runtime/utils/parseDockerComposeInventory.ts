import { DOCKER_COMPOSE_LABELS } from './dockerComposeLabels';
import {
  getString,
  optionalArray,
  requireBoolean,
  requireNumber,
  requireRecord,
  requireString,
  requireStringArray,
} from './dockerJson';

type DockerResourceKind = 'network' | 'volume' | 'config' | 'secret' | 'service';

export interface DockerComposeInventoryPort {
  readonly name: string;
  readonly target: number;
  readonly protocol: 'tcp' | 'udp';
}

export interface DockerComposeInventoryEntry {
  readonly kind: DockerResourceKind;
  readonly resourceId: string;
  readonly configurationHash: string;
  readonly persistent: boolean;
  readonly retention: 'retain' | 'delete-on-destroy';
  readonly dependsOnResourceIds: readonly string[];
  readonly externalId: string;
  readonly publicPorts: readonly DockerComposeInventoryPort[];
}

/** Parse one consistent, secret-free inventory, preferring current service metadata. */
export function parseDockerComposeInventory(
  serviceLabels: readonly Readonly<Record<string, string>>[],
  allLabels: readonly Readonly<Record<string, string>>[],
): readonly DockerComposeInventoryEntry[] {
  const current = inventoryValues(serviceLabels);
  const values = current.length === 0 ? inventoryValues(allLabels) : current;
  if (values.length === 0) return [];
  if (new Set(values).size !== 1) throw new Error('Conflicting Compose inventories.');
  const parsed: unknown = JSON.parse(values[0] ?? '');
  if (!Array.isArray(parsed)) throw new Error('Invalid Compose inventory.');
  const entries = parsed.map(parseInventoryEntry);
  if (new Set(entries.map(({ resourceId }) => resourceId)).size !== entries.length) {
    throw new Error('Duplicate Compose inventory resources.');
  }
  return entries;
}

function inventoryValues(
  resources: readonly Readonly<Record<string, string>>[],
): readonly string[] {
  return resources
    .map((labels) => getString(labels, DOCKER_COMPOSE_LABELS.inventory))
    .filter((value): value is string => value !== undefined);
}

function parseInventoryEntry(value: unknown): DockerComposeInventoryEntry {
  const record = requireRecord(value);
  const kind = requireString(record, 'kind');
  const retention = requireString(record, 'retention');
  if (!isResourceKind(kind)) throw new Error('Invalid Compose resource kind.');
  if (retention !== 'retain' && retention !== 'delete-on-destroy') {
    throw new Error('Invalid Compose resource retention.');
  }
  return {
    kind,
    resourceId: requireString(record, 'resourceId'),
    configurationHash: requireString(record, 'configurationHash'),
    persistent: requireBoolean(record, 'persistent'),
    retention,
    dependsOnResourceIds: requireStringArray(record, 'dependsOnResourceIds'),
    externalId: requireString(record, 'externalId'),
    publicPorts: optionalArray(record, 'publicPorts').map(parseInventoryPort),
  };
}

function parseInventoryPort(value: unknown): DockerComposeInventoryPort {
  const record = requireRecord(value);
  const protocol = requireString(record, 'protocol');
  const target = requireNumber(record, 'target');
  if (protocol !== 'tcp' && protocol !== 'udp') throw new Error('Invalid Compose port protocol.');
  if (!Number.isInteger(target) || target < 1 || target > 65_535) {
    throw new Error('Invalid Compose port target.');
  }
  return { name: requireString(record, 'name'), target, protocol };
}

function isResourceKind(value: string): value is DockerResourceKind {
  return ['network', 'volume', 'config', 'secret', 'service'].includes(value);
}
