// Listas fechadas e limites dos medicamentos, com os valores da API
// (`medication.types.ts` e `medicationFields.ts` do backend).

/** Unidades de dose, na ordem em que a tela as oferece. */
export const DOSE_UNITS = Object.freeze([
  'mg',
  'mcg',
  'g',
  'ml',
  'iu',
  'drops',
  'tablet',
  'capsule',
  'application',
]);

/** Vias de administração; a via é opcional. */
export const MEDICATION_ROUTES = Object.freeze([
  'oral',
  'sublingual',
  'topical',
  'transdermal',
  'inhalation',
  'nasal',
  'ophthalmic',
  'otic',
  'rectal',
  'vaginal',
  'subcutaneous',
  'intramuscular',
  'intravenous',
  'other',
]);

export const MEDICATION_STATUSES = Object.freeze(['active', 'inactive']);

export const MEDICATION_LIMITS = Object.freeze({
  name: 200,
  notes: 2000,
  maxDoseAmount: 9_999_999.999,
  doseDecimalPlaces: 3,
  minStartDate: '2000-01-01',
  maxEndDate: '2100-12-31',
  maxStartDaysAhead: 365,
  maxIntervalDays: 30,
  maxTimes: 24,
});
