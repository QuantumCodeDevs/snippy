import {
  collapseEditorPanes,
  editorGridTemplate,
  editorGutterTracks,
  expandEditorPanes,
  gutterPaneIds,
  maximizeEditorPane,
  minimizeEditorPane,
} from './editor-pane-layout';

describe('editor pane collapse', () => {
  it('collapses a pane dragged under 8 percent and shares the rest', () => {
    expect(collapseEditorPanes([40, 5, 55])).toEqual([42.105, 0, 57.895]);
  });

  it('keeps the last open pane open', () => {
    expect(collapseEditorPanes([2, 3, 4])).toEqual([0, 0, 100]);
  });

  it('clears a collapse once the pane is dragged back out', () => {
    expect(collapseEditorPanes([20, 0, 80])[1]).toBe(0);
    expect(collapseEditorPanes([40, 20, 40])).toEqual([40, 20, 40]);
  });

  it('draws a collapsed pane on its trailing gutter, and the last pane on the gutter before it', () => {
    expect(gutterPaneIds([true, false, false], 1)).toEqual(['html']);
    expect(gutterPaneIds([false, true, false], 2)).toEqual(['css']);
    expect(gutterPaneIds([false, false, true], 2)).toEqual(['js']);
    expect(gutterPaneIds([false, true, true], 2)).toEqual(['css', 'js']);
  });

  it('grows only the gutter that holds a label', () => {
    expect(editorGutterTracks([false, true, false], false)).toEqual([0, 36]);
    expect(editorGutterTracks([false, true, true], false)).toEqual([0, 72]);
    expect(editorGutterTracks([false, true, true], true)).toEqual([0, 36]);
    expect(editorGutterTracks([false, false, false], false)).toEqual([14, 14]);
  });

  it('maximizes one pane and collapses the others', () => {
    expect(maximizeEditorPane([33, 33, 34], 0)).toEqual([100, 0, 0]);
    expect(maximizeEditorPane([0, 0, 100], 2)).toEqual([0, 0, 100]);
  });

  it('minimizes one pane and leaves the last open pane alone', () => {
    const minimized = minimizeEditorPane([33, 33, 34], 1);
    expect(minimized[1]).toBe(0);
    expect(minimized[0] + minimized[2]).toBeCloseTo(100);
    expect(minimizeEditorPane([0, 0, 100], 2)).toEqual([0, 0, 100]);
  });

  it('expands a pane to an even share', () => {
    expect(expandEditorPanes([0, 0, 100], [1])).toEqual([0, 50, 50]);
  });

  it('leaves the split grid alone while every pane is open', () => {
    expect(editorGridTemplate('horizontal', [33, 33, 34], [false, false, false])).toBeNull();
    expect(editorGridTemplate('horizontal', [50, 0, 50], [false, true, false])).toBe(
      '1fr / 50fr 0px 0fr 36px 50fr'
    );
  });
});
