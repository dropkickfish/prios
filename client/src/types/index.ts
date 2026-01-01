export interface BoardType {
  id: string;
  name: string;
  availabilitySchedule: any;
}

export interface StatusType {
  id: string;
  boardId: string;
  name: string;
  order: number;
  category: 'maybe' | 'icebox' | 'doing' | 'done' | 'archive';
}

export interface CardType {
  id: string;
  boardId: string;
  statusId: string;
  title: string;
  description: any;
  difficulty: number;
  priority: number;
  scheduledAt?: Date;
}

export interface CardUpdateType {
  id: string;
  cardId: string;
  content: string;
  createdAt: Date;
}
