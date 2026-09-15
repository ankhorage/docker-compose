import { expect, it } from 'bun:test';

import { renderDockerComposeCliInput } from './features/compose-runtime/adapters/renderDockerComposeCliInput';
import type {
  DockerComposeConfig,
  DockerComposeExecutionProject,
  DockerComposeMaterializedSecret,
  DockerComposeService,
} from './index';
import { createSubprocessDockerComposeCommandRunner } from './index';

const configContent =
  'CREATE FUNCTION sample() RETURNS void AS $$ BEGIN RETURN; END; $$ LANGUAGE plpgsql;';
const escapedConfigContent =
  'CREATE FUNCTION sample() RETURNS void AS $$$$ BEGIN RETURN; END; $$$$ LANGUAGE plpgsql;';

it('renders deterministic Compose input while keeping secret payloads out of the document', () => {
  const input = renderDockerComposeCliInput(createExecutionProject());
  const parsed = JSON.parse(input.document) as {
    readonly services: Readonly<Record<string, Record<string, unknown>>>;
    readonly networks: Readonly<
      Record<string, { readonly labels: Readonly<Record<string, string>> }>
    >;
    readonly configs: Readonly<Record<string, { readonly content: string }>>;
    readonly secrets: Readonly<Record<string, { readonly environment: string }>>;
  };

  expect(input.document).not.toContain('SENTINEL_SECRET');
  expect(input.environment).toEqual({ ANKHORAGE_COMPOSE_SECRET_0: 'SENTINEL_SECRET' });
  expect(parsed.services.api?.environment).toEqual({
    MODE: 'production',
    TOKEN: '${ANKHORAGE_COMPOSE_SECRET_0:?}',
  });
  expect(parsed.services.api?.depends_on).toEqual({
    cache: { condition: 'service_started' },
    database: { condition: 'service_healthy' },
  });
  expect(parsed.configs['sample-api-config-0']?.content).toBe(escapedConfigContent);
  expect(parsed.secrets['sample-api-secret-file-0']).toEqual({
    environment: 'ANKHORAGE_COMPOSE_SECRET_0',
  });
  expect(parsed.services.api?.ports).toEqual([
    { target: 8080, published: '18080', protocol: 'tcp', mode: 'host' },
  ]);
  expect(parsed.networks.default?.labels['com.ankhorage.infra.inventory']).not.toContain(
    'SENTINEL_SECRET',
  );
  expect(
    (parsed.services.api?.labels as Readonly<Record<string, string>> | undefined)?.[
      'com.ankhorage.infra.inventory'
    ],
  ).not.toContain('SENTINEL_SECRET');
  expect(parsed.networks.default?.labels).toMatchObject({
    'com.ankhorage.infra.project': 'sample',
    'com.ankhorage.infra.environment': 'local',
    'com.ankhorage.infra.adapter': 'docker-compose',
    'com.ankhorage.infra.resource-id': 'network:default',
  });
});

it('produces input accepted by the real Docker Compose parser', async () => {
  const input = renderDockerComposeCliInput(createExecutionProject());
  const parsed = await createSubprocessDockerComposeCommandRunner().runAsync({
    executable: 'docker',
    arguments: ['compose', '-f', '-', 'config', '--quiet'],
    stdin: input.document,
    environment: input.environment,
  });

  expect(parsed.exitCode, parsed.stderr).toBe(0);
  expect(parsed.stdout).toBe('');
  expect(parsed.stderr).not.toContain('SENTINEL_SECRET');
});

it('preserves dollar signs in literal config content through Compose interpolation', async () => {
  const input = renderDockerComposeCliInput(createExecutionProject());
  const rendered = await createSubprocessDockerComposeCommandRunner().runAsync({
    executable: 'docker',
    arguments: ['compose', '-f', '-', 'config', '--format', 'json'],
    stdin: input.document,
    environment: input.environment,
  });

  expect(rendered.exitCode, rendered.stderr).toBe(0);
  const parsed = JSON.parse(rendered.stdout) as {
    readonly configs: Readonly<Record<string, { readonly content: string }>>;
  };
  expect(parsed.configs['sample-api-config-0']?.content).toBe(configContent);
});

function createExecutionProject(): DockerComposeExecutionProject {
  const identity = { projectId: 'sample', environment: 'local' as const, projectName: 'sample' };
  return {
    identity,
    network: {
      kind: 'network',
      owner: createOwner('network:default'),
      name: 'sample_default',
      configurationHash: 'network-hash',
    },
    volumes: [],
    configs: [createConfig()],
    secrets: [createSecret()],
    services: [
      createDependencyService('database', true),
      createDependencyService('cache'),
      createService(),
    ],
  };
}

function createOwner(resourceId: string, dependencies: readonly string[] = []) {
  return {
    identity: {
      projectId: 'sample',
      environment: 'local' as const,
      adapter: 'docker-compose' as const,
      resourceId,
    },
    persistent: false,
    retention: 'delete-on-destroy' as const,
    dependsOn: dependencies.map((dependency) => ({
      projectId: 'sample',
      environment: 'local' as const,
      adapter: 'docker-compose' as const,
      resourceId: dependency,
    })),
  };
}

function createConfig(): DockerComposeConfig {
  return {
    kind: 'config',
    owner: createOwner('config:api:0'),
    name: 'sample-api-config-0',
    content: configContent,
    configurationHash: 'config-hash',
  };
}

function createSecret(): DockerComposeMaterializedSecret {
  return {
    kind: 'secret',
    owner: createOwner('secret:api:file-0'),
    name: 'sample-api-secret-file-0',
    target: { kind: 'file', path: '/run/secrets/token' },
    configurationHash: 'secret-hash',
    value: 'SENTINEL_SECRET',
  };
}

function createDependencyService(name: string, healthy = false): DockerComposeService {
  return {
    kind: 'service',
    owner: createOwner(`service:${name}`, ['network:default']),
    name,
    image: `registry.example/${name}@sha256:abc`,
    environment: {},
    secretEnvironment: {},
    configMounts: [],
    secretMounts: [],
    volumes: [],
    ports: [],
    ...(healthy ? { health: { kind: 'command' as const, command: ['true'] } } : {}),
    replicas: 1,
    configurationHash: `${name}-hash`,
  };
}

function createService(): DockerComposeService {
  return {
    kind: 'service',
    owner: createOwner('service:api', [
      'network:default',
      'config:api:0',
      'secret:api:file-0',
      'service:database',
      'service:cache',
    ]),
    name: 'api',
    image: 'registry.example/api@sha256:abc',
    environment: { MODE: 'production' },
    secretEnvironment: { TOKEN: 'sample-api-secret-file-0' },
    configMounts: [{ source: 'sample-api-config-0', target: '/app/bootstrap.sql' }],
    secretMounts: [{ source: 'sample-api-secret-file-0', target: '/run/secrets/token' }],
    volumes: [],
    ports: [
      { name: 'http', target: 8080, protocol: 'tcp', published: true, publishedPort: 18_080 },
    ],
    health: {
      kind: 'http',
      port: 8080,
      path: "/health'check",
      intervalSeconds: 5,
      timeoutSeconds: 2,
      failureThreshold: 3,
    },
    replicas: 1,
    configurationHash: 'service-hash',
  };
}
