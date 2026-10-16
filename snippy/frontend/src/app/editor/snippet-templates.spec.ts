import {
  SNIPPET_TEMPLATES,
  templateById,
  templateFromSnippet,
  templateLanguages,
} from '@app/editor/snippet-templates';

describe('snippet-templates', () => {
  it('has unique starter ids, all marked as starters', () => {
    const ids = SNIPPET_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SNIPPET_TEMPLATES.every((t) => t.source === 'starter')).toBe(true);
  });

  it('templateById falls back to the blank starter', () => {
    expect(templateById('grid').id).toBe('grid');
    expect(templateById('missing').id).toBe('blank');
    expect(templateById(null).id).toBe('blank');
  });

  it('templateLanguages lists only panes with content', () => {
    expect(templateLanguages({ html: '<p></p>', css: '  ', js: 'x()' })).toEqual(['HTML', 'JS']);
    expect(templateLanguages(templateById('blank'))).toEqual([]);
  });

  it('templateFromSnippet copies panes, libraries, and tags without sharing references', () => {
    const cdn = [{ resourceType: 'css', url: 'https://cdn.example/a.css' }];
    const tags = ['ui'];
    const tpl = templateFromSnippet({
      shortId: 'abc1234',
      name: 'Card kit',
      description: 'Reusable cards',
      tags,
      cdnResources: cdn,
      snippetFiles: [
        { fileType: 'html', content: '<div class="card"></div>' },
        { fileType: 'css', content: '.card{}' },
        { fileType: 'js', content: '' },
      ],
    });

    expect(tpl).toMatchObject({
      id: 'user:abc1234',
      name: 'Card kit',
      description: 'Reusable cards',
      html: '<div class="card"></div>',
      css: '.card{}',
      js: '',
      source: 'user',
      tags: ['ui'],
    });
    expect(tpl.cdnResources).toEqual(cdn);
    expect(tpl.cdnResources![0]).not.toBe(cdn[0]);
    expect(tpl.tags).not.toBe(tags);
  });

  it('templateFromSnippet tolerates missing files', () => {
    const tpl = templateFromSnippet({ snippetId: 'id1' });
    expect(tpl).toMatchObject({ name: 'Untitled template', html: '', css: '', js: '' });
  });
});
