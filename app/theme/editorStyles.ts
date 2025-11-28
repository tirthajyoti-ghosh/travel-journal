import { colors } from './colors';

/**
 * Shared CSS styles for rich text editor content
 * Used by both the editor (TenTap) and viewer (WebView)
 */
export const getEditorContentCSS = () => `
  * {
    font-family: 'Lora', Georgia, serif;
    color: ${colors.text};
    font-size: 18px;
    line-height: 1.6;
  }
  p {
    margin: 0.5em 0;
    min-height: 1.6em; /* Ensure empty paragraphs have height */
  }
  p:empty::before {
    content: '\\200B'; /* Zero-width space to give empty paragraphs height */
    display: inline-block;
  }
  h1, h2, h3 {
    font-family: 'Lora', serif;
    font-weight: 600;
    margin: 0.8em 0 0.4em 0;
  }
  h1 {
    font-size: 28px;
  }
  h2 {
    font-size: 24px;
  }
  h3 {
    font-size: 20px;
  }
  blockquote {
    border-left: 3px solid ${colors.accent};
    padding-left: 1rem;
    margin: 1em 0;
    font-style: italic;
    opacity: 0.9;
  }
  ul, ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  li {
    margin: 0.3em 0;
  }
  strong {
    font-weight: 600;
  }
  em {
    font-style: italic;
  }
  img {
    max-width: 100%;
    height: auto;
    margin: 1em 0;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
`;

/**
 * Complete HTML template for viewing story content
 * Used by the viewer screen to render saved HTML content
 */
export const getViewerHTML = (content: string) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          padding: 16px 0;
          background-color: transparent;
        }
        ${getEditorContentCSS()}
      </style>
      <script>
        window.addEventListener('load', function() {
          const height = document.body.scrollHeight;
          window.ReactNativeWebView.postMessage(JSON.stringify({ height }));
        });
      </script>
    </head>
    <body>
      ${content || '<p>No content</p>'}
    </body>
  </html>
`;
