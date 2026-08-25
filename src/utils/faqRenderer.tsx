import React from 'react';

function renderInlineLinks(text: string): React.ReactNode {
  const combined = new RegExp(
    `([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})|(https?://[^\\s]+)|(\\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}(?:\\/[^\\s.,)]*)?\\b)`,
    'gi'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const matched = match[0];
    const isEmail = match[1];
    const isUrl = match[2];

    if (isEmail) {
      parts.push(
        <a key={`link-${matchIndex++}`} href={`mailto:${matched}`} className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    } else if (isUrl) {
      parts.push(
        <a key={`link-${matchIndex++}`} href={matched} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    } else {
      const href = matched.startsWith('http') ? matched : `https://${matched}`;
      parts.push(
        <a key={`link-${matchIndex++}`} href={href} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700 underline font-medium">
          {matched}
        </a>
      );
    }
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

export function renderRichAnswer(answer: string, isCompact = false) {
  const lines = answer.replace(/\\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let bulletItems: string[] = [];
  let numberedItems: string[] = [];
  let key = 0;

  const paraClass = isCompact
    ? 'text-sm text-gray-600 leading-relaxed mb-2 last:mb-0'
    : 'text-gray-600 leading-relaxed mb-3 last:mb-0';

  const flushBullets = () => {
    if (bulletItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className={`my-2 space-y-1.5 pl-1 ${isCompact ? '' : 'my-3 space-y-2'}`}>
        {bulletItems.map((item, i) => (
          <li key={i} className={`flex gap-2 ${isCompact ? 'text-sm' : ''} text-gray-600 leading-relaxed`}>
            <span className="text-red-500 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineLinks(item)}</span>
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  const flushNumbered = () => {
    if (numberedItems.length === 0) return;
    blocks.push(
      <ol key={`ol-${key++}`} className={`my-2 space-y-1.5 pl-1 ${isCompact ? '' : 'my-3 space-y-2'}`}>
        {numberedItems.map((item, i) => (
          <li key={i} className={`flex gap-2 ${isCompact ? 'text-sm' : ''} text-gray-600 leading-relaxed`}>
            <span className="text-red-600 font-semibold mt-0.5 flex-shrink-0 min-w-[1.5rem]">{i + 1}.</span>
            <span>{renderInlineLinks(item)}</span>
          </li>
        ))}
      </ol>
    );
    numberedItems = [];
  };

  const flushAll = () => {
    flushBullets();
    flushNumbered();
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '') {
      flushAll();
      return;
    }
    if (trimmed.startsWith('• ') || /^[-*]\s/.test(trimmed)) {
      flushNumbered();
      bulletItems.push(trimmed.replace(/^(?:•|[-*])\s+/, ''));
    } else if (/^\d+[.)]\s/.test(trimmed)) {
      flushBullets();
      numberedItems.push(trimmed.replace(/^\d+[.)]\s+/, ''));
    } else {
      flushAll();
      blocks.push(
        <p key={`p-${key++}`} className={paraClass}>
          {renderInlineLinks(trimmed)}
        </p>
      );
    }
  });
  flushAll();
  return blocks;
}
