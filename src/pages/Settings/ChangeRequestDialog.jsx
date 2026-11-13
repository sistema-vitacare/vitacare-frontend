import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useId, useState } from 'react';
import {
  changeRequestFormContent as content,
  planSectionContent,
} from '../../data/settingsPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  createChangeRequest,
  listPlans,
} from '../../services/organizationService.js';
import { formatNumber } from '../../utils/format.js';
import { requestablePlans } from '../../utils/planChange.js';

const NOTES_MAX = 500;

function PlanOption({ plan, current }) {
  const descriptionId = useId();
  return (
    <FormControlLabel
      value={plan.id}
      sx={{ alignItems: 'flex-start', m: 0, gap: 1 }}
      control={
        <Radio
          slotProps={{
            input: current ? { 'aria-describedby': descriptionId } : {},
          }}
        />
      }
      label={
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontWeight: 650 }}>{plan.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {content.limits(
              formatNumber(plan.userLimit),
              formatNumber(plan.patientLimit),
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {plan.description}
          </Typography>
          {current ? (
            <Typography
              id={descriptionId}
              variant="caption"
              color="text.secondary"
            >
              {content.current}
            </Typography>
          ) : null}
        </Box>
      }
    />
  );
}

/**
 * Pedido de mudança de plano (UC04, passos 4 e 5): o administrador escolhe
 * um plano do catálogo e pode deixar uma observação. O plano atual só
 * aparece para renovar uma vigência vencida, como a API aceita.
 */
export default function ChangeRequestDialog({
  currentPlanId,
  expired,
  onClose,
  onSent,
}) {
  const titleId = useId();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const catalog = useResource(listPlans);
  const [planId, setPlanId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const { status, error, submit } = useSubmit(createChangeRequest);
  const pending = status === 'submitting';
  const options = catalog.data
    ? requestablePlans(catalog.data, { currentPlanId, expired })
    : [];

  async function send(event) {
    event.preventDefault();
    const text = notes.trim();
    const found = {
      ...(planId ? {} : { planId: content.choosePlan }),
      ...(text.length > NOTES_MAX ? { notes: content.notesTooLong } : {}),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    const outcome = await submit({
      requestedPlanId: planId,
      notes: text || null,
    });
    if (outcome.data) {
      onSent();
    }
  }

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
        onSubmit={send}
        sx={{ display: 'contents' }}
      >
        <DialogTitle id={titleId}>{content.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {content.intro}
            </Typography>
            {status === 'error' ? (
              <Alert severity="error">
                {error?.message ?? planSectionContent.unexpected}
              </Alert>
            ) : null}
            <FormControl error={Boolean(errors.planId)}>
              <FormLabel>{content.planLabel}</FormLabel>
              <RadioGroup
                value={planId}
                onChange={(event) => {
                  setPlanId(event.target.value);
                  setErrors((current) => ({ ...current, planId: undefined }));
                }}
              >
                {options.map((plan) => (
                  <PlanOption
                    key={plan.id}
                    plan={plan}
                    current={plan.id === currentPlanId}
                  />
                ))}
              </RadioGroup>
              {errors.planId ? (
                <FormHelperText>{errors.planId}</FormHelperText>
              ) : null}
            </FormControl>
            <TextField
              label={content.notes}
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                setErrors((current) => ({ ...current, notes: undefined }));
              }}
              error={Boolean(errors.notes)}
              helperText={errors.notes ?? content.notesHelper}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>
            {content.cancel}
          </Button>
          <Button type="submit" variant="contained" loading={pending}>
            {content.submit}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
