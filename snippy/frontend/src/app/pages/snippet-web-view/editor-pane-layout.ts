export type EditorPaneId = 'html' | 'css' | 'js';

export const EDITOR_PANES: readonly EditorPaneId[] = ['html', 'css', 'js'];
export const EDITOR_COLLAPSE_PERCENT = 8;
export const EDITOR_GUTTER_EMPTY = 14;
export const EDITOR_GUTTER_LABEL = 36;

/** Collapsed panes drawn in each editor gutter. Gutter numbers are 1-based. */
export function gutterPaneIds(collapsed: readonly boolean[], gutterNum: number): EditorPaneId[] {
  if (gutterNum === 1) return collapsed[0] ? ['html'] : [];
  const labels: EditorPaneId[] = [];
  if (collapsed[1]) labels.push('css');
  if (collapsed[2]) labels.push('js');
  return labels;
}

/**
 * Pixel thickness of the two editor gutters.
 * An empty gutter beside a collapsed pane is 0 so the name sits in one strip.
 * Stacked editors keep a horizontal gutter at one label height; side-by-side
 * editors widen the vertical gutter by one label per name.
 */
export function editorGutterTracks(
  collapsed: readonly boolean[],
  stacked: boolean
): [number, number] {
  const thickness = (count: number) =>
    stacked ? EDITOR_GUTTER_LABEL : EDITOR_GUTTER_LABEL * count;
  const firstCount = gutterPaneIds(collapsed, 1).length;
  const secondCount = gutterPaneIds(collapsed, 2).length;
  const first = firstCount ? thickness(firstCount) : collapsed[1] ? 0 : EDITOR_GUTTER_EMPTY;
  const second = secondCount ? thickness(secondCount) : EDITOR_GUTTER_EMPTY;
  return [first, second];
}

/** Give one pane the whole editor split. The last open pane stays as it is. */
export function maximizeEditorPane(sizes: readonly number[], index: number): number[] {
  if (index < 0 || index >= sizes.length) return [...sizes];
  const open = sizes.filter((size) => size > 0).length;
  if (open <= 1 && sizes[index] > 0) return [...sizes];
  return sizes.map((_, i) => (i === index ? 100 : 0));
}

/** Collapse one pane from the menu. The last open pane stays open. */
export function minimizeEditorPane(sizes: readonly number[], index: number): number[] {
  if (index < 0 || index >= sizes.length) return [...sizes];
  const open = sizes.filter((size) => size > 0).length;
  if (open <= 1 && sizes[index] > 0) return [...sizes];
  const next = sizes.map((size, i) => (i === index ? 0 : size));
  return collapseEditorPanes(next);
}

/** Snap a dragged-shut pane to 0. The last open pane stays open. */
export function collapseEditorPanes(
  sizes: readonly number[],
  threshold = EDITOR_COLLAPSE_PERCENT
): number[] {
  const numeric = sizes.map((size) => (Number.isFinite(size) ? size : 0));
  const next = numeric.map((size) => (size < threshold ? 0 : size));
  if (next.some((size) => size > 0)) return normalizeOpenPanes(next);

  const keep = numeric.reduce((best, value, index) => (value >= numeric[best] ? index : best), 0);
  return normalizeOpenPanes(
    next.map((size, index) => (index === keep ? Math.max(numeric[keep], threshold) : size))
  );
}

/** Give every open pane, including the ones just expanded, an even share. */
export function expandEditorPanes(sizes: readonly number[], indexes: readonly number[]): number[] {
  const next = sizes.map((size) => (Number.isFinite(size) ? size : 0));
  for (const index of indexes) {
    if (index >= 0 && index < next.length) next[index] = 1;
  }
  const openCount = next.filter((size) => size > 0).length;
  if (!openCount) return [...sizes];
  const share = 100 / openCount;
  return normalizeOpenPanes(next.map((size) => (size > 0 ? share : 0)));
}

/**
 * Grid template for a split that has at least one collapsed pane.
 * Returns null while every pane is open so angular-split keeps its own tracks.
 */
export function editorGridTemplate(
  direction: 'horizontal' | 'vertical',
  sizes: readonly number[],
  collapsed: readonly boolean[]
): string | null {
  if (!collapsed.some(Boolean)) return null;
  const stacked = direction === 'vertical';
  const [first, second] = editorGutterTracks(collapsed, stacked);
  const columns = [fr(sizes[0]), `${first}px`, fr(sizes[1]), `${second}px`, fr(sizes[2])].join(' ');
  return direction === 'horizontal' ? `1fr / ${columns}` : `${columns} / 1fr`;
}

function fr(size: number): string {
  const value = Number.isFinite(size) ? size : 0;
  return `${Number(value.toFixed(4))}fr`;
}

function normalizeOpenPanes(sizes: number[]): number[] {
  const openIndexes = sizes.flatMap((size, index) => (size > 0 ? [index] : []));
  if (!openIndexes.length) return sizes;
  const openSum = openIndexes.reduce((sum, index) => sum + sizes[index], 0);
  const next = sizes.map((size) => (size > 0 ? (size / openSum) * 100 : 0));
  const rounded = next.map((size) => (size > 0 ? Math.round(size * 1000) / 1000 : 0));
  const drift = Math.round((100 - rounded.reduce((sum, size) => sum + size, 0)) * 1000) / 1000;
  const last = openIndexes[openIndexes.length - 1];
  rounded[last] = Math.round((rounded[last] + drift) * 1000) / 1000;
  return rounded;
}
