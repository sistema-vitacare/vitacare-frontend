// Endereço da tela do item de um evento de auditoria. O link só aparece
// quando a tela existe, o item é da organização da sessão e a sessão pode
// abrir a tela; fora disso o item fica como texto, para não levar a uma
// página que responderia 403 ou 404.
import { PERMISSIONS as P } from '../constants/permissions.js';
import {
  PATHS,
  alertPath,
  formPath,
  patientPath,
  recordPath,
  userPath,
} from '../constants/routes.js';

const SCREENS = {
  patient: [P.PATIENTS_READ, patientPath],
  user: [P.USERS_READ, userPath],
  follow_up_record: [P.PATIENT_HISTORY_READ, recordPath],
  alert: [P.ALERTS_READ, alertPath],
  follow_up_form: [P.FORMS_READ, formPath],
  organization: [P.ORGANIZATION_READ, () => PATHS.SETTINGS],
};

/** Caminho da tela do item, ou `null` quando não há tela a abrir. */
export function auditEntityPath(event, { organizationId, can }) {
  const screen = SCREENS[event.entity?.type];
  if (
    !screen ||
    !event.entity.id ||
    event.organization?.id !== organizationId
  ) {
    return null;
  }
  const [permission, path] = screen;
  return can(permission) ? path(event.entity.id) : null;
}
