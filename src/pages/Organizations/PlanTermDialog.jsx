import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useId, useState } from 'react';
import {
  planTermFieldErrors,
  planTermFormContent as content,
} from '../../data/organizationPlanPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  approveChangeRequest,
  assignOrganizationPlan,
} from '../../services/organizationService.js';
import { fieldErrorsFrom } from '../../utils/fieldErrors.js';
import { formatNumber, todayInSaoPaulo } from '../../utils/format.js';
import {
  endOfDayInSaoPaulo,
  planTermFieldErrors as termFieldErrors,
  planTermRuleError,
} from '../../utils/planTerm.js';

const LIMITS = ['userLimit', 'patientLimit'];
const NOTE_FIELDS = ['reason', 'decisionNote'];

function messageFor(field, code) {
  const messages = planTermFieldErrors[field];
  return messages[code] ?? messages.default;
}

// Motivo (atribuição) e justificativa (aprovação) ocupam o mesmo campo.
const toScreenFields = (errors) =>
  errors.map(({ field, code }) => ({
    field: NOTE_FIELDS.includes(field) ? 'note' : field,
    code,
  }));

/**
 * Corpo do PUT de plano ou da aprovação: campo em branco fica fora, e a API
 * volta ao padrão (sem data de fim e com o limite do catálogo). A data de
 * fim, escolhida como dia, vale até 23:59 desse dia em Brasília.
 */
function bodyFor(values, { plan, approving }) {
  const body = approving ? {} : { planId: values.planId };
  if (values.endsAt) {
    body.endsAt = endOfDayInSaoPaulo(values.endsAt);
  }
  if (plan?.expandable) {
    for (const field of LIMITS) {
      const text = values[field].trim();
      if (text !== '') {
        body[field] = Number(text);
      }
    }
  }
  const note = values.note.trim();
  if (note !== '') {
    body[approving ? 'decisionNote' : 'reason'] = note;
  }
  return body;
}

/**
 * Termo novo pela plataforma (UC04), num diálogo: a atribuição escolhe o
 * plano; a aprovação usa o plano pedido. Nos dois, data de fim, limites, só
 * no plano expansível e nunca abaixo do catálogo, e motivo ou justificativa
 * seguem a mesma regra da API, apontada antes do envio.
 */
export default function PlanTermDialog({
  organizationId,
  plans,
  currentPlanId,
  request = null,
  onClose,
  onSaved,
}) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const approving = request !== null;
  const [values, setValues] = useState({
    planId: approving ? request.requestedPlan.id : currentPlanId,
    endsAt: '',
    userLimit: '',
    patientLimit: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const plan = plans.find((item) => item.id === values.planId) ?? null;
  const action = useCallback(
    (body) =>
      approving
        ? approveChangeRequest(request.id, body)
        : assignOrganizationPlan(organizationId, body),
    [approving, request, organizationId],
  );
  const { status, submit } = useSubmit(action);
  const pending = status === 'submitting';

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const body = bodyFor(values, { plan, approving });
    const noteField = approving ? 'decisionNote' : 'reason';
    const fieldErrors = termFieldErrors(body, { noteField });
    const rule =
      fieldErrors.length === 0 && plan
        ? planTermRuleError(body, { plan, now: new Date() })
        : null;
    const found = [...fieldErrors, ...(rule ? [rule] : [])];
    if (found.length > 0) {
      setErrors(fieldErrorsFrom(toScreenFields(found)));
      setFormError(content.invalidFields);
      return;
    }
    const { data, error } = await submit(body);
    if (data) {
      onSaved();
      return;
    }
    if (error.fields) {
      setErrors(fieldErrorsFrom(toScreenFields(error.fields)));
      setFormError(content.invalidFields);
      return;
    }
    setFormError(error.status === 409 ? error.message : content.unexpected);
  }

  const fieldProps = (field, label, helper) => ({
    label,
    value: values[field],
    onChange: (event) => change(field, event.target.value),
    error: Boolean(errors[field]),
    helperText: errors[field] ? messageFor(field, errors[field]) : helper,
    fullWidth: true,
  });

  return (
    <Dialog
      open
      onClose={pending ? undefined : onClose}
      aria-labelledby={titleId}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
    >
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'contents' }}
      >
        <DialogTitle id={titleId}>
          {approving ? content.approveTitle : content.assignTitle}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {approving
                ? content.approveIntro(request.requestedPlan.name)
                : content.assignIntro}
            </Typography>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            {approving ? null : (
              <TextField
                {...fieldProps('planId', content.plan)}
                select
                required
                slotProps={{
                  select: {
                    renderValue: (planId) =>
                      plans.find((item) => item.id === planId)?.name ?? '',
                  },
                }}
              >
                {plans.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              {...fieldProps('endsAt', content.endsAt, content.endsAtHelper)}
              type="date"
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: todayInSaoPaulo() },
              }}
            />
            {plan?.expandable ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  {...fieldProps(
                    'userLimit',
                    content.userLimit,
                    content.limitHelper(formatNumber(plan.userLimit)),
                  )}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
                <TextField
                  {...fieldProps(
                    'patientLimit',
                    content.patientLimit,
                    content.limitHelper(formatNumber(plan.patientLimit)),
                  )}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
              </Stack>
            ) : null}
            {plan && !plan.expandable ? (
              <Typography variant="body2" color="text.secondary">
                {content.fixedLimits(
                  formatNumber(plan.userLimit),
                  formatNumber(plan.patientLimit),
                )}
              </Typography>
            ) : null}
            <TextField
              {...fieldProps(
                'note',
                approving ? content.decisionNote : content.reason,
                content.noteHelper,
              )}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            {content.cancel}
          </Button>
          <Button type="submit" variant="contained" loading={pending}>
            {approving ? content.approve : content.assign}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
