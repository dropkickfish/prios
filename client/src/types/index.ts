export interface BoardType {
  id: string;
  name: string;
  order: number;
  availabilitySchedule: any;
  colour?: string;
  schedulingWindowDays?: number;
  cardCounts?: Record<string, number>;
}

export interface StatusType {
  id: string;
  boardId: string;
  name: string;
  order: number;
  category: 'maybe' | 'scheduled' | 'doing' | 'done' | 'wontdo';
}

export interface TagType {
  id: string;
  name: string;
  colour?: string;
}

export interface CardType {
  id: string;
  boardId: string;
  statusId: string;
  statusCategory?: 'maybe' | 'scheduled' | 'doing' | 'done' | 'wontdo' | null;
  title: string;
  description: any;
  difficulty: number;
  priority: number;
  scheduledAt?: Date;
  deferredCount: number;
  smartScore?: number;
  tags?: TagType[];
}

export interface CardUpdateType {
  id: string;
  cardId: string;
  content: string;
  createdAt: Date;
}
