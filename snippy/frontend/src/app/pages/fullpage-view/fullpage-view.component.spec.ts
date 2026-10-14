import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullpageViewComponent } from '@app/pages/fullpage-view/fullpage-view.component';

describe('FullpageViewComponent', () => {
  let component: FullpageViewComponent;
  let fixture: ComponentFixture<FullpageViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullpageViewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FullpageViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
