/** Labels used for exact Docker resource ownership and stateless lifecycle recovery. */
export const DOCKER_COMPOSE_LABELS = {
  project: 'com.ankhorage.infra.project',
  environment: 'com.ankhorage.infra.environment',
  adapter: 'com.ankhorage.infra.adapter',
  resourceId: 'com.ankhorage.infra.resource-id',
  configurationHash: 'com.ankhorage.infra.configuration-hash',
  persistent: 'com.ankhorage.infra.persistent',
  retention: 'com.ankhorage.infra.retention',
  dependencies: 'com.ankhorage.infra.dependencies',
  inventory: 'com.ankhorage.infra.inventory',
} as const;
