import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SeoService,
  documentTitle,
  seoDescription,
} from '@app/services/ui/seo.service';

function meta(attr: 'name' | 'property', key: string): string | null {
  return document.head.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
}

describe('SeoService', () => {
  let seo: SeoService;

  beforeEach(() => {
    seo = TestBed.inject(SeoService);
  });

  afterEach(() => {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    document.head.querySelector('script#seo-jsonld')?.remove();
  });

  it('documentTitle adds the site suffix, or uses the default', () => {
    expect(documentTitle('Public snippets')).toBe('Public snippets · Snippy');
    expect(documentTitle('  ')).toBe(DEFAULT_TITLE);
    expect(documentTitle(undefined)).toBe(DEFAULT_TITLE);
  });

  it('seoDescription collapses whitespace and trims to a word boundary', () => {
    expect(seoDescription(null)).toBe(DEFAULT_DESCRIPTION);
    expect(seoDescription('  a\n\n b  ')).toBe('a b');
    const long = 'word '.repeat(60);
    const out = seoDescription(long, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out.endsWith('word…')).toBe(true);
  });

  it('sets title, description, Open Graph, Twitter, and canonical tags', () => {
    seo.set({ title: 'Card kit by Ada', description: 'Cards', canonicalPath: '/ada/snippet/abc' });

    expect(document.title).toBe('Card kit by Ada · Snippy');
    expect(seo.pageTitle()).toBe('Card kit by Ada');
    expect(meta('name', 'description')).toBe('Cards');
    expect(meta('name', 'robots')).toBe('index, follow');
    expect(meta('property', 'og:title')).toBe('Card kit by Ada');
    expect(meta('property', 'og:url')).toMatch(/\/ada\/snippet\/abc$/);
    expect(meta('property', 'og:image')).toMatch(/example-snippet\.png$/);
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toMatch(
      /\/ada\/snippet\/abc$/
    );
  });

  it('noindex pages get robots noindex and no canonical link', () => {
    seo.set({ title: 'Public', canonicalPath: '/public' });
    seo.set({ title: 'Settings', noindex: true });
    expect(meta('name', 'robots')).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('update() refines the current page instead of replacing it', () => {
    seo.set({ title: 'Snippet', type: 'article', canonicalPath: '/a/snippet/x' });
    seo.update({ title: 'Loaded name', image: 'https://cdn.example/shot.png' });
    expect(document.title).toBe('Loaded name · Snippy');
    expect(meta('property', 'og:type')).toBe('article');
    expect(meta('property', 'og:image')).toBe('https://cdn.example/shot.png');
  });

  it('writes JSON-LD with `<` escaped so content cannot close the script tag', () => {
    seo.set({ title: 'x', jsonLd: { '@type': 'Thing', name: '</script><b>' } });
    const script = document.head.querySelector('script#seo-jsonld');
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(script?.textContent).not.toContain('</script>');
    expect(JSON.parse(script!.textContent!).name).toBe('</script><b>');

    seo.update({ jsonLd: null });
    expect(document.head.querySelector('script#seo-jsonld')).toBeNull();
  });
});
