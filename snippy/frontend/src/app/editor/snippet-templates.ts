export interface SnippetTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
}

export const SNIPPET_TEMPLATES: SnippetTemplate[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty HTML, CSS, and JS',
    html: '',
    css: '',
    js: '',
  },
  {
    id: 'hello',
    name: 'Hello Snippy',
    description: 'A tiny starter page with live preview',
    html: '<h1>Hello, Snippy!</h1>\n<p>Edit HTML, CSS, and JS — preview updates live.</p>\n',
    css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 2rem;\n}\n',
    js: 'console.log("Welcome to Snippy");\n',
  },
  {
    id: 'flex',
    name: 'Flex card',
    description: 'Centered card using flexbox',
    html: '<div class="card">\n  <h1>Flex card</h1>\n  <p>Resize the preview to see the layout hold.</p>\n</div>\n',
    css: 'body {\n  min-height: 100vh;\n  margin: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: #0f172a;\n  color: #e2e8f0;\n  font-family: system-ui, sans-serif;\n}\n.card {\n  padding: 2rem;\n  border-radius: 1rem;\n  background: #1e293b;\n  max-width: 24rem;\n}\n',
    js: '',
  },
  {
    id: 'grid',
    name: 'CSS Grid',
    description: 'Three-up responsive grid',
    html: '<section class="grid">\n  <article>One</article>\n  <article>Two</article>\n  <article>Three</article>\n</section>\n',
    css: 'body {\n  margin: 0;\n  padding: 1.5rem;\n  font-family: system-ui, sans-serif;\n  background: #111827;\n  color: #f9fafb;\n}\n.grid {\n  display: grid;\n  gap: 1rem;\n  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));\n}\narticle {\n  padding: 1.5rem;\n  border-radius: 0.75rem;\n  background: #1f2937;\n  text-align: center;\n}\n',
    js: '',
  },
];

export function templateById(id: string | null | undefined): SnippetTemplate {
  return SNIPPET_TEMPLATES.find((t) => t.id === id) ?? SNIPPET_TEMPLATES[0];
}
