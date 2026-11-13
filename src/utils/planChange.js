// Planos que a organização pode pedir, com a regra de
// `plan-change-requests` da API (manual conferido em 13/11/2026): o plano
// atual só vale como pedido de renovação, com a vigência vencida. Oferecer o
// atual fora disso levaria ao 422 `PLAN_CHANGE_SAME_PLAN`.

/** Planos do catálogo que a organização pode pedir, na ordem do catálogo. */
export function requestablePlans(plans, { currentPlanId, expired }) {
  return plans.filter((plan) => expired || plan.id !== currentPlanId);
}
