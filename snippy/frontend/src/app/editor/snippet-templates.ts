import type { CdnResource } from '@app/models/extra-models/cdnLibrary';
import type { Snippet } from '@app/models/base-models/snippet';

export interface SnippetTemplate {
  id: string;
  name: string;
  description: string;
  html: string;
  css: string;
  js: string;
  /** Material icon for starter cards. */
  icon?: string;
  /** `starter` ships with Snippy; `user` is a snippet marked "Use as template". */
  source?: 'starter' | 'user';
  cdnResources?: CdnResource[];
  tags?: string[];
}

export const SNIPPET_TEMPLATES: SnippetTemplate[] = [
  {
    id: 'blank',
    source: 'starter',
    name: 'Blank',
    description: 'Empty HTML, CSS, and JS',
    icon: 'note_add',
    html: '',
    css: '',
    js: '',
  },
  {
    id: 'hello',
    source: 'starter',
    name: 'Hello Snippy',
    description: 'A tiny starter page with live preview',
    icon: 'waving_hand',
    html: '<h1>Hello, Snippy!</h1>\n<p>Edit HTML, CSS, and JS — preview updates live.</p>\n',
    css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 2rem;\n}\n',
    js: 'console.log("Welcome to Snippy");\n',
  },
  {
    id: 'flex',
    source: 'starter',
    name: 'Flex card',
    description: 'Centered card using flexbox',
    icon: 'view_agenda',
    html: '<div class="card">\n  <h1>Flex card</h1>\n  <p>Resize the preview to see the layout hold.</p>\n</div>\n',
    css: 'body {\n  min-height: 100vh;\n  margin: 0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: #0f172a;\n  color: #e2e8f0;\n  font-family: system-ui, sans-serif;\n}\n.card {\n  padding: 2rem;\n  border-radius: 1rem;\n  background: #1e293b;\n  max-width: 24rem;\n}\n',
    js: '',
  },
  {
    id: 'grid',
    source: 'starter',
    name: 'CSS Grid',
    description: 'Three-up responsive grid',
    icon: 'grid_view',
    html: '<section class="grid">\n  <article>One</article>\n  <article>Two</article>\n  <article>Three</article>\n</section>\n',
    css: 'body {\n  margin: 0;\n  padding: 1.5rem;\n  font-family: system-ui, sans-serif;\n  background: #111827;\n  color: #f9fafb;\n}\n.grid {\n  display: grid;\n  gap: 1rem;\n  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));\n}\narticle {\n  padding: 1.5rem;\n  border-radius: 0.75rem;\n  background: #1f2937;\n  text-align: center;\n}\n',
    js: '',
  },
  {
    id: 'counter',
    source: 'starter',
    name: 'Click counter',
    description: 'Button, state, and a DOM update in plain JS',
    icon: 'ads_click',
    html: '<main class="counter">\n  <p class="count" aria-live="polite">0</p>\n  <button type="button" id="increment">Add one</button>\n</main>\n',
    css: 'body {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  background: #1c1917;\n  color: #fafaf9;\n}\n.counter {\n  text-align: center;\n}\n.count {\n  font-size: 4rem;\n  margin: 0 0 1rem;\n}\nbutton {\n  padding: 0.6rem 1.2rem;\n  border: 0;\n  border-radius: 0.5rem;\n  background: #f59e0b;\n  color: #1c1917;\n  font-weight: 600;\n  cursor: pointer;\n}\n',
    js: "const count = document.querySelector('.count');\nlet value = 0;\n\ndocument.getElementById('increment').addEventListener('click', () => {\n  value += 1;\n  count.textContent = String(value);\n});\n",
  },
  {
    id: 'canvas',
    source: 'starter',
    name: 'Canvas animation',
    description: 'requestAnimationFrame loop drawing on a canvas',
    icon: 'animation',
    html: '<canvas id="stage" aria-label="Animated circles"></canvas>\n',
    css: 'html,\nbody {\n  height: 100%;\n  margin: 0;\n  background: #0b1020;\n}\ncanvas {\n  display: block;\n  width: 100%;\n  height: 100%;\n}\n',
    js: "const canvas = document.getElementById('stage');\nconst ctx = canvas.getContext('2d');\n\nfunction resize() {\n  canvas.width = canvas.clientWidth * devicePixelRatio;\n  canvas.height = canvas.clientHeight * devicePixelRatio;\n}\nresize();\naddEventListener('resize', resize);\n\nfunction frame(t) {\n  ctx.clearRect(0, 0, canvas.width, canvas.height);\n  for (let i = 0; i < 12; i++) {\n    const a = t / 1000 + (i * Math.PI) / 6;\n    const x = canvas.width / 2 + Math.cos(a) * canvas.width * 0.25;\n    const y = canvas.height / 2 + Math.sin(a * 1.3) * canvas.height * 0.25;\n    ctx.beginPath();\n    ctx.arc(x, y, 12 * devicePixelRatio, 0, Math.PI * 2);\n    ctx.fillStyle = `hsl(${i * 30}, 80%, 60%)`;\n    ctx.fill();\n  }\n  requestAnimationFrame(frame);\n}\nrequestAnimationFrame(frame);\n",
  },
];

export function templateById(id: string | null | undefined): SnippetTemplate {
  return SNIPPET_TEMPLATES.find((t) => t.id === id) ?? SNIPPET_TEMPLATES[0];
}

/** Turn a saved snippet (marked "Use as template") into a picker template. */
export function templateFromSnippet(snippet: Snippet): SnippetTemplate {
  const file = (type: string) =>
    snippet.snippetFiles?.find((f) => f.fileType === type)?.content ?? '';
  return {
    id: `user:${snippet.shortId ?? snippet.snippetId ?? ''}`,
    name: snippet.name || 'Untitled template',
    description: snippet.description || '',
    html: file('html'),
    css: file('css'),
    js: file('js'),
    source: 'user',
    cdnResources: (snippet.cdnResources ?? []).map((r) => ({ ...r })),
    tags: [...(snippet.tags ?? [])],
  };
}

/** Which panes a template fills, for the HTML / CSS / JS badges on picker cards. */
export function templateLanguages(tpl: Pick<SnippetTemplate, 'html' | 'css' | 'js'>): string[] {
  const langs: string[] = [];
  if (tpl.html.trim()) langs.push('HTML');
  if (tpl.css.trim()) langs.push('CSS');
  if (tpl.js.trim()) langs.push('JS');
  return langs;
}
