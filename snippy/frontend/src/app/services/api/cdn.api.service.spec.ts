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

    const req = http.expectOne((request) => request.params.has('search'));
    req.flush({
      results: [lib('jquery', 'jquery.min.js'), lib('normalize', 'normalize.min.css')],
      total: 2,
      available: 2,
    });

    const detail = http.expectOne((request) => request.url.endsWith('/libraries/normalize'));
    detail.flush({
      version: '1.0.0',
      filename: 'normalize.min.css',
      assets: [{ version: '1.0.0', files: ['normalize.min.css'] }],
    });

    expect(hits.map((hit) => hit.name)).toEqual(['jquery']);
  });

  it('shows a JS-default library on the CSS tab when its file list also has CSS', () => {
    let hits: {
      name: string;
      url: string | null;
      cssUrl?: string | null;
      jsUrl?: string | null;
    }[] = [];
    api.searchLibraries('bootstrap', 'css').subscribe((value) => {
      hits = value;
    });

    const req = http.expectOne((request) => request.params.has('search'));
    req.flush({
      results: [lib('bootstrap', 'js/bootstrap.min.js'), lib('milligram', 'milligram.min.css')],
      total: 2,
      available: 2,
    });

    const detail = http.expectOne((request) => request.url.endsWith('/libraries/bootstrap'));
    detail.flush({
      version: '1.0.0',
      filename: 'js/bootstrap.min.js',
      assets: [
        {
          version: '1.0.0',
          files: ['css/bootstrap.min.css', 'css/bootstrap-grid.min.css', 'js/bootstrap.min.js'],
        },
      ],
    });

    expect(hits.map((hit) => hit.name)).toEqual(['bootstrap', 'milligram']);
    expect(hits[0].url).toBe(
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/1.0.0/css/bootstrap.min.css'
    );
    expect(hits[0].jsUrl).toBe(
      'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/1.0.0/js/bootstrap.min.js'
    );
  });

  it('treats a filename array as both types without a detail request', () => {
    let hits: {
      name: string;
      url: string | null;
      cssUrl?: string | null;
      jsUrl?: string | null;
    }[] = [];
    api.searchLibraries('both', 'css').subscribe((value) => {
      hits = value;
    });

    const req = http.expectOne((request) => request.params.has('search'));
    req.flush({
      results: [
        {
          name: 'both',
          description: 'both',
          version: '2.0.0',
          filename: ['both.min.css', 'both.min.js'],
          latest: 'https://cdnjs.cloudflare.com/ajax/libs/both/2.0.0/both.min.js',
        },
      ],
      total: 1,
      available: 1,
    });

    expect(hits).toEqual([
      {
        name: 'both',
        description: 'both',
        version: '2.0.0',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/both/2.0.0/both.min.css',
        cssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/both/2.0.0/both.min.css',
        jsUrl: 'https://cdnjs.cloudflare.com/ajax/libs/both/2.0.0/both.min.js',
      },
    ]);
  });

  it('resolves both CSS and JS files when the asset list has both', () => {
    let files: { resourceType?: string; url?: string }[] = [];
    api
      .resolveLibraryFiles({ name: 'bootstrap', description: '', version: '5.3.8', url: null })
      .subscribe((value) => {
        files = value;
      });

    const detail = http.expectOne((request) => request.url.endsWith('/libraries/bootstrap'));
    detail.flush({
      version: '5.3.8',
      filename: 'js/bootstrap.min.js',
      assets: [
        {
          version: '5.3.8',
          files: ['css/bootstrap.min.css', 'js/bootstrap.min.js', 'js/bootstrap.bundle.min.js'],
        },
      ],
    });

    expect(files).toEqual([
      {
        resourceType: 'css',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.8/css/bootstrap.min.css',
      },
      {
        resourceType: 'js',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.8/js/bootstrap.min.js',
      },
    ]);
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
