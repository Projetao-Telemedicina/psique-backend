import {
    dateTimeSchema,
    nullableDateTimeSchema,
    uuidSchema,
} from '../../common/swagger/index';

const rescheduleStatusEnumValues = [
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
];

const rescheduleRequestProperties = {
    id: uuidSchema('d2d1f83b-1c1c-4b88-9e4e-3b2c1c4f1f3b'),
    appointmentId: uuidSchema('cf2a4f24-5d8e-4f78-8d2d-2d1c7e12b7c9'),
    requestedBy: uuidSchema('e3f3a5a4-2a0d-4f9c-9c1f-2c7f6a1b8f2e'),
    status: {
    type: 'string',
    enum: rescheduleStatusEnumValues,
    example: 'PENDING',
    },
    suggestedStartsAt: dateTimeSchema('2026-05-15T14:00:00.000Z'),
    suggestedEndsAt: dateTimeSchema('2026-05-15T14:50:00.000Z'),
    patientConfirmed: {
    type: 'boolean',
    nullable: true,
    example: null,
    },
    professionalConfirmed: {
    type: 'boolean',
    nullable: true,
    example: true,
    },
    expiresAt: nullableDateTimeSchema('2026-05-15T12:00:00.000Z'),
    createdAt: dateTimeSchema('2026-05-11T10:00:00.000Z'),
};

export const rescheduleRequestSchema = {
    type: 'object',
    properties: rescheduleRequestProperties,
    required: [
    'id',
    'appointmentId',
    'requestedBy',
    'status',
    'suggestedStartsAt',
    'suggestedEndsAt',
    'createdAt',
    ],
};

export const rescheduleListResponseSchema = {
    type: 'array',
    items: rescheduleRequestSchema,
};

export const createRescheduleRequestSchema = {
    type: 'object',
    properties: {
    appointmentId: rescheduleRequestProperties.appointmentId,
    suggestedStartsAt: rescheduleRequestProperties.suggestedStartsAt,
    suggestedEndsAt: rescheduleRequestProperties.suggestedEndsAt,
    expiresAt: rescheduleRequestProperties.expiresAt,
    },
    required: ['appointmentId', 'suggestedStartsAt', 'suggestedEndsAt'],
};

export const updateRescheduleRequestSchema = {
    type: 'object',
    properties: {
    suggestedStartsAt: rescheduleRequestProperties.suggestedStartsAt,
    suggestedEndsAt: rescheduleRequestProperties.suggestedEndsAt,
    expiresAt: rescheduleRequestProperties.expiresAt,
    },
};

export const confirmRescheduleRequestSchema = {
    type: 'object',
    properties: {
    confirmed: {
        type: 'boolean',
        example: true,
    },
    },
    required: ['confirmed'],
};

export const rescheduleConfirmationResponseSchema = {
    oneOf: [
    {
        type: 'object',
        properties: {
        message: {
            type: 'string',
            example: 'Reagendamento confirmado com sucesso.',
        },
        },
        required: ['message'],
    },
    rescheduleRequestSchema,
    ],
};

export const rescheduleMaintenanceResponseSchema = {
    type: 'object',
    properties: {
    processed: {
        type: 'number',
        example: 2,
    },
    },
    required: ['processed'],
};