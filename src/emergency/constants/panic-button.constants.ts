export const EMERGENCY_EVENTS = {
  CREATED: 'panic.created',
  SEARCHING: 'panic.searching',
  OFFER_CREATED: 'panic.offer.created',
  OFFER_ACCEPTED: 'panic.offer.accepted',
  OFFER_REJECTED: 'panic.offer.rejected',
  OFFER_EXPIRED: 'panic.offer.expired',
  MATCHED: 'panic.matched',
  CANCELLED: 'panic.cancelled',
  EXPIRED: 'panic.expired',
  PSYCHOLOGIST_AVAILABLE: 'psychologist.available',
  REQUEST_TIMEOUT_TRIGGERED: 'panic.request-timeout.triggered',
  OFFER_TIMEOUT_TRIGGERED: 'panic.offer-timeout.triggered',
} as const;

export const EMERGENCY_SOCKET_EVENTS = {
  SEARCHING: 'panic:searching',
  NEW_OFFER: 'panic:new-offer',
  MATCHED: 'panic:matched',
  OFFER_EXPIRED: 'panic:offer-expired',
  CANCELLED: 'panic:cancelled',
} as const;
