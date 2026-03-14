const tagSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    boardId: { type: 'string' },
    name: { type: 'string' },
    colour: { type: 'string', nullable: true },
  },
};

export const cardResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    boardId: { type: 'string' },
    statusId: { type: 'string' },
    title: { type: 'string' },
    description: { nullable: true },
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    priority: { type: 'integer', minimum: 1, maximum: 5 },
    scheduledAt: { type: 'string', format: 'date-time', nullable: true },
    externalEventId: { type: 'string', nullable: true },
    deferredCount: { type: 'integer' },
    statusChangedAt: { type: 'string', format: 'date-time', nullable: true },
    statusCategory: { type: 'string', nullable: true },
    smartScore: { type: 'number' },
    tags: { type: 'array', items: tagSchema },
  },
};

export const cardBody = {
  type: 'object',
  properties: {
    statusId: { type: 'string' },
    title: { type: 'string' },
    description: {},
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    priority: { type: 'integer', minimum: 1, maximum: 5 },
  },
  required: ['statusId', 'title', 'difficulty', 'priority'],
};

export const cardPatch = {
  type: 'object',
  properties: {
    statusId: { type: 'string' },
    title: { type: 'string' },
    description: {},
    difficulty: { type: 'integer', minimum: 1, maximum: 5 },
    priority: { type: 'integer', minimum: 1, maximum: 5 },
    deferredCount: { type: 'integer' },
  },
};
