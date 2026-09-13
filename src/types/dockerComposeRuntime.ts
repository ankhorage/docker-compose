import type {
  InfraComputeTarget,
  InfraControlPlaneCredentialRef,
  InfraExecutionContext,
  InfraOutput,
  InfraOwnedResource,
  InfraResourceStatus,
  InfraResult,
  InfraRuntimeDesiredState,
  InfraSecretReference,
  InfraWorkloadHealthSpec,
  InfraWorkloadResourceSpec,
} from '@ankhorage/contracts/infra';

export interface DockerComposeAdapterOptions {
  readonly controlPlane: DockerComposeControlPlane;
}

export interface DockerComposeProjectIdentity {
  readonly projectId: string;
  readonly environment: InfraExecutionContext['environment'];
  readonly projectName: string;
}

export type DockerComposeTargetAccess =
  | {
      readonly target: Extract<InfraComputeTarget, { readonly kind: 'local-host' }>;
      readonly transport: { readonly kind: 'local' };
    }
  | {
      readonly target: Extract<InfraComputeTarget, { readonly kind: 'ssh-host' }>;
      readonly transport: {
        readonly kind: 'ssh';
        readonly host: string;
        readonly port: number;
        readonly user: string;
        readonly hostKeyFingerprint: string;
        readonly credential: Readonly<Record<string, string>>;
      };
    };

interface DockerComposeDesiredResource {
  readonly owner: InfraOwnedResource;
  readonly configurationHash: string;
}

export interface DockerComposeNetwork extends DockerComposeDesiredResource {
  readonly kind: 'network';
  readonly name: string;
}

export interface DockerComposeVolume extends DockerComposeDesiredResource {
  readonly kind: 'volume';
  readonly name: string;
  readonly sizeGiB: number;
}

export interface DockerComposeConfig extends DockerComposeDesiredResource {
  readonly kind: 'config';
  readonly name: string;
  readonly content: string;
}

export type DockerComposeSecretValueSegment =
  | { readonly kind: 'literal'; readonly value: string }
  | {
      readonly kind: 'reference';
      readonly reference:
        InfraSecretReference | (InfraControlPlaneCredentialRef & { readonly key: string });
    };

export interface DockerComposeSecret extends DockerComposeDesiredResource {
  readonly kind: 'secret';
  readonly name: string;
  readonly segments: readonly DockerComposeSecretValueSegment[];
  readonly target:
    | { readonly kind: 'environment'; readonly name: string }
    | { readonly kind: 'file'; readonly path: string };
}

export interface DockerComposeService extends DockerComposeDesiredResource {
  readonly kind: 'service';
  readonly name: string;
  readonly image: string;
  readonly command?: readonly string[];
  readonly args?: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly secretEnvironment: Readonly<Record<string, string>>;
  readonly configMounts: readonly { readonly source: string; readonly target: string }[];
  readonly secretMounts: readonly { readonly source: string; readonly target: string }[];
  readonly volumes: readonly {
    readonly source: string;
    readonly target: string;
  }[];
  readonly ports: readonly {
    readonly name: string;
    readonly target: number;
    readonly protocol: 'tcp' | 'udp';
    readonly published: boolean;
  }[];
  readonly health?: InfraWorkloadHealthSpec;
  readonly resources?: InfraWorkloadResourceSpec;
  readonly replicas: number;
}

export interface DockerComposeProject {
  readonly identity: DockerComposeProjectIdentity;
  readonly network: DockerComposeNetwork;
  readonly volumes: readonly DockerComposeVolume[];
  readonly configs: readonly DockerComposeConfig[];
  readonly secrets: readonly DockerComposeSecret[];
  readonly services: readonly DockerComposeService[];
}

export interface DockerComposeMaterializedSecret extends Omit<DockerComposeSecret, 'segments'> {
  readonly value: string;
}

/** Execution-only project. Secret values must never be persisted, logged or returned. */
export interface DockerComposeExecutionProject extends Omit<DockerComposeProject, 'secrets'> {
  readonly secrets: readonly DockerComposeMaterializedSecret[];
}

export interface DockerComposeResourceObservation {
  readonly resourceId: string;
  readonly state: InfraResourceStatus['state'];
  readonly configurationHash?: string;
  readonly persistent: boolean;
  readonly retention: InfraOwnedResource['retention'];
  readonly dependsOnResourceIds: readonly string[];
  readonly externalId?: string;
  readonly publicOutputs?: Readonly<Record<string, string | number | boolean>>;
  readonly detail?: string;
}

export interface DockerComposeProjectObservation {
  readonly state: InfraResourceStatus['state'];
  readonly resources: readonly DockerComposeResourceObservation[];
}

/** Docker Compose CLI boundary; implementations scope every observation to the exact project. */
export interface DockerComposeControlPlane {
  validateAsync(
    project: DockerComposeProject,
    access: DockerComposeTargetAccess,
    signal?: AbortSignal,
  ): Promise<InfraResult<null>>;
  inspectAsync(
    identity: DockerComposeProjectIdentity,
    access: DockerComposeTargetAccess,
    signal?: AbortSignal,
  ): Promise<InfraResult<DockerComposeProjectObservation>>;
  reconcileAsync(
    project: DockerComposeExecutionProject,
    access: DockerComposeTargetAccess,
    pruneResourceIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<InfraResult<DockerComposeProjectObservation>>;
  waitUntilReadyAsync(
    identity: DockerComposeProjectIdentity,
    access: DockerComposeTargetAccess,
    signal?: AbortSignal,
  ): Promise<InfraResult<DockerComposeProjectObservation>>;
  downAsync(
    identity: DockerComposeProjectIdentity,
    access: DockerComposeTargetAccess,
    signal?: AbortSignal,
  ): Promise<InfraResult<null>>;
  destroyAsync(
    identity: DockerComposeProjectIdentity,
    access: DockerComposeTargetAccess,
    resourceIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<InfraResult<null>>;
}

export type DockerComposeDesiredState = InfraRuntimeDesiredState<'docker-compose'>;
export type DockerComposeOutput = Extract<InfraOutput, { readonly visibility: 'public' }>;
export type DockerComposeResource =
  | DockerComposeNetwork
  | DockerComposeVolume
  | DockerComposeConfig
  | DockerComposeSecret
  | DockerComposeService;
