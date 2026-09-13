import type {
  InfraExecutionContext,
  InfraOutput,
  InfraResult,
  InfraWorkloadSpec,
} from '@ankhorage/contracts/infra';

import type {
  DockerComposeConfig,
  DockerComposeNetwork,
  DockerComposeProjectIdentity,
  DockerComposeSecret,
  DockerComposeService,
  DockerComposeVolume,
} from '../../../types/dockerComposeRuntime';
import {
  createDockerComposeConfig,
  createDockerComposeOwner,
  createDockerComposeSecret,
  createDockerComposeVolume,
  getDockerComposeVolumeName,
  hashDockerComposeResource,
} from '../utils/dockerComposeResourceFactories';
import { toComposeName } from '../utils/getDockerComposeProjectIdentity';
import { resolveDockerComposeValue } from './resolveDockerComposeValue';

interface WorkloadProjectionRequest {
  readonly context: InfraExecutionContext;
  readonly outputs: readonly InfraOutput[];
  readonly identity: DockerComposeProjectIdentity;
  readonly network: DockerComposeNetwork;
  readonly workload: InfraWorkloadSpec;
}

interface WorkloadProjection {
  readonly volumes: readonly DockerComposeVolume[];
  readonly configs: readonly DockerComposeConfig[];
  readonly secrets: readonly DockerComposeSecret[];
  readonly service: DockerComposeService;
}

interface EnvironmentProjection {
  readonly values: Readonly<Record<string, string>>;
  readonly bindings: Readonly<Record<string, string>>;
  readonly secrets: readonly DockerComposeSecret[];
}

interface FileProjection {
  readonly configs: readonly DockerComposeConfig[];
  readonly secrets: readonly DockerComposeSecret[];
  readonly configMounts: DockerComposeService['configMounts'];
  readonly secretMounts: DockerComposeService['secretMounts'];
}

/*** Project one portable workload without materializing privileged values. */
export function projectDockerComposeWorkload(
  request: WorkloadProjectionRequest,
): InfraResult<WorkloadProjection> {
  const { context, identity, network, workload } = request;
  const volumes = (workload.persistence ?? []).map((volume) =>
    createDockerComposeVolume(context, identity, workload.id, volume),
  );
  const environment = projectEnvironment(request);
  if (!environment.ok) return environment;
  const files = projectFiles(request);
  if (!files.ok) return files;
  const supportingOwners = [
    network.owner,
    ...volumes.map(({ owner }) => owner),
    ...files.value.configs.map(({ owner }) => owner),
    ...environment.value.secrets.map(({ owner }) => owner),
    ...files.value.secrets.map(({ owner }) => owner),
  ];
  const workloadOwners = (workload.dependsOn ?? []).map((id) =>
    createDockerComposeOwner(context, `service:${id}`, false, 'delete-on-destroy', []),
  );
  const owner = createDockerComposeOwner(
    context,
    `service:${workload.id}`,
    false,
    'delete-on-destroy',
    [...supportingOwners, ...workloadOwners],
  );
  return {
    ok: true,
    value: {
      volumes,
      configs: files.value.configs,
      secrets: [...environment.value.secrets, ...files.value.secrets],
      service: createService(request, owner, environment.value, files.value),
    },
    diagnostics: [],
  };
}

function projectEnvironment(
  request: WorkloadProjectionRequest,
): InfraResult<EnvironmentProjection> {
  const values: Record<string, string> = {};
  const bindings: Record<string, string> = {};
  const secrets: DockerComposeSecret[] = [];
  const entries = Object.entries(request.workload.environment ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  for (const [index, [name, value]] of entries.entries()) {
    const resolved = resolveDockerComposeValue(
      request.outputs,
      value,
      request.workload.id,
      `environment ${name}`,
    );
    if (!resolved.ok) return resolved;
    if (resolved.value.kind === 'public') Object.assign(values, { [name]: resolved.value.value });
    else {
      const secret = createDockerComposeSecret(
        request.context,
        request.identity,
        request.workload.id,
        `env-${index}`,
        resolved.value.segments,
        { kind: 'environment', name },
      );
      secrets.push(secret);
      Object.assign(bindings, { [name]: secret.name });
    }
  }
  return { ok: true, value: { values, bindings, secrets }, diagnostics: [] };
}

function projectFiles(request: WorkloadProjectionRequest): InfraResult<FileProjection> {
  const configs: DockerComposeConfig[] = [];
  const secrets: DockerComposeSecret[] = [];
  const configMounts: { source: string; target: string }[] = [];
  const secretMounts: { source: string; target: string }[] = [];
  for (const [index, file] of (request.workload.files ?? []).entries()) {
    const resolved = resolveDockerComposeValue(
      request.outputs,
      file.content,
      request.workload.id,
      `file ${file.path}`,
    );
    if (!resolved.ok) return resolved;
    if (resolved.value.kind === 'public') {
      const config = createDockerComposeConfig(
        request.context,
        request.identity,
        request.workload.id,
        index,
        file.path,
        resolved.value.value,
      );
      configs.push(config);
      configMounts.push({ source: config.name, target: file.path });
    } else {
      const secret = createDockerComposeSecret(
        request.context,
        request.identity,
        request.workload.id,
        `file-${index}`,
        resolved.value.segments,
        { kind: 'file', path: file.path },
      );
      secrets.push(secret);
      secretMounts.push({ source: secret.name, target: file.path });
    }
  }
  return { ok: true, value: { configs, secrets, configMounts, secretMounts }, diagnostics: [] };
}

function createService(
  request: WorkloadProjectionRequest,
  owner: DockerComposeService['owner'],
  environment: EnvironmentProjection,
  files: FileProjection,
): DockerComposeService {
  const { identity, workload } = request;
  const spec = {
    kind: 'service' as const,
    owner,
    name: toComposeName(workload.id),
    image: workload.artifact.image,
    ...(workload.command === undefined ? {} : { command: workload.command }),
    ...(workload.args === undefined ? {} : { args: workload.args }),
    environment: environment.values,
    secretEnvironment: environment.bindings,
    configMounts: files.configMounts,
    secretMounts: files.secretMounts,
    volumes: (workload.persistence ?? []).map((volume) => ({
      source: getDockerComposeVolumeName(identity, workload.id, volume.id),
      target: volume.mountPath,
    })),
    ports: (workload.ports ?? []).map((port) => ({
      name: port.name,
      target: port.port,
      protocol: port.protocol ?? 'tcp',
      published: workload.exposure === 'public',
    })),
    ...(workload.health === undefined ? {} : { health: workload.health }),
    ...(workload.resources === undefined ? {} : { resources: workload.resources }),
    replicas: workload.replicas ?? 1,
  };
  return { ...spec, configurationHash: hashDockerComposeResource(spec) };
}
