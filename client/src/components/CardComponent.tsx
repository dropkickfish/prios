import type { CardType, StatusType } from '../types';

/** Escape HTML for safe insertion. */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** Plain text with newlines only (for fallback). */
function stripHtmlForPreview(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

/** Sanitize HTML: allow only p, br, strong, em, b, i, a[href]. Strip script/style and remove leading ">" from blockquote-style lines. */
function sanitizeHtmlForPreview(html: string): string {
  if (!html || typeof html !== 'string') return '';
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  out = out
    .replace(/<p\b[^>]*>/gi, '')
    .replace(/<\/p>\s*<p/gi, '\n\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  out = out.split('\n').map((line) => line.replace(/^>\s?/, '')).join('\n');
  const allowed = /^(a|strong|em|b|i)$/i;
  out = out.replace(/<([a-z][a-z0-9]*)\b([^>]*)>|<\/([a-z][a-z0-9]*)>/gi, (match, openTag, attrs, closeTag) => {
    const tag = (openTag || closeTag || '').toLowerCase();
    if (!allowed.test(tag)) return '';
    if (closeTag) return `</${tag}>`;
    let attrStr = '';
    if (tag === 'a' && attrs) {
      const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
      const href = hrefMatch?.[1];
      if (href && !/^\s*javascript:/i.test(href)) attrStr = ` href="${escapeHtml(href)}"`;
    }
    return `<${tag}${attrStr}>`;
  });
  out = out.replace(/\n/g, '<br />').trim();
  return out;
}

/** Safe HTML for description preview: preserves line breaks, strips stray ">", keeps links and bold. */
function getDescriptionPreviewHtml(description: CardType['description']): string {
  if (!description) return '';
  if (typeof description === 'string') {
    return sanitizeHtmlForPreview(description);
  }
  const d = description as { content?: Array<{ content?: Array<{ text?: string; marks?: { type: string; attrs?: { href?: string } }[] }> }> };
  if (!d?.content) return '';
  const lines: string[] = [];
  for (const node of d.content) {
    const parts = (node.content ?? []).map((c: { text?: string; marks?: { type: string; attrs?: { href?: string } }[] }) => {
      let t = escapeHtml((c.text ?? '').replace(/^>\s?/, ''));
      (c.marks ?? []).forEach((m: { type: string; attrs?: { href?: string } }) => {
        if (m.type === 'bold') t = `<strong>${t}</strong>`;
        else if (m.type === 'italic') t = `<em>${t}</em>`;
        else if (m.type === 'link' && m.attrs?.href && !/^\s*javascript:/i.test(m.attrs.href)) t = `<a href="${escapeHtml(m.attrs.href)}" target="_blank" rel="noopener noreferrer">${t}</a>`;
      });
      return t;
    });
    lines.push(parts.join(''));
  }
  const text = lines.join('\n').trim();
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
}

interface CardComponentProps {
  card: CardType;
  statuses?: StatusType[]; // Optional to prevent breaking other usages if any
  onStatusChange?: (id: string, newStatusId: string) => void;
  onClick?: (id: string) => void;
  onSchedule?: (card: CardType) => void;
  showActions?: boolean;
  /** When 'triage', show metrics + description preview + schedule + tags. When 'backlog', show metrics + short description preview (~half of focus). */
  variant?: 'default' | 'triage' | 'backlog';
  /** When true, card fills parent height with sensible margins; description area grows and clips at container end. Shared by Prioritise and Focus. */
  fillHeight?: boolean;
  /** When true, description is line-clamped on mobile (ellipsis) so Focus card doesn't dominate; desktop unchanged. */
  constrainDescriptionOnMobile?: boolean;
}

export const CardComponent = ({ card, statuses, onStatusChange, onClick, onSchedule, showActions = false, variant = 'default', fillHeight = false, constrainDescriptionOnMobile = false }: CardComponentProps) => {
  const getDifficultyColor = (difficulty: number) => {
    const colours = ['text-success', 'text-info', 'text-warning', 'text-error', 'text-error font-bold'];
    return colours[difficulty - 1] || 'text-base-content';
  };

  const currentStatus = statuses?.find(s => s.id === card.statusId);
  const isBacklog = currentStatus?.category === 'maybe';
  const isDoing = currentStatus?.category === 'doing';
  const impactScore = card.smartScore != null ? Number(card.smartScore).toFixed(2) : (card.priority && card.difficulty ? (card.priority / card.difficulty).toFixed(2) : null);

  // Backlog: minimal (title + impact) unless variant is triage or backlog. FOCUS: more detail. Others: standard.
  const compact = isBacklog && variant !== 'triage' && variant !== 'backlog';
  const showSummaryBlock = isDoing || variant === 'triage' || variant === 'backlog';
  const useFullHeight = fillHeight || isDoing;

  return (
    <div 
      className={`card bg-base-100 shadow-sm hover:shadow-md transition-all cursor-pointer border border-base-content/5 group/card ${useFullHeight ? 'h-full flex flex-col min-h-0' : ''}`}
      onClick={() => onClick?.(card.id)}
    >
      <div className={`card-body flex flex-col min-h-0 ${useFullHeight ? 'flex-1 p-8 gap-4' : 'gap-3'} ${compact ? 'p-3' : !useFullHeight ? 'p-4' : ''}`}>
        <div className="flex justify-between items-start gap-2">
          <h3 className="card-title text-base font-bold leading-tight">{card.title}</h3>
          {compact && impactScore !== null && (
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/80 shrink-0" title="Impact score (priority / difficulty)">
              Impact {impactScore}
            </span>
          )}
        </div>

        {!compact && (
        <div className={useFullHeight ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase font-bold tracking-wider opacity-60 shrink-0">
          <span className={`${getDifficultyColor(card.difficulty)}`}>
            Diff: {card.difficulty}
          </span>
          <span>•</span>
          <span>Prio: {card.priority}</span>
          {impactScore !== null && (
            <>
              <span>•</span>
              <span className="text-secondary" title="Impact score (priority ÷ difficulty)">
                Impact: {impactScore}
              </span>
            </>
          )}
        </div>

        {showSummaryBlock && (
          <div className={`flex flex-col ${useFullHeight ? 'flex-1 min-h-0 overflow-hidden' : 'gap-3 mt-1'}`}>
            {useFullHeight && variant === 'triage' ? (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1">
                  {card.description && (() => {
                    const html = getDescriptionPreviewHtml(card.description);
                    if (!html) return null;
                    return (
                      <div className="flex flex-col gap-0 flex-1 min-h-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5 shrink-0">Description</p>
                        <div
                          className="text-sm opacity-80 leading-relaxed break-words overflow-y-auto min-h-0 flex-1 prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-p:first:mt-0"
                          dangerouslySetInnerHTML={{ __html: html }}
                        />
                      </div>
                    );
                  })()}
                  {card.scheduledAt && (
                    <div className="text-[10px] opacity-60 uppercase font-bold bg-primary/10 px-2 py-1.5 rounded-lg self-start inline-flex items-center gap-1.5 shrink-0">
                      <span aria-hidden>📅</span>
                      {new Date(card.scheduledAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 shrink-0">
                      {card.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-base-content/5 text-base-content/70 border border-base-content/10"
                          title={`#${tag.name}`}
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] opacity-40 pt-1 border-t border-base-content/5 shrink-0 mt-1">
                  Click to open full details
                </p>
              </>
            ) : (
              <>
                {card.description && (() => {
                  const html = getDescriptionPreviewHtml(card.description);
                  if (!html) return null;
                  const mobileClampClass = constrainDescriptionOnMobile ? 'line-clamp-6 md:line-clamp-none overflow-hidden md:overflow-y-auto md:min-h-0 md:flex-1' : '';
                  const backlogClamp = variant === 'backlog' ? 'line-clamp-2 overflow-hidden' : '';
                  return (
                    <div className={useFullHeight ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-0.5 shrink-0">Description</p>
                      <div
                        className={`text-sm opacity-80 leading-relaxed break-words prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-p:first:mt-0 ${mobileClampClass} ${backlogClamp} ${useFullHeight && !constrainDescriptionOnMobile ? 'overflow-y-auto min-h-0 flex-1' : variant === 'triage' ? 'line-clamp-3' : ''}`}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    </div>
                  );
                })()}
                {card.scheduledAt && (
                  <div className="text-[10px] opacity-60 uppercase font-bold bg-primary/10 px-2 py-1.5 rounded-lg self-start inline-flex items-center gap-1.5 shrink-0">
                    <span aria-hidden>📅</span>
                    {new Date(card.scheduledAt).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {card.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-base-content/5 text-base-content/70 border border-base-content/10"
                        title={`#${tag.name}`}
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <p className={`text-[10px] opacity-40 pt-1 border-t border-base-content/5 shrink-0 ${useFullHeight && isDoing ? 'mt-auto' : ''}`}>
                  Click to open full details
                </p>
              </>
            )}
          </div>
        )}
        {!isDoing && variant !== 'triage' && variant !== 'backlog' && card.scheduledAt && (
          <div className="flex items-center gap-1 text-[10px] opacity-40 uppercase font-black bg-base-200/50 py-1 px-2 rounded-md self-start">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
            {new Date(card.scheduledAt).toLocaleDateString('en-GB')}
          </div>
        )}

        {/* Tags for non-doing cards (triage/backlog show tags in summary block above) */}
        {!isDoing && variant !== 'triage' && variant !== 'backlog' && card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.tags.map(tag => (
              <span
                key={tag.id}
                className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-base-content/5 text-base-content/60 border border-base-content/10 group-hover/card:bg-primary/10 group-hover/card:text-primary group-hover/card:border-primary/20 transition-colors"
                title={`#${tag.name}`}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
        </div>
        )}

        {/* Action Footer - Always visible if showActions is true */}
        {showActions && (
            <div className="pt-3 mt-1 border-t border-base-content/5 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                {isBacklog && onSchedule && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onSchedule(card); }}
                        className="btn btn-xs btn-primary btn-outline w-full gap-1 rounded-lg font-black text-[9px] uppercase tracking-wider"
                    >
                        ⚡ Schedule Now
                    </button>
                )}
                
                {statuses && onStatusChange && (
                    <div className="flex flex-wrap gap-1 justify-start">
                        {statuses.filter(s => s.id !== card.statusId).map(s => (
                            <button 
                                key={s.id}
                                onClick={(e) => { e.stopPropagation(); onStatusChange(card.id, s.id); }}
                                className="btn btn-xs btn-ghost h-6 min-h-0 text-[9px] uppercase font-bold tracking-tight hover:bg-base-content/5 text-base-content/50 hover:text-base-content px-2 rounded-md"
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
