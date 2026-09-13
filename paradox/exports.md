# Public API

## createDockerComposeCliControlPlane

Kind: `function`
Module: `src/features/compose-runtime/adapters/createDockerComposeCliControlPlane.ts`
Source: `src/features/compose-runtime/adapters/createDockerComposeCliControlPlane.ts:17:1`

### Signatures

- `(resolver?: DockerComposeSessionResolver) => DockerComposeControlPlane`
  - resolver: `DockerComposeSessionResolver` (optional)
  - returns: `DockerComposeControlPlane`

## createInfraAdapter

Kind: `function`
Module: `src/features/compose-runtime/composition/createInfraAdapter.ts`
Source: `src/features/compose-runtime/composition/createInfraAdapter.ts:22:1`

Create the canonical Docker Compose runtime adapter entrypoint.

The default composition operates the local Docker CLI. Callers may inject a control plane for a
verified remote engine. Portable workloads become services, networks, volumes, configs and
execution-only secrets.

### Signatures

- `(options?: DockerComposeAdapterOptions | undefined) => InfraRuntimeAdapter<"docker-compose">`
  - options: `DockerComposeAdapterOptions | undefined` (optional)
  - returns: `InfraRuntimeAdapter<"docker-compose">`

## createLocalDockerComposeSessionResolver

Kind: `function`
Module: `src/features/compose-runtime/adapters/createLocalDockerComposeSessionResolver.ts`
Source: `src/features/compose-runtime/adapters/createLocalDockerComposeSessionResolver.ts:10:1`

### Signatures

- `() => DockerComposeSessionResolver`
  - returns: `DockerComposeSessionResolver`

## createSubprocessDockerComposeCommandRunner

Kind: `function`
Module: `src/features/compose-runtime/adapters/createSubprocessDockerComposeCommandRunner.ts`
Source: `src/features/compose-runtime/adapters/createSubprocessDockerComposeCommandRunner.ts:10:1`

Create the concrete shell-free subprocess boundary used by Docker Compose operations.

### Signatures

- `() => DockerComposeCommandRunner`
  - returns: `DockerComposeCommandRunner`

## DockerComposeAdapterOptions

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:15:1`

### Members

| Name         | Kind     | Type                        | Required | Description |
| ------------ | -------- | --------------------------- | -------- | ----------- |
| controlPlane | property | `DockerComposeControlPlane` | yes      |             |

## DockerComposeCommandRequest

Kind: `type`
Module: `src/types/dockerComposeProcess.ts`
Source: `src/types/dockerComposeProcess.ts:6:1`

### Members

| Name        | Kind     | Type                                            | Required | Description |
| ----------- | -------- | ----------------------------------------------- | -------- | ----------- |
| arguments   | property | `readonly string[]`                             | yes      |             |
| environment | property | `Readonly<Record<string, string>> \| undefined` | no       |             |
| executable  | property | `string`                                        | yes      |             |
| signal      | property | `AbortSignal \| undefined`                      | no       |             |
| stdin       | property | `string \| undefined`                           | no       |             |

## DockerComposeCommandResult

Kind: `type`
Module: `src/types/dockerComposeProcess.ts`
Source: `src/types/dockerComposeProcess.ts:15:1`

### Members

| Name     | Kind     | Type     | Required | Description |
| -------- | -------- | -------- | -------- | ----------- |
| exitCode | property | `number` | yes      |             |
| stderr   | property | `string` | yes      |             |
| stdout   | property | `string` | yes      |             |

## DockerComposeCommandRunner

Kind: `type`
Module: `src/types/dockerComposeProcess.ts`
Source: `src/types/dockerComposeProcess.ts:22:1`

### Members

| Name     | Kind   | Type                                                                            | Required | Description |
| -------- | ------ | ------------------------------------------------------------------------------- | -------- | ----------- |
| runAsync | method | `(request: DockerComposeCommandRequest) => Promise<DockerComposeCommandResult>` | yes      |             |

## DockerComposeConfig

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:58:1`

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
Source: `src/types/dockerComposeRuntime.ts:142:1`

### Members

