import type { DockerComposeProjectIdentity } from '../../../types/dockerComposeRuntime';
import { DOCKER_COMPOSE_LABELS } from './dockerComposeLabels';

/** Return exact Docker CLI filters for the selected Infra ownership scope. */
export function getDockerComposeOwnershipFilters(
  identity: DockerComposeProjectIdentity,
  resourceId?: string,
): readonly string[] {
  return [
    '--filter',
    `label=${DOCKER_COMPOSE_LABELS.project}=${identity.projectId}`,
    '--filter',
    `label=${DOCKER_COMPOSE_LABELS.environment}=${identity.environment}`,
    '--filter',
    `label=${DOCKER_COMPOSE_LABELS.adapter}=docker-compose`,
    ...(resourceId === undefined
      ? []
      : ['--filter', `label=${DOCKER_COMPOSE_LABELS.resourceId}=${resourceId}`]),
  ];
}
