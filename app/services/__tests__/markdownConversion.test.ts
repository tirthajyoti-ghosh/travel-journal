/**
 * Comprehensive Jest tests for markdown conversion functions
 * Tests both positive and negative scenarios
 */

import { htmlToMarkdown, markdownToHtml } from '../markdownConverter';

describe('htmlToMarkdown - Text Formatting', () => {
  describe('Positive scenarios', () => {
    test('converts <strong> to **bold**', () => {
      expect(htmlToMarkdown('<p><strong>Bold text</strong></p>')).toBe('**Bold text**');
    });

    test('converts <b> to **bold**', () => {
      expect(htmlToMarkdown('<p><b>Bold text</b></p>')).toBe('**Bold text**');
    });

    test('converts <em> to *italic*', () => {
      expect(htmlToMarkdown('<p><em>Italic text</em></p>')).toBe('*Italic text*');
    });

    test('converts <i> to *italic*', () => {
      expect(htmlToMarkdown('<p><i>Italic text</i></p>')).toBe('*Italic text*');
    });

    test('converts <s> to ~~strikethrough~~', () => {
      expect(htmlToMarkdown('<p><s>Strikethrough</s></p>')).toBe('~~Strikethrough~~');
    });

    test('converts inline <code> to `code`', () => {
      expect(htmlToMarkdown('<p>Use <code>npm install</code> here</p>')).toBe('Use `npm install` here');
    });

    test('converts code blocks correctly', () => {
      const html = '<pre><code>const x = 10;\nconsole.log(x);</code></pre>';
      const result = htmlToMarkdown(html);
      expect(result).toContain('```');
      expect(result).toContain('const x = 10;');
    });
  });

  describe('Negative scenarios', () => {
    test('handles empty HTML', () => {
      expect(htmlToMarkdown('')).toBe('');
    });

    test('handles HTML with only whitespace', () => {
      expect(htmlToMarkdown('   \n  \n  ')).toBe('');
    });

    test('handles empty tags', () => {
      expect(htmlToMarkdown('<p><strong></strong></p>')).toBe('****');
    });
  });
});

describe('htmlToMarkdown - Headings', () => {
  test('converts h1 to # heading', () => {
    expect(htmlToMarkdown('<h1>Heading 1</h1>')).toBe('# Heading 1');
  });

  test('converts h2 to ## heading', () => {
    expect(htmlToMarkdown('<h2>Heading 2</h2>')).toBe('## Heading 2');
  });

  test('converts h3 to ### heading', () => {
    expect(htmlToMarkdown('<h3>Heading 3</h3>')).toBe('### Heading 3');
  });
});

describe('htmlToMarkdown - Lists', () => {
  test('converts unordered list', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('- Item 1');
    expect(result).toContain('- Item 2');
  });

  test('converts ordered list', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('1. First');
    expect(result).toContain('2. Second');
  });

  test('converts checked task list', () => {
    const html = '<ul data-type="taskList"><li data-checked="true">Done</li></ul>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('- [x] Done');
  });

  test('converts unchecked task list', () => {
    const html = '<ul data-type="taskList"><li data-checked="false">Todo</li></ul>';
    const result = htmlToMarkdown(html);
    expect(result).toContain('- [ ] Todo');
  });
});

describe('htmlToMarkdown - Links and Images', () => {
  test('converts link', () => {
    const result = htmlToMarkdown('<a href="https://example.com">Click</a>');
    expect(result).toBe('[Click](https://example.com)');
  });

  test('converts image with alt', () => {
    const html = '<img src="https://example.com/img.jpg" alt="Desc" />';
    const result = htmlToMarkdown(html);
    expect(result).toContain('![Desc](https://example.com/img.jpg)');
  });
});

describe('markdownToHtml - Text Formatting', () => {
  test('converts **bold** to <strong>', () => {
    const result = markdownToHtml('**Bold text**');
    expect(result).toContain('<strong>Bold text</strong>');
  });

  test('converts *italic* to <em>', () => {
    const result = markdownToHtml('*Italic text*');
    expect(result).toContain('<em>Italic text</em>');
  });

  test('converts ~~strike~~ to <s>', () => {
    const result = markdownToHtml('~~Strike~~');
    expect(result).toContain('<s>Strike</s>');
  });

  test('converts `code` to <code>', () => {
    const result = markdownToHtml('Use `npm install`');
    expect(result).toContain('<code>npm install</code>');
  });

  test('handles empty string', () => {
    expect(markdownToHtml('')).toBe('');
  });
});

describe('markdownToHtml - Headings', () => {
  test('converts # to <h1>', () => {
    expect(markdownToHtml('# Heading')).toContain('<h1>Heading</h1>');
  });

  test('converts ## to <h2>', () => {
    expect(markdownToHtml('## Heading')).toContain('<h2>Heading</h2>');
  });
});

describe('markdownToHtml - Lists', () => {
  test('converts - items to <ul>', () => {
    const result = markdownToHtml('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>Item 1</li>');
  });

  test('converts numbered list to <ol>', () => {
    const result = markdownToHtml('1. First\n2. Second');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>First</li>');
  });

  test('converts [x] to checked task', () => {
    const result = markdownToHtml('- [x] Done');
    expect(result).toContain('data-checked="true"');
  });

  test('converts [ ] to unchecked task', () => {
    const result = markdownToHtml('- [ ] Todo');
    expect(result).toContain('data-checked="false"');
  });
});

describe('Round-trip Conversion', () => {
  test('bold survives round-trip', () => {
    const original = '<p><strong>Bold</strong></p>';
    const markdown = htmlToMarkdown(original);
    const back = markdownToHtml(markdown);
    expect(back).toContain('<strong>Bold</strong>');
  });

  test('lists survive round-trip', () => {
    const original = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const markdown = htmlToMarkdown(original);
    const back = markdownToHtml(markdown);
    expect(back).toContain('<ul>');
    expect(back).toContain('<li>Item 1</li>');
  });

  test('complex content survives round-trip', () => {
    const markdown = `# Title\n\n**Bold** and *italic*\n\n- Item 1\n- Item 2`;
    const html = markdownToHtml(markdown);
    const back = htmlToMarkdown(html);
    expect(back).toContain('# Title');
    expect(back).toContain('**Bold**');
    expect(back).toContain('*italic*');
  });
});

describe('Edge Cases', () => {
  test('handles special characters', () => {
    const special = '!@#$%^&*()';
    const html = `<p>${special}</p>`;
    const result = htmlToMarkdown(html);
    expect(result).toContain(special);
  });

  test('handles unicode', () => {
    const unicode = '你好 🎉';
    const html = `<p>${unicode}</p>`;
    const result = htmlToMarkdown(html);
    expect(result).toContain(unicode);
  });

  test('handles HTML entities', () => {
    const result = htmlToMarkdown('<p>&amp; &lt; &gt;</p>');
    expect(result).toContain('& < >');
  });
});
