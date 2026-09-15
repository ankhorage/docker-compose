import type { DockerComposeCliInput } from '../../../types/dockerComposeProcess';
import type {
  DockerComposeExecutionProject,
  DockerComposeMaterializedSecret,
  DockerComposeResource,
  DockerComposeService,
} from '../../../types/dockerComposeRuntime';
import { DOCKER_COMPOSE_LABELS } from '../utils/dockerComposeLabels';
import { toComposeName } from '../utils/getDockerComposeProjectIdentity';

type DockerComposeCliResource = DockerComposeResource | DockerComposeMaterializedSecret;
interface SecretBinding {
  readonly environmentName: string;
  readonly value: string;
}

/*** Render deterministic Compose JSON without copying resolved secret values into the document. */
export function renderDockerComposeCliInput(
  project: DockerComposeExecutionProject,
): DockerComposeCliInput {
  const resources = getResources(project);
  const secretBindings = createSecretBindings(project);
  const environment = Object.fromEntries(
    [...secretBindings.values()].map(({ environmentName, value }) => [environmentName, value]),
  );
  const inventory = JSON.stringify(resources.map(toInventoryEntry));
  return {
    document: JSON.stringify(createDocument(project, secretBindings, inventory)),
    environment,
  };
}

function createDocument(
  project: DockerComposeExecutionProject,
  secretBindings: ReadonlyMap<string, SecretBinding>,
  inventory: string,
): Readonly<Record<string, unknown>> {
  return {
    name: project.identity.projectName,
    services: Object.fromEntries(
      project.services.map((service) => [
        service.name,
        renderService(service, project.services, secretBindings, inventory),
      ]),
    ),
    networks: {
      default: {
        name: project.network.name,
        labels: {
          ...resourceLabels(project.network),
          [DOCKER_COMPOSE_LABELS.inventory]: inventory,
        },
      },
    },
    volumes: Object.fromEntries(
      project.volumes.map((volume) => [
        volume.name,
        { name: volume.name, labels: resourceLabels(volume) },
      ]),
    ),
    configs: Object.fromEntries(
      project.configs.map((config) => [
        config.name,
        { content: escapeComposeInterpolation(config.content) },
      ]),
    ),
    secrets: Object.fromEntries(
      project.secrets
        .filter(({ target }) => target.kind === 'file')
        .map((secret) => [
          secret.name,
          { environment: requireSecretBinding(secretBindings, secret.name).environmentName },
        ]),
    ),
  };
}

function createSecretBindings(
  project: DockerComposeExecutionProject,
): ReadonlyMap<string, SecretBinding> {
  return new Map(
    project.secrets.map((secret, index) => [
      secret.name,
      { environmentName: `ANKHORAGE_COMPOSE_SECRET_${index}`, value: secret.value },
    ]),
  );
}

function renderService(
  service: DockerComposeService,
  services: readonly DockerComposeService[],
  secretBindings: ReadonlyMap<string, SecretBinding>,
  inventory: string,
): Readonly<Record<string, unknown>> {
  return {
    image: service.image,
    ...(service.command === undefined ? {} : { entrypoint: [...service.command] }),
    ...(service.args === undefined ? {} : { command: [...service.args] }),
    environment: renderEnvironment(service, secretBindings),
    networks: ['default'],
    labels: { ...resourceLabels(service), [DOCKER_COMPOSE_LABELS.inventory]: inventory },
    ...renderMounts(service),
    ...renderPorts(service),
    ...renderDependencies(service, services),
    ...(service.health === undefined ? {} : { healthcheck: renderHealthcheck(service.health) }),
    deploy: renderDeploy(service),
  };
}

function renderEnvironment(
  service: DockerComposeService,
  secretBindings: ReadonlyMap<string, SecretBinding>,
): Readonly<Record<string, string>> {
  return {
    ...service.environment,
    ...Object.fromEntries(
      Object.entries(service.secretEnvironment).map(([name, secretName]) => [
        name,
        `\${${requireSecretBinding(secretBindings, secretName).environmentName}:?}`,
      ]),
    ),
  };
}

function renderMounts(service: DockerComposeService): Readonly<Record<string, unknown>> {
  return {
    ...(service.configMounts.length === 0
      ? {}
      : { configs: service.configMounts.map(({ source, target }) => ({ source, target })) }),
    ...(service.secretMounts.length === 0
      ? {}
      : { secrets: service.secretMounts.map(({ source, target }) => ({ source, target })) }),
    ...(service.volumes.length === 0
      ? {}
      : {
          volumes: service.volumes.map(({ source, target }) => ({
            type: 'volume',
            source,
            target,
          })),
        }),
  };
}