| Name                | Kind   | Type                                                                                                                                                                                              | Required | Description |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| destroyAsync        | method | `(identity: DockerComposeProjectIdentity, access: DockerComposeTargetAccess, resourceIds: readonly string[], signal?: AbortSignal) => Promise<InfraResult<null>>`                                 | yes      |             |
| downAsync           | method | `(identity: DockerComposeProjectIdentity, access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<null>>`                                                                 | yes      |             |
| inspectAsync        | method | `(identity: DockerComposeProjectIdentity, access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>`                                      | yes      |             |
| reconcileAsync      | method | `(project: DockerComposeExecutionProject, access: DockerComposeTargetAccess, pruneResourceIds: readonly string[], signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>` | yes      |             |
| validateAsync       | method | `(project: DockerComposeProject, access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<null>>`                                                                          | yes      |             |
| waitUntilReadyAsync | method | `(identity: DockerComposeProjectIdentity, access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<DockerComposeProjectObservation>>`                                      | yes      |             |

## DockerComposeDesiredState

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:177:1`

## DockerComposeEngineSession

Kind: `type`
Module: `src/types/dockerComposeProcess.ts`
Source: `src/types/dockerComposeProcess.ts:27:1`

### Members

| Name         | Kind     | Type                                            | Required | Description |
| ------------ | -------- | ----------------------------------------------- | -------- | ----------- |
| endpointHost | property | `string`                                        | yes      |             |
| environment  | property | `Readonly<Record<string, string>> \| undefined` | no       |             |
| executable   | property | `string`                                        | yes      |             |
| runner       | property | `DockerComposeCommandRunner`                    | yes      |             |

## DockerComposeExecutionProject

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:120:1`

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
Source: `src/types/dockerComposeRuntime.ts:115:1`

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
Source: `src/types/dockerComposeRuntime.ts:47:1`

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
Source: `src/types/dockerComposeRuntime.ts:178:1`

## DockerComposeProject

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:106:1`

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
Source: `src/types/dockerComposeRuntime.ts:19:1`

### Members

| Name        | Kind     | Type                                   | Required | Description |
| ----------- | -------- | -------------------------------------- | -------- | ----------- |
| environment | property | `"local" \| "preview" \| "production"` | yes      |             |
| projectId   | property | `string`                               | yes      |             |
| projectName | property | `string`                               | yes      |             |

## DockerComposeProjectObservation

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:136:1`

### Members

| Name      | Kind     | Type                                                                                                 | Required | Description |
| --------- | -------- | ---------------------------------------------------------------------------------------------------- | -------- | ----------- |
| resources | property | `readonly DockerComposeResourceObservation[]`                                                        | yes      |             |
| state     | property | `"absent" \| "pending" \| "ready" \| "degraded" \| "stopped" \| "retained" \| "failed" \| "unknown"` | yes      |             |

## DockerComposeResource

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:179:1`

## DockerComposeResourceObservation

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:124:1`

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
Source: `src/types/dockerComposeRuntime.ts:72:1`

### Members

| Name              | Kind     | Type                                                                                                            | Required | Description |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| configurationHash | property | `string`                                                                                                        | yes      |             |
| kind              | property | `"secret"`                                                                                                      | yes      |             |
| name              | property | `string`                                                                                                        | yes      |             |
| owner             | property | `InfraOwnedResource`                                                                                            | yes      |             |
| segments          | property | `readonly DockerComposeSecretValueSegment[]`                                                                    | yes      |             |
| target            | property | `{ readonly kind: "environment"; readonly name: string; } \| { readonly kind: "file"; readonly path: string; }` | yes      |             |

## DockerComposeSecretValueSegment

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:64:1`

## DockerComposeService

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:81:1`

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

## DockerComposeSessionResolver

Kind: `type`
Module: `src/types/dockerComposeProcess.ts`
Source: `src/types/dockerComposeProcess.ts:35:1`

### Members

| Name         | Kind   | Type                                                                                                            | Required | Description |
| ------------ | ------ | --------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| resolveAsync | method | `(access: DockerComposeTargetAccess, signal?: AbortSignal) => Promise<InfraResult<DockerComposeEngineSession>>` | yes      |             |

## DockerComposeTargetAccess

Kind: `unknown`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:25:1`

## DockerComposeVolume

Kind: `type`
Module: `src/types/dockerComposeRuntime.ts`
Source: `src/types/dockerComposeRuntime.ts:52:1`

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
