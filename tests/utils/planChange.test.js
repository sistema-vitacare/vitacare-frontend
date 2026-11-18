// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BASIC_PLAN, ENTERPRISE_PLAN } from '../../src/data/mocks/plans.js';
import { requestablePlans } from '../../src/utils/planChange.js';

const plans = [BASIC_PLAN, ENTERPRISE_PLAN];

describe('requestablePlans', () => {
  it('oferece os outros planos do catálogo', () => {
    expect(
      requestablePlans(plans, {
        currentPlanId: ENTERPRISE_PLAN.id,
        expired: false,
      }),
    ).toEqual([BASIC_PLAN]);
  });

  it('com a vigência vencida, oferece também o plano atual, para renovar', () => {
    expect(
      requestablePlans(plans, {
        currentPlanId: ENTERPRISE_PLAN.id,
        expired: true,
      }),
    ).toEqual(plans);
  });

  it('sem catálogo, não oferece nada', () => {
    expect(
      requestablePlans([], { currentPlanId: BASIC_PLAN.id, expired: true }),
    ).toEqual([]);
  });
});
