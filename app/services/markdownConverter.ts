/**
 * Markdown conversion utilities
 * Pure functions with no external dependencies
 * Used by githubService and tested independently
 */

/**
 * Convert HTML content to markdown
 * Preserves spacing by converting empty <p> tags to blank lines
 * Supports all TenTapStartKit features: bold, italic, underline, strikethrough, 
 * code, headings, lists, blockquotes, links, images, task lists
 */
export const htmlToMarkdown = (html: string): string => {
  let markdown = html
    // Convert empty paragraphs to double newlines (blank lines in markdown)
    .replace(/<p><\/p>/g, '\n\n')
    .replace(/<p>\s*<\/p>/g, '\n\n')
    // Convert headings
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
    // Convert text formatting (order matters: do nested tags first)
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>') // Underline: preserve as HTML (markdown doesn't support)
    .replace(/<s>(.*?)<\/s>/g, '~~$1~~') // Strikethrough
    .replace(/<del>(.*?)<\/del>/g, '~~$1~~') // Strikethrough alternative
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*')
    // Convert code blocks BEFORE inline code to avoid conflicts
    .replace(/<pre><code>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n\n')
    .replace(/<code>(.*?)<\/code>/g, '`$1`') // Inline code
    // Convert links
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    // Convert line breaks
    .replace(/<br\s*\/?>/g, '\n')
    // Convert blockquotes
    .replace(/<blockquote>(.*?)<\/blockquote>/gs, (match, content) => {
      const lines = content.trim().split('\n');
      return lines.map((line: string) => '> ' + line).join('\n') + '\n\n';
    })
    // Convert task lists (must be before regular lists)
    .replace(/<li[^>]*data-checked="true"[^>]*>(.*?)<\/li>/g, '- [x] $1\n')
    .replace(/<li[^>]*data-checked="false"[^>]*>(.*?)<\/li>/g, '- [ ] $1\n')
    // Convert regular lists
    .replace(/<ul>(.*?)<\/ul>/gs, '$1\n')
    .replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      // Number ordered list items
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, (m: string, item: string) => `${counter++}. ${item}\n`) + '\n';
    })
    .replace(/<li>(.*?)<\/li>/g, '- $1\n')
    // Convert images (do this before removing other tags)
    .replace(/<img[^>]+src="([^"]+)"(?:[^>]+alt="([^"]*)")?[^>]*>/g, (match, src, alt) => `![${alt || ''}](${src})\n\n`)
    .replace(/<img[^>]+src='([^']+)'(?:[^>]+alt='([^']*)')?[^>]*>/g, (match, src, alt) => `![${alt || ''}](${src})\n\n`)
    // Convert videos (preserve as HTML video tag)
    .replace(/<video[^>]*src="([^"]+)"[^>]*>.*?<\/video>/g, (match, src) => `<video src="${src}" controls playsinline></video>\n\n`)
    // Convert highlights (preserve as HTML since markdown doesn't support)
    .replace(/<mark[^>]*>(.*?)<\/mark>/g, '<mark>$1</mark>')
    // Convert regular paragraphs (do this after other conversions)
    .replace(/<p>(.*?)<\/p>/gs, '$1\n\n')
    // Remove any remaining HTML tags except preserved ones (u, mark, video)
    .replace(/<(?!\/?(?:u|mark|video)\b)[^>]+>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    // Clean up excessive newlines but preserve intentional spacing
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
  
  return markdown;
};

/**
 * Convert markdown to HTML
 * Handles common markdown formatting for story content
 * Supports all TenTapStartKit features: bold, italic, underline, strikethrough,
 * code, headings, lists, blockquotes, links, images, task lists
 */
export const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  // Process inline formatting first (within lines)
  // Code blocks: ```code```
  html = html.replace(/```([^`]+)```/gs, '<pre><code>$1</code></pre>');
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  
  // Bold: **text** or __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_ (but not in URLs or already processed)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Images: ![alt](url) - convert to img tags
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Process block-level elements
  const blocks: string[] = [];
  const lines = html.split('\n');
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Empty lines
    if (!line.trim()) {
      i++;
      continue;
    }
    
    // Headings (check longer ones first)
    if (line.startsWith('###### ')) {
      blocks.push(`<h6>${line.substring(7)}</h6>`);
      i++;
    } else if (line.startsWith('##### ')) {
      blocks.push(`<h5>${line.substring(6)}</h5>`);
      i++;
    } else if (line.startsWith('#### ')) {
      blocks.push(`<h4>${line.substring(5)}</h4>`);
      i++;
    } else if (line.startsWith('### ')) {
      blocks.push(`<h3>${line.substring(4)}</h3>`);
      i++;
    } else if (line.startsWith('## ')) {
      blocks.push(`<h2>${line.substring(3)}</h2>`);
      i++;
    } else if (line.startsWith('# ')) {
      blocks.push(`<h1>${line.substring(2)}</h1>`);
      i++;
    }
    // Blockquotes
    else if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].substring(2));
        i++;
      }
      blocks.push(`<blockquote>${quoteLines.join('\n')}</blockquote>`);
    }
    // Task lists
    else if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
      const taskItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- [x] ') || lines[i].startsWith('- [ ] '))) {
        const checked = lines[i].startsWith('- [x] ');
        const text = lines[i].substring(6);
        taskItems.push(`<li data-checked="${checked}">${text}</li>`);
        i++;
      }
      blocks.push(`<ul data-type="taskList">${taskItems.join('')}</ul>`);
    }
    // Ordered lists
    else if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, '');
        listItems.push(`<li>${text}</li>`);
        i++;
      }
      blocks.push(`<ol>${listItems.join('')}</ol>`);
    }
    // Unordered lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        const text = lines[i].substring(2);
        listItems.push(`<li>${text}</li>`);
        i++;
      }
      blocks.push(`<ul>${listItems.join('')}</ul>`);
    }
    // Code blocks
    else if (line.startsWith('<pre><code>')) {
      blocks.push(line);
      i++;
    }
    // Regular paragraphs
    else {
      blocks.push(`<p>${line}</p>`);
      i++;
    }
  }
  
  return blocks.join('');
};
