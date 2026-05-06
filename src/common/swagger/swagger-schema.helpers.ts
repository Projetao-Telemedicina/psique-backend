export const roleEnumValues = ['ADMIN', 'PROFESSIONAL', 'PATIENT'];

export const userStatusEnumValues = ['ACTIVE', 'INACTIVE', 'BLOCKED'];

export const professionalApprovalStatusEnumValues = [
  'PENDING',
  'APPROVED',
  'REJECTED',
];

export const onlineStatusEnumValues = ['OFFLINE', 'ONLINE'];

export function uuidSchema(example = '550e8400-e29b-41d4-a716-446655440000') {
  return {
    type: 'string',
    format: 'uuid',
    example,
  };
}

export function dateSchema(example = '1990-08-22') {
  return {
    type: 'string',
    format: 'date',
    example,
  };
}

export function nullableDateSchema(example = '1990-08-22') {
  return {
    ...dateSchema(example),
    nullable: true,
  };
}

export function dateTimeSchema(example = '2026-05-05T14:30:00.000Z') {
  return {
    type: 'string',
    format: 'date-time',
    example,
  };
}

export function nullableStringSchema(example: string) {
  return {
    type: 'string',
    nullable: true,
    example,
  };
}
