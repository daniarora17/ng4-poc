import { TestBed, inject } from '@angular/core/testing';

import { NodeServiceService } from './node-service.service';

describe('NodeServiceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NodeServiceService]
    });
  });

  it('should be created', inject([NodeServiceService], (service: NodeServiceService) => {
    expect(service).toBeTruthy();
  }));
});