function renderPorts(service: DockerComposeService): Readonly<Record<string, unknown>> {
  const published = service.ports
    .filter((port) => port.published)
    .map(({ target, protocol, publishedPort }) => ({
      target,
      published: String(publishedPort ?? 0),
      protocol,
      mode: 'host',
    }));
  const exposed = service.ports
    .filter((port) => !port.published)
    .map(({ target, protocol }) => `${target}/${protocol}`);
  return {
    ...(published.length === 0 ? {} : { ports: published }),
    ...(exposed.length === 0 ? {} : { expose: exposed }),
  };
}

function renderDependencies(
  service: DockerComposeService,
  services: readonly DockerComposeService[],
): Readonly<Record<string, unknown>> {
  const dependencies = service.owner.dependsOn
    .map(({ resourceId }) => resourceId)
    .filter((resourceId) => resourceId.startsWith('service:'))
    .map((resourceId) => {
      const dependency = services.find(({ owner }) => owner.identity.resourceId === resourceId);
      return {
        name: toComposeName(resourceId.slice('service:'.length)),
        condition: dependency?.health === undefined ? 'service_started' : 'service_healthy',
      } as const;
    })
    .sort(({ name: left }, { name: right }) => left.localeCompare(right));
  return dependencies.length === 0
    ? {}
    : {
        depends_on: Object.fromEntries(
          dependencies.map(({ name, condition }) => [name, { condition }]),
        ),
      };
}

function renderDeploy(service: DockerComposeService): Readonly<Record<string, unknown>> {
  const { resources } = service;
  return {
    replicas: service.replicas,
    ...(resources === undefined
      ? {}
      : {
          resources: {
            limits: {
              ...(resources.cpuMillis === undefined
                ? {}
                : { cpus: String(resources.cpuMillis / 1_000) }),
              ...(resources.memoryMiB === undefined ? {} : { memory: `${resources.memoryMiB}M` }),
            },
          },
        }),
  };
}

function renderHealthcheck(
  health: NonNullable<DockerComposeService['health']>,
): Readonly<Record<string, unknown>> {
  const test =
    health.kind === 'command'
      ? ['CMD', ...health.command]
      : health.kind === 'http'
        ? [
            'CMD-SHELL',
            `wget --quiet --tries=1 --spider ${quoteShell(`http://127.0.0.1:${health.port}${health.path}`)}`,
          ]
        : ['CMD-SHELL', `nc -z 127.0.0.1 ${health.port}`];
  return {
    test,
    ...(health.intervalSeconds === undefined ? {} : { interval: `${health.intervalSeconds}s` }),
    ...(health.timeoutSeconds === undefined ? {} : { timeout: `${health.timeoutSeconds}s` }),
    ...(health.failureThreshold === undefined ? {} : { retries: health.failureThreshold }),
  };
}

function resourceLabels(resource: DockerComposeCliResource): Readonly<Record<string, string>> {
  return {
    [DOCKER_COMPOSE_LABELS.project]: resource.owner.identity.projectId,
    [DOCKER_COMPOSE_LABELS.environment]: resource.owner.identity.environment,
    [DOCKER_COMPOSE_LABELS.adapter]: resource.owner.identity.adapter,
    [DOCKER_COMPOSE_LABELS.resourceId]: resource.owner.identity.resourceId,
    [DOCKER_COMPOSE_LABELS.configurationHash]: resource.configurationHash,
    [DOCKER_COMPOSE_LABELS.persistent]: String(resource.owner.persistent),
    [DOCKER_COMPOSE_LABELS.retention]: resource.owner.retention,
    [DOCKER_COMPOSE_LABELS.dependencies]: JSON.stringify(
      resource.owner.dependsOn.map(({ resourceId }) => resourceId).sort(),
    ),
  };
}

function toInventoryEntry(resource: DockerComposeCliResource): Readonly<Record<string, unknown>> {
  return {
    kind: resource.kind,
    resourceId: resource.owner.identity.resourceId,
    configurationHash: resource.configurationHash,
    persistent: resource.owner.persistent,
    retention: resource.owner.retention,
    dependsOnResourceIds: resource.owner.dependsOn.map(({ resourceId }) => resourceId).sort(),
    externalId: resource.name,
    ...(resource.kind === 'service'
      ? {
          publicPorts: resource.ports
            .filter(({ published }) => published)
            .map(({ name, target, protocol }) => ({ name, target, protocol })),
        }
      : {}),
  };
}

function getResources(project: DockerComposeExecutionProject): readonly DockerComposeCliResource[] {
  return [
    project.network,
    ...project.volumes,
    ...project.configs,
    ...project.secrets,
    ...project.services,
  ];
}

function requireSecretBinding(
  bindings: ReadonlyMap<string, SecretBinding>,
  name: string,
): SecretBinding {
  const binding = bindings.get(name);
  if (binding === undefined) throw new Error('Docker Compose secret binding is missing.');
  return binding;
}

/*** Escape literal dollar signs so Compose interpolation preserves config payload bytes. */
function escapeComposeInterpolation(value: string): string {
  return value.replaceAll('$', () => '$$');
}

function quoteShell(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}
