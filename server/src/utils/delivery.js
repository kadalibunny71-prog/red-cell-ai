import { AppError } from './http.js';

export const deliveryStatuses = ['preparing', 'collected', 'in_transit', 'arrived'];

export function deliveryParticipant(item, userId) {
  return item?.user_id === userId || item?.accepted_by === userId;
}

export function assertDeliveryParticipant(item, userId) {
  if (!item) throw AppError('This request no longer exists.', 404, 'NOT_FOUND');
  if (!deliveryParticipant(item, userId)) throw AppError('Only the hospital requester and matched donor centre can access delivery tracking.', 403, 'DELIVERY_PRIVATE');
  if (!['matched', 'delivered'].includes(item.status)) throw AppError('Delivery tracking becomes available after a donor centre confirms availability.', 409, 'DELIVERY_NOT_STARTED');
}

export function serialiseDeliveryEvent(event) {
  return {
    ...event,
    actor: event.actor ? {
      id: event.actor.id,
      fullName: event.actor.full_name,
      organizationName: event.actor.organization_name,
      role: event.actor.role
    } : null
  };
}
