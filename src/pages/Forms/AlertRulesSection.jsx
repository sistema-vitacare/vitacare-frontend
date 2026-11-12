import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Plus } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import SeverityChip from '../../components/SeverityChip.jsx';
import { alertOperatorLabels } from '../../data/alertPages.js';
import { alertRuleSectionContent as content } from '../../data/alertRuleSection.js';
import { useResource } from '../../hooks/useResource.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  deactivateAlertRule,
  listAlertRules,
  reactivateAlertRule,
} from '../../services/alertRuleService.js';
import { monitorableFields } from '../../utils/alertRuleForm.js';
import { formatNumber } from '../../utils/format.js';
import AlertRuleDialog from './AlertRuleDialog.jsx';

// Um formulário com mais de 100 regras não é o caso desta tela.
const RULES_LIMIT = 100;

function conditionText(rule) {
  const { field } = rule;
  const reference = formatNumber(rule.referenceValue);
  return content.condition(
    field.name,
    alertOperatorLabels[rule.operator],
    field.unit ? `${reference} ${field.unit}` : reference,
  );
}

function RuleItem({ rule, onEdit, onDeactivate, onReactivate }) {
  const active = rule.status === 'active';
  return (
    <Stack
      component="li"
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      sx={{
        py: 2,
        '&:not(:last-of-type)': { borderBottom: 1, borderColor: 'divider' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 650 }}>
            {rule.name}
          </Typography>
          <SeverityChip severity={rule.severity} />
          <Chip
            size="small"
            label={content.status[rule.status]}
            color={active ? 'success' : 'default'}
            variant={active ? 'filled' : 'outlined'}
          />
        </Stack>
        <Typography variant="body2">{conditionText(rule)}</Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          {rule.patient ? content.onlyFor(rule.patient.name) : content.everyone}
        </Typography>
        {rule.description ? (
          <Typography variant="caption" color="text.secondary" component="p">
            {rule.description}
          </Typography>
        ) : null}
      </Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexShrink: 0, alignItems: 'flex-start' }}
      >
        {active ? (
          <>
            <Button
              size="small"
              variant="outlined"
              aria-label={content.editOf(rule.name)}
              onClick={onEdit}
            >
              {content.edit}
            </Button>
            <Button
              size="small"
              color="error"
              aria-label={content.deactivateOf(rule.name)}
              onClick={onDeactivate}
            >
              {content.deactivate}
            </Button>
          </>
        ) : (
          <Button
            size="small"
            variant="outlined"
            aria-label={content.reactivateOf(rule.name)}
            onClick={onReactivate}
          >
            {content.reactivate}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function RulesList({ form }) {
  const load = useCallback(
    () => listAlertRules({ formId: form.id, limit: RULES_LIMIT }),
    [form.id],
  );
  const rules = useResource(load);
  // `null` fechado; `{ rule: null }` regra nova; com regra, edição.
  const [editing, setEditing] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);
  const canCreate =
    form.status === 'active' &&
    monitorableFields(form.currentVersion).length > 0;

  const changeStatus = useCallback(
    ({ rule, active }) =>
      active ? reactivateAlertRule(rule.id) : deactivateAlertRule(rule.id),
    [],
  );
  const statusChange = useSubmit(changeStatus);

  async function setActive(rule, active) {
    setActionError(null);
    const { data, error } = await statusChange.submit({ rule, active });
    if (data) {
      setDeactivating(null);
      setNotice(active ? content.reactivated : content.deactivated);
      rules.retry();
      return;
    }
    setActionError(content.errors[error.code] ?? content.unexpected);
  }

  function saved() {
    setEditing(null);
    setNotice(content.saved);
    rules.retry();
  }

  return (
    <Stack spacing={2}>
      <Alert severity="info">{content.rules}</Alert>
      {form.status === 'inactive' ? (
        <Alert severity="warning">{content.inactiveForm}</Alert>
      ) : null}
      {form.status === 'active' && !canCreate ? (
        <Typography color="text.secondary">
          {content.noNumericFields}
        </Typography>
      ) : null}
      {notice ? (
        <Alert severity="success" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}
      {actionError && !deactivating ? (
        <Alert severity="error">{actionError}</Alert>
      ) : null}
      <ResourceState resource={rules} emptyText={content.empty}>
        {(items) => (
          <Box
            component="ul"
            aria-label={content.listLabel}
            sx={{ m: 0, p: 0, listStyle: 'none' }}
          >
            {items.map((rule) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                onEdit={() => setEditing({ rule })}
                onDeactivate={() => {
                  setActionError(null);
                  setDeactivating(rule);
                }}
                onReactivate={() => setActive(rule, true)}
              />
            ))}
          </Box>
        )}
      </ResourceState>
      {canCreate ? (
        <Box>
          <Button
            variant="outlined"
            startIcon={<Plus size={18} />}
            onClick={() => setEditing({ rule: null })}
          >
            {content.add}
          </Button>
        </Box>
      ) : null}
      {editing ? (
        <AlertRuleDialog
          form={form}
          rule={editing.rule}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      ) : null}
      <ConfirmDialog
        open={deactivating !== null}
        title={content.deactivateDialog.title(deactivating?.name ?? '')}
        text={content.deactivateDialog.text}
        confirmLabel={content.deactivateDialog.confirm}
        tone="error"
        pending={statusChange.status === 'submitting'}
        error={deactivating ? actionError : null}
        onConfirm={() => setActive(deactivating, false)}
        onClose={() => setDeactivating(null)}
      />
    </Stack>
  );
}

/**
 * Regras de alerta do formulário (UC09, passo 5; RF013), na página dele. Só
 * quem configura regras a vê, porque a API só deixa essa permissão ler as
 * regras. Formulário só em rascunho ainda não tem campo para monitorar.
 */
export default function AlertRulesSection({ form }) {
  return (
    <SectionCard title={content.title} subtitle={content.subtitle}>
      {form.currentVersion ? (
        <RulesList form={form} />
      ) : (
        <Typography color="text.secondary">{content.notPublished}</Typography>
      )}
    </SectionCard>
  );
}
