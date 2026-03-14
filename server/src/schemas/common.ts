export const idParam = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
} as const;

export const boardIdParam = {
  type: 'object',
  properties: {
    boardId: { type: 'string' },
  },
  required: ['boardId'],
} as const;

export const cardIdParam = {
  type: 'object',
  properties: {
    cardId: { type: 'string' },
  },
  required: ['cardId'],
} as const;

export const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
} as const;

export const successResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
  },
  required: ['success'],
} as const;

export const statusCategoryEnum = ['maybe', 'scheduled', 'doing', 'done', 'wontdo'] as const;
