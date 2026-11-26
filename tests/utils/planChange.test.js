// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { requestablePlans } from '../../src/utils/planChange.js';
import { BASIC, ENTERPRISE } from '../support/fixtures/organizations.js';

const plans = [BASIC, ENTERPRISE];

describe('requestablePlans', () => {
  it('oferece os outros planos do catálogo', () => {
    expect(
      requestablePlans(plans, {
        currentPlanId: ENTERPRISE.id,
        expired: false,
      }),
    ).toEqual([BASIC]);
  });

  it('com a vigência vencida, oferece também o plano atual, para renovar', () => {
    expect(
      requestablePlans(plans, {
        currentPlanId: ENTERPRISE.id,
        expired: true,
      }),
    ).toEqual(plans);
  });

  it('sem catálogo, não oferece nada', () => {
    expect(
      requestablePlans([], { currentPlanId: BASIC.id, expired: true }),
    ).toEqual([]);
  });
});
