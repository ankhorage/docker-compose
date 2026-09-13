import type { InfraResult } from '@ankhorage/contracts/infra';

import type {
  DockerComposeControlPlane,
  DockerComposeExecutionProject,
  DockerComposeProject,
  DockerComposeProjectIdentity,
  DockerComposeProjectObservation,
  DockerComposeResourceObservation,
  DockerComposeTargetAccess,
} from './index';

/** Generic in-memory Docker Compose control-plane fixture. */
export class FakeDockerComposeControlPlane implements DockerComposeControlPlane {
  readonly calls: string[] = [];
  lastAccess?: DockerComposeTargetAccess;
  lastEnvironmentValues: Readonly<Record<string, string>> = {};
  lastSecretValues: readonly string[] = [];
  state: DockerComposeProjectObservation['state'] = 'absent';
  resources: DockerComposeResourceObservation[] = [];

  validateAsync(
    _project: DockerComposeProject,
    access: DockerComposeTargetAccess,
  ): Promise<InfraResult<null>> {
    this.calls.push('validate');
    this.lastAccess = access;
    return success(null);
  }

  inspectAsync(): Promise<InfraResult<DockerComposeProjectObservation>> {
    this.calls.push('inspect');
    return success(this.observation());
  }

  reconcileAsync(
    project: DockerComposeExecutionProject,
    access: DockerComposeTargetAccess,
    pruneResourceIds: readonly string[],
  ): Promise<InfraResult<DockerComposeProjectObservation>> {
    this.calls.push(`up:${project.identity.projectName}`);
    this.lastAccess = access;
    this.lastEnvironmentValues = Object.fromEntries(
      project.services.flatMap(({ environment }) => Object.entries(environment)),
    );
    this.lastSecretValues = project.secrets.map(({ value }) => value);
    const desired = [
      project.network,
      ...project.volumes,
      ...project.configs,
      ...project.secrets,
      ...project.services,
    ];
    this.resources = [
      ...this.resources.filter(
        ({ resourceId }) =>
          !pruneResourceIds.includes(resourceId) &&
          !desired.some(({ owner }) => owner.identity.resourceId === resourceId),
      ),
      ...desired.map((resource) => ({
        resourceId: resource.owner.identity.resourceId,
        state: 'ready' as const,
        configurationHash: resource.configurationHash,
        persistent: resource.owner.persistent,
        retention: resource.owner.retention,
        dependsOnResourceIds: resource.owner.dependsOn.map(({ resourceId }) => resourceId),
        externalId: resource.name,
        ...('ports' in resource && resource.ports.some(({ published }) => published)
          ? { publicOutputs: { endpoint: `https://${resource.name}.sample.test` } }
          : {}),
      })),
    ];
    this.state = 'ready';
    return success(this.observation());
  }

  waitUntilReadyAsync(): Promise<InfraResult<DockerComposeProjectObservation>> {
    this.calls.push('wait');
    return success(this.observation());
  }

  downAsync(): Promise<InfraResult<null>> {
    this.calls.push('down');
    this.state = 'stopped';
    this.resources = this.resources.map((resource) => ({ ...resource, state: 'stopped' }));
    return success(null);
  }

  destroyAsync(
    _identity: DockerComposeProjectIdentity,
    _access: DockerComposeTargetAccess,
    resourceIds: readonly string[],
  ): Promise<InfraResult<null>> {
    this.calls.push(`destroy:${resourceIds.join(',')}`);
    this.resources = this.resources.filter(({ resourceId }) => !resourceIds.includes(resourceId));
    this.state = this.resources.length === 0 ? 'absent' : 'retained';
    return success(null);
  }

  private observation(): DockerComposeProjectObservation {
    return { state: this.state, resources: this.resources };
  }
}

function success<T>(value: T): Promise<InfraResult<T>> {
  return Promise.resolve({ ok: true, value, diagnostics: [] });
}
