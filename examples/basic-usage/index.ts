import type { DockerComposeControlPlane } from '@ankhorage/docker-compose';
import { createInfraAdapter, infraAdapterDescriptor } from '@ankhorage/docker-compose';

declare const controlPlane: DockerComposeControlPlane;
const adapter = createInfraAdapter({ controlPlane });

console.log(infraAdapterDescriptor.id, adapter.descriptor.package);
