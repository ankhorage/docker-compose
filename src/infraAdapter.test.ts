import { INFRA_ADAPTER_CATALOG, isInfraAdapterDescriptor } from '@ankhorage/contracts/infra';
import { describe, expect, it } from 'bun:test';

import { createInfraAdapter, infraAdapterDescriptor } from './index';
import { FakeDockerComposeControlPlane } from './runtimeFixtures.test';

describe('Docker Compose runtime adapter', () => {
  it('exports the exact Contracts catalog descriptor', () => {
    expect(infraAdapterDescriptor).toEqual(INFRA_ADAPTER_CATALOG['docker-compose']);
    expect(isInfraAdapterDescriptor(infraAdapterDescriptor)).toBe(true);
  });

  it('rejects descriptor identity drift', () => {
    expect(
      isInfraAdapterDescriptor({
        ...infraAdapterDescriptor,
        package: '@ankhorage/not-docker-compose',
      }),
    ).toBe(false);
  });

  it('exposes the canonical implementation entrypoint', () => {
    const controlPlane = new FakeDockerComposeControlPlane();
    expect(createInfraAdapter({ controlPlane }).descriptor).toBe(infraAdapterDescriptor);
  });
});
