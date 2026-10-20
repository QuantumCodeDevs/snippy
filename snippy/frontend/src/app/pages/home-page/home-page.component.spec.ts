import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomePageComponent } from '@app/pages/home-page/home-page.component';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('explains that a fork survives without its parent and that embeds stay public', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('A fork stands on its own');
    expect(text).toContain('Deleting the original does not delete the fork');
    expect(text).toContain('An embed plays only while that snippet is public');
  });
});
