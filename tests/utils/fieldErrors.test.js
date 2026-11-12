// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { fieldErrorsFrom } from '../../src/utils/fieldErrors.js';

describe('fieldErrorsFrom', () => {
  it('guarda o primeiro código de cada campo', () => {
    expect(
      fieldErrorsFrom([
        { field: 'name', code: 'MIN_LENGTH' },
        { field: 'times', code: 'ARRAY_UNIQUE' },
        { field: 'name', code: 'MAX_LENGTH' },
      ]),
    ).toEqual({ name: 'MIN_LENGTH', times: 'ARRAY_UNIQUE' });
    expect(fieldErrorsFrom([])).toEqual({});
  });
});
