# Public API

## createInfraAdapter

Kind: `function`
Module: `src/features/compose-runtime/composition/createInfraAdapter.ts`
Source: `src/features/compose-runtime/composition/createInfraAdapter.ts:20:1`

Create the canonical Docker Compose runtime adapter entrypoint.

The caller supplies a Docker Compose control-plane boundary. Portable workloads are projected
into Compose services, networks, volumes, configs and execution-only secrets.

### Signatures

- `(options: DockerComposeAdapterOptions) => InfraRuntimeAdapter<"docker-compose">`
  - options: `DockerComposeAdapterOptions`
  - returns: `InfraRuntimeAdapter<"docker-compose">`

## DockerComposeAdapterOptions

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:14:1`

### Members

| Name         | Kind     | Type                        | Required | Description |
| ------------ | -------- | --------------------------- | -------- | ----------- |
| controlPlane | property | `DockerComposeControlPlane` | yes      |             |

## DockerComposeConfig

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:57:1`

### Members

| Name              | Kind     | Type                 | Required | Description |
| ----------------- | -------- | -------------------- | -------- | ----------- |
| configurationHash | property | `string`             | yes      |             |
| content           | property | `string`             | yes      |             |
| kind              | property | `"config"`           | yes      |             |
| name              | property | `string`             | yes      |             |
| owner             | property | `InfraOwnedResource` | yes      |             |

