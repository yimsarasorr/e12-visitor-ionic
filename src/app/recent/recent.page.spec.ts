import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecentPage } from './recent.page';

describe('RecentPage', () => {
  let component: RecentPage;
  let fixture: ComponentFixture<RecentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RecentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
