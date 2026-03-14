export const boardResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    availabilitySchedule: { nullable: true },
    order: { type: 'integer' },
    colour: { type: 'string', nullable: true },
    schedulingWindowDays: { type: 'integer' },
    cardCounts: { type: 'object', additionalProperties: { type: 'integer' } },
  },
};

export const boardBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    availabilitySchedule: {},
    colour: { type: 'string' },
    schedulingWindowDays: { type: 'integer' },
  },
  required: ['name'],
};

export const boardPatch = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    availabilitySchedule: {},
    colour: { type: 'string' },
    schedulingWindowDays: { type: 'integer' },
    order: { type: 'integer' },
  },
};