## DockerComposeControlPlane

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:133:1`

### Members

| Name                | Kind   | Type                                                                                                                                                                                              | Required | Description |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| destroyAsync        | method | `(identity: DockerComposeProjectIdentity, resourceIds: readonly string[], signal?: AbortSignal) => Promise<InfraResult<null>>`                                                                    | yes      |             |
| downAsync           | method | `(identity: DockerComposeProjectIdentity, signal?: AbortSignal) => Promise<InfraResult<null>>`                                                                                                    | yes      |             |
| inspectAsync        | method | `(identity: DockerComposeProjectIdentity, signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>`                                                                         | yes      |             |
| reconcileAsync      | method | `(project: DockerComposeExecutionProject, access: DockerComposeTargetAccess, pruneResourceIds: readonly string[], signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>` | yes      |             |
| validateAsync       | method | `(project: DockerComposeProject, access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<null>>`                                                                          | yes      |             |
| waitUntilReadyAsync | method | `(identity: DockerComposeProjectIdentity, signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>`                                                                         | yes      |             |

## DockerComposeDesiredState

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:164:1`

## DockerComposeExecutionProject

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:111:1`

### Members

| Name     | Kind     | Type                                         | Required | Description |
| -------- | -------- | -------------------------------------------- | -------- | ----------- |
| configs  | property | `readonly DockerComposeConfig[]`             | yes      |             |
| identity | property | `DockerComposeProjectIdentity`               | yes      |             |
| network  | property | `DockerComposeNetwork`                       | yes      |             |
| secrets  | property | `readonly DockerComposeMaterializedSecret[]` | yes      |             |
| services | property | `readonly DockerComposeService[]`            | yes      |             |
| volumes  | property | `readonly DockerComposeVolume[]`             | yes      |             |

## DockerComposeMaterializedSecret

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:106:1`

### Members

| Name              | Kind     | Type                                                                                                            | Required | Description |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| configurationHash | property | `string`                                                                                                        | yes      |             |
| kind              | property | `"secret"`                                                                                                      | yes      |             |
| name              | property | `string`                                                                                                        | yes      |             |
| owner             | property | `InfraOwnedResource`                                                                                            | yes      |             |
| target            | property | `{ readonly kind: "environment"; readonly name: string; } \| { readonly kind: "file"; readonly path: string; }` | yes      |             |
| value             | property | `string`                                                                                                        | yes      |             |

## DockerComposeNetwork

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:46:1`

### Members

| Name              | Kind     | Type                 | Required | Description |
| ----------------- | -------- | -------------------- | -------- | ----------- |
| configurationHash | property | `string`             | yes      |             |
| kind              | property | `"network"`          | yes      |             |
| name              | property | `string`             | yes      |             |
| owner             | property | `InfraOwnedResource` | yes      |             |

## DockerComposeOutput

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:165:1`

## DockerComposeProject

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:97:1`

### Members

| Name     | Kind     | Type                              | Required | Description |
| -------- | -------- | --------------------------------- | -------- | ----------- |
| configs  | property | `readonly DockerComposeConfig[]`  | yes      |             |
| identity | property | `DockerComposeProjectIdentity`    | yes      |             |
| network  | property | `DockerComposeNetwork`            | yes      |             |
| secrets  | property | `readonly DockerComposeSecret[]`  | yes      |             |
| services | property | `readonly DockerComposeService[]` | yes      |             |
| volumes  | property | `readonly DockerComposeVolume[]`  | yes      |             |

## DockerComposeProjectIdentity

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:18:1`

### Members

| Name        | Kind     | Type                                   | Required | Description |
| ----------- | -------- | -------------------------------------- | -------- | ----------- |
| environment | property | `"local" \| "preview" \| "production"` | yes      |             |
| projectId   | property | `string`                               | yes      |             |
| projectName | property | `string`                               | yes      |             |

## DockerComposeProjectObservation

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:127:1`

### Members

| Name      | Kind     | Type                                                                                                 | Required | Description |
| --------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- | ----------- |
| resources | property | `readonly DockerComposeResourceObservation[]`                                                        | yes      |             |
| state     | property | `"absent" \| "pending" \| "ready" \| "degraded" \| "stopped" \| "retained" \| "failed" \| "unknown"` | yes      |             |

## DockerComposeResource

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:166:1`

## DockerComposeResourceObservation

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:115:1`

### Members

| Name                 | Kind     | Type                                                                                                 | Required | Description |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- | ----------- |
| configurationHash    | property | `string \| undefined`                                                                                | no       |             |
| dependsOnResourceIds | property | `readonly string[]`                                                                                  | yes      |             |
| detail               | property | `string \| undefined`                                                                                | no       |             |
| externalId           | property | `string \| undefined`                                                                                | no       |             |
| persistent           | property | `boolean`                                                                                            | yes      |             |
| publicOutputs        | property | `Readonly<Record<string, string \| number \| boolean>> \| undefined`                                 | no       |             |
| resourceId           | property | `string`                                                                                             | yes      |             |
| retention            | property | `"retain" \| "delete-on-destroy"`                                                                    | yes      |             |
| state                | property | `"absent" \| "pending" \| "ready" \| "degraded" \| "stopped" \| "retained" \| "failed" \| "unknown"` | yes      |             |

## DockerComposeSecret

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:63:1`

### Members

| Name              | Kind     | Type                                                                                                            | Required | Description |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| configurationHash | property | `string`                                                                                                        | yes      |             |
| kind              | property | `"secret"`                                                                                                      | yes      |             |
| name              | property | `string`                                                                                                        | yes      |             |
| owner             | property | `InfraOwnedResource`                                                                                            | yes      |             |
| reference         | property | `InfraSecretReference`                                                                                          | yes      |             |
| target            | property | `{ readonly kind: "environment"; readonly name: string; } \| { readonly kind: "file"; readonly path: string; }` | yes      |             |

## DockerComposeService

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:72:1`

### Members

| Name              | Kind     | Type                                                                                                                             | Required | Description |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| args              | property | `readonly string[] \| undefined`                                                                                                 | no       |             |
| command           | property | `readonly string[] \| undefined`                                                                                                 | no       |             |
| configMounts      | property | `readonly { readonly source: string; readonly target: string; }[]`                                                               | yes      |             |
| configurationHash | property | `string`                                                                                                                         | yes      |             |
| environment       | property | `Readonly<Record<string, string>>`                                                                                               | yes      |             |
| health            | property | `InfraWorkloadHealthSpec \| undefined`                                                                                           | no       |             |
| image             | property | `string`                                                                                                                         | yes      |             |
| kind              | property | `"service"`                                                                                                                      | yes      |             |
| name              | property | `string`                                                                                                                         | yes      |             |
| owner             | property | `InfraOwnedResource`                                                                                                             | yes      |             |
| ports             | property | `readonly { readonly name: string; readonly target: number; readonly protocol: "tcp" \| "udp"; readonly published: boolean; }[]` | yes      |             |
| replicas          | property | `number`                                                                                                                         | yes      |             |
| resources         | property | `InfraWorkloadResourceSpec \| undefined`                                                                                         | no       |             |
| secretEnvironment | property | `Readonly<Record<string, string>>`                                                                                               | yes      |             |
| secretMounts      | property | `readonly { readonly source: string; readonly target: string; }[]`                                                               | yes      |             |
| volumes           | property | `readonly { readonly source: string; readonly target: string; }[]`                                                               | yes      |             |

## DockerComposeTargetAccess

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:24:1`

## DockerComposeVolume

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:51:1`

### Members

| Name              | Kind     | Type                 | Required | Description |
| ----------------- | -------- | -------------------- | -------- | ----------- |
| configurationHash | property | `string`             | yes      |             |
| kind              | property | `"volume"`           | yes      |             |
| name              | property | `string`             | yes      |             |
| owner             | property | `InfraOwnedResource` | yes      |             |
| sizeGiB           | property | `number`             | yes      |             |

## infraAdapterDescriptor

Kind: `value`
Module: `src/constants/infra.ts`
Source: `src/constants/infra.ts:5:14`

## projectDockerComposeProject

Kind: `function`
Module: `src/features/compose-runtime/application/projectDockerComposeProject.ts`
Source: `src/features/compose-runtime/application/projectDockerComposeProject.ts:22:1`

Project portable workloads into deterministic Compose services, networks, volumes, configs and
secret references without Kubernetes-specific concepts or resolved secret values.

### Signatures

- `(context: InfraExecutionContext, desired: DockerComposeDesiredState, identity: DockerComposeProjectIdentity) => InfraResult<DockerComposeProject>`
  - context: `InfraExecutionContext`
  - desired: `DockerComposeDesiredState`
  - identity: `DockerComposeProjectIdentity`
  - returns: `InfraResult<DockerComposeProject>`
