# @ankhorage/docker-compose

## 0.5.3

### Patch Changes

- 543a004: Actually double literal dollar signs in inline Compose config content before interpolation.

## 0.5.2

### Patch Changes

- b61e514: Preserve literal dollar signs in Docker Compose config payloads across Compose interpolation.

## 0.5.1

### Patch Changes

- 8b290c8: Wait for health-checked portable workload dependencies to become healthy before starting dependent Docker Compose services.

## 0.5.0

### Minor Changes

- 54110aa: Publish exact external workload ports through Docker Compose when declared.

## 0.4.0

### Minor Changes

- b6cbc69: Materialize workload templates containing privileged segments only at the Docker Compose reconcile boundary.

## 0.3.0

### Minor Changes

- a8059ae: Add the concrete stateless Docker Compose CLI runtime, including exact owned-resource inspection and reconciliation, keyed bootstrap credential materialization, readiness, outputs, reversible suspension, safe teardown, and injectable verified remote-engine sessions.

## 0.2.0

### Minor Changes

- d3fe072: Implement the portable Docker Compose runtime lifecycle with runtime-only secret materialization.

## 0.1.0

### Minor Changes

- 1fcf0c0: Publish the initial provider-neutral infrastructure package foundation.

## 0.0.0

Initial unpublished package state.
