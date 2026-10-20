import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CdnApiService } from './cdn.api.service';

describe('CdnApiService search', () => {
  let api: CdnApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CdnApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps only the tab extension and caps the list at 12', () => {
    const results = [
      lib('jquery', 'jquery.min.js'),
      ...Array.from({ length: 14 }, (_, index) => lib(`sheet-${index}`, `sheet-${index}.min.css`)),
      lib('late-sheet', 'late-sheet.min.css'),
    ];

    let hits: { name: string; url: string | null }[] = [];
    api.searchLibraries('sheet', 'css').subscribe((value) => {
      hits = value;
    });

    const req = http.expectOne((request) => request.url.includes('/libraries'));
    expect(Number(req.request.params.get('limit'))).toBeGreaterThan(12);
    req.flush({ results, total: results.length, available: results.length });

    expect(hits.map((hit) => hit.name)).toEqual(
      Array.from({ length: 12 }, (_, index) => `sheet-${index}`)
    );
    expect(hits.every((hit) => hit.url?.endsWith('.css'))).toBe(true);
  });

  it('keeps a library on the JS tab when its default file is javascript', () => {
    let hits: { name: string }[] = [];
    api.searchLibraries('jquery', 'js').subscribe((value) => {
      hits = value;
    });

    const req = http.expectOne((request) => request.url.includes('/libraries'));
    req.flush({
      results: [lib('jquery', 'jquery.min.js'), lib('normalize', 'normalize.min.css')],
      total: 2,
      available: 2,
    });

    expect(hits.map((hit) => hit.name)).toEqual(['jquery']);
  });
});

function lib(name: string, filename: string) {
  return {
    name,
    description: name,
    version: '1.0.0',
    filename,
    latest: `https://cdnjs.cloudflare.com/ajax/libs/${name}/1.0.0/${filename}`,
  };
}
