import TurndownService from 'turndown';

export interface ConversionResult {
  markdown: string;
  metadata: {
    title: string;
    description: string;
    image: string;
    url: string;
  };
  jsonld: any[];
  tokenCounts: {
    original: number;
    markdown: number;
    savings: number;
    savingsPercent: number;
  };
  contentSignal: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

function extractMetadata(doc: Document, finalUrl: string): { title: string; description: string; image: string; url: string } {
  const getMeta = (selector: string): string => {
    const el = doc.querySelector(selector);
    return el?.getAttribute('content')?.trim() || '';
  };

  const title =
    getMeta('meta[name="title"]') ||
    getMeta('meta[property="og:title"]') ||
    getMeta('meta[name="twitter:title"]') ||
    doc.querySelector('title')?.textContent?.trim() ||
    '';

  const description =
    getMeta('meta[name="description"]') ||
    getMeta('meta[property="og:description"]') ||
    getMeta('meta[name="twitter:description"]') ||
    '';

  const image =
    getMeta('meta[property="og:image"]') ||
    getMeta('meta[name="twitter:image"]') ||
    '';

  return { title, description, image: image ? resolveUrl(image, finalUrl) : image, url: finalUrl };
}

function extractJsonLd(doc: Document): any[] {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const results: any[] = [];
  scripts.forEach((script) => {
    try {
      const text = script.textContent?.trim();
      if (text) results.push(JSON.parse(text));
    } catch {
      // skip malformed JSON-LD
    }
  });
  return results;
}

function extractContent(doc: Document): HTMLElement {
  const selectors = ['main', 'article', '[role="main"]', '.content', '.post', '.entry-content', '#content', '.main-content'];
  for (const sel of selectors) {
    const el = doc.querySelector(sel) as HTMLElement | null;
    if (el && el.textContent && el.textContent.trim().length > 200) return el;
  }
  return doc.body || doc.documentElement;
}

function cleanContent(el: HTMLElement): void {
  const removeSelectors = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside',
    'iframe', 'form', 'button', 'input', 'select', 'textarea',
    '.sidebar', '.navigation', '.menu', '.breadcrumb', '.share', '.social',
    '.comments', '.comment-form', '.related', '.advertisement', '.ad', '.ads',
    '.cookie-notice', '.popup', '.modal', '.newsletter', '.subscribe',
    '[aria-hidden="true"]', '.visually-hidden', '.sr-only',
  ];
  removeSelectors.forEach((sel) => {
    el.querySelectorAll(sel).forEach((node) => node.remove());
  });
}

function createTurndownService(baseUrl: string): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
    linkStyle: 'inlined',
  });

  td.addRule('fixLinks', {
    filter: 'a',
    replacement: (content, node) => {
      const href = (node as HTMLElement).getAttribute('href');
      if (!href || href === '#') return content;
      const absolute = resolveUrl(href, baseUrl);
      return `[${content}](${absolute})`;
    },
  });

  td.addRule('fixImages', {
    filter: 'img',
    replacement: (_content, node) => {
      const el = node as HTMLImageElement;
      const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
      if (!src) return '';
      const absolute = resolveUrl(src, baseUrl);
      const alt = el.getAttribute('alt') || '';
      return `![${alt}](${absolute})`;
    },
  });

  td.addRule('preserveCodeBlocks', {
    filter: ['pre'],
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const codeEl = el.querySelector('code');
      const code = codeEl?.textContent || el.textContent || '';
      const langMatch = codeEl?.className?.match(/language-([\w-]+)/);
      const lang = langMatch ? langMatch[1] : '';
      return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n`;
    },
  });

  td.addRule('stripTags', {
    filter: ['span', 'div', 'section'],
    replacement: (content) => content,
  });

  return td;
}

export function convertHtmlToMarkdown(html: string, finalUrl: string, contentSignal: string): ConversionResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const metadata = extractMetadata(doc, finalUrl);
  const jsonld = extractJsonLd(doc);

  const contentEl = extractContent(doc);
  cleanContent(contentEl);

  const td = createTurndownService(finalUrl);
  let markdown = td.turndown(contentEl.innerHTML);

  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/, '')
    .replace(/\s+$/, '');

  const frontmatter = [
    '---',
    `title: "${metadata.title.replace(/"/g, '\\"')}"`,
    metadata.description ? `description: "${metadata.description.replace(/"/g, '\\"')}"` : null,
    metadata.image ? `image: "${metadata.image}"` : null,
    `url: "${metadata.url}"`,
    `content-signal: "${contentSignal}"`,
    '---',
  ].filter(Boolean).join('\n');

  let fullMarkdown = frontmatter + '\n\n' + markdown;

  if (jsonld.length > 0) {
    fullMarkdown += '\n\n---\n\n## Structured Data (JSON-LD)\n\n';
    jsonld.forEach((data, i) => {
      fullMarkdown += `\n<details>\n<summary>JSON-LD Block ${i + 1}</summary>\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n</details>\n`;
    });
  }

  const originalTokens = estimateTokens(html);
  const markdownTokens = estimateTokens(fullMarkdown);
  const savings = originalTokens - markdownTokens;
  const savingsPercent = originalTokens > 0 ? Math.round((savings / originalTokens) * 100) : 0;

  return {
    markdown: fullMarkdown,
    metadata,
    jsonld,
    tokenCounts: {
      original: originalTokens,
      markdown: markdownTokens,
      savings,
      savingsPercent,
    },
    contentSignal,
  };
}
