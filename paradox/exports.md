# Public API

## createInfraAdapter

Kind: `function`
Module: `src/features/compose-runtime/composition/createInfraAdapter.ts`
Source: `src/features/compose-runtime/composition/createInfraAdapter.ts:13:1`

Create the canonical Docker Compose runtime adapter entrypoint.

The foundation exposes the released Contracts boundary and fails lifecycle calls explicitly
until the provider implementation phase supplies its external adapters.

### Signatures

- `() => InfraRuntimeAdapter<"docker-compose">`
  - returns: `InfraRuntimeAdapter<"docker-compose">`

## infraAdapterDescriptor

Kind: `value`
Module: `src/constants/infra.ts`
Source: `src/constants/infra.ts:5:14`
