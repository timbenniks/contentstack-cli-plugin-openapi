import { expect } from 'chai';
import { test } from '@oclif/test';
import * as fs from 'fs-extra';
import * as sinon from 'sinon';
import Generate from '../../../src/commands/openapi/generate';

describe('openapi:generate', () => {
  // Note: Full integration tests would require mocking CMA API calls
  // These tests verify basic command structure
  test
    .stdout()
    .stderr()
    .command(['openapi:generate'])
    .catch(/required/i)
    .it('should require stack flag');
});

