import { createInfraAdapter, infraAdapterDescriptor } from '@ankhorage/docker-compose';

const adapter = createInfraAdapter();

console.log(infraAdapterDescriptor.id, adapter.descriptor.package);
