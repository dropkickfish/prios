import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CardType } from '../../types';

interface DraggableCardProps {
  card: CardType;
  children: React.ReactNode;
}

export const DraggableCard = ({ card, children }: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: { card }
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={isDragging ? 'opacity-30' : ''}>
      {children}
    </div>
  );
};

interface DroppableColumnProps {
  statusId: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableColumn = ({ statusId, children, className = '' }: DroppableColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: statusId });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-3 p-2 bg-base-200/30 rounded-[1.5rem] min-h-[250px] border transition-colors shadow-[inset_0_2px_10px_rgba(0,0,0,0.05)] backdrop-blur-sm ${isOver ? 'border-primary/50 bg-primary/5' : 'border-base-content/5'} ${className}`}
    >
      {children}
    </div>
  );
};
