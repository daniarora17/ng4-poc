import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PngTreeTableComponent } from './png-tree-table.component';

describe('PngTreeTableComponent', () => {
  let component: PngTreeTableComponent;
  let fixture: ComponentFixture<PngTreeTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PngTreeTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PngTreeTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
