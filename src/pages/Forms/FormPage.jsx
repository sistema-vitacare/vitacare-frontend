import { Alert, Box, Button, Card, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import {
  Link as RouterLink,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import FormStatusChip from '../../components/FormStatusChip.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS, formPath } from '../../constants/routes.js';
import { formPageContent as content } from '../../data/formPage.js';
import { navLabels } from '../../data/navigation.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  createForm,
  deactivateForm,
  discardFormDraft,
  getForm,
  publishForm,
  reactivateForm,
  saveFormDraft,
  updateForm,
} from '../../services/formService.js';
import {
  emptyFormValues,
  fieldToValues,
  formToValues,
  toFieldInput,
  toFieldPayload,
  toFormDataPayload,
  validateFormData,
} from '../../utils/formEditor.js';
import { formatDate, formatDateTime } from '../../utils/format.js';
import FieldsEditor from './FieldsEditor.jsx';
import FormDataFields, { FormDataSummary } from './FormDataFields.jsx';

// O rascunho é o que está sendo montado; sem ele, a versão vigente.
function itemsFrom(form) {
  const fields = form?.draft?.fields ?? form?.currentVersion?.fields ?? [];
  return fields.map((field) => ({
    uid: field.id,
    ...toFieldPayload(fieldToValues(field)),
  }));
}

const sameFields = (a, b) =>
  JSON.stringify(a.map(toFieldInput)) === JSON.stringify(b.map(toFieldInput));

function errorMessage(error) {
  if (!error) {
    return null;
  }
  if (content.errors[error.code]) {
    return content.errors[error.code];
  }
  if (
    error.code === 'FORM_INVALID_FIELDS' ||
    error.code === 'VALIDATION_FAILED'
  ) {
    return content.errors.invalidFields;
  }
  return content.errors.unexpected;
}

function SectionCard({ title, children }) {
  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Card>
  );
}

function StatusAction({ form, onChanged }) {
  const active = form.status !== 'inactive';
  const [open, setOpen] = useState(false);
  // A ação fica presa à situação de quando o diálogo abriu: ao confirmar,
  // a situação muda enquanto o diálogo ainda fecha, e o texto não pode
  // trocar no meio da animação.
  const [deactivating, setDeactivating] = useState(active);
  const action = useCallback(
    () => (deactivating ? deactivateForm(form.id) : reactivateForm(form.id)),
    [deactivating, form.id],
  );
  const { status, error, submit } = useSubmit(action);
  const dialog = deactivating
    ? content.deactivateDialog
    : content.reactivateDialog;

  async function confirm() {
    const outcome = await submit();
    if (!outcome.error) {
      setOpen(false);
      onChanged(outcome.data);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        color={active ? 'error' : 'primary'}
        onClick={() => {
          setDeactivating(active);
          setOpen(true);
        }}
      >
        {active ? content.actions.deactivate : content.actions.reactivate}
      </Button>
      <ConfirmDialog
        open={open}
        title={dialog.title}
        text={dialog.text}
        confirmLabel={dialog.confirm}
        tone={deactivating ? 'error' : 'primary'}
        pending={status === 'submitting'}
        error={status === 'error' ? errorMessage(error) : null}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function fieldsNotice(form, dirty) {
  if (dirty) {
    return content.fields.unsaved;
  }
  const current = form?.currentVersion;
  if (form?.draft && current) {
    return content.fields.draftNotice(
      current.number + 1,
      formatDateTime(form.draft.updatedAt),
      current.number,
    );
  }
  if (form?.draft) {
    return content.fields.firstDraftNotice(
      formatDateTime(form.draft.updatedAt),
    );
  }
  return current ? content.fields.currentNotice(current.number) : null;
}

/**
 * Formulário novo ou existente: dados, campos por seção e as ações de
 * rascunho, publicação, descarte e situação. Quem só lê (o cuidador) e o
 * formulário desativado veem tudo sem edição.
 */
function FormEditor({ initialForm, initialNotice }) {
  const { can } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const isNew = form === null;
  const [values, setValues] = useState(() =>
    isNew ? emptyFormValues() : formToValues(form),
  );
  const [savedValues, setSavedValues] = useState(values);
  const [dataErrors, setDataErrors] = useState({});
  const [items, setItems] = useState(() => itemsFrom(form));
  const [savedItems, setSavedItems] = useState(items);
  const [notice, setNotice] = useState(initialNotice ?? null);
  const [fieldsError, setFieldsError] = useState(null);
  const [dialog, setDialog] = useState(null);

  const editable = isNew
    ? can(P.FORMS_CREATE)
    : can(P.FORMS_UPDATE) && form.status !== 'inactive';
  const dirtyData = JSON.stringify(values) !== JSON.stringify(savedValues);
  const dirtyFields = !sameFields(items, savedItems);
  const published = Boolean(form?.currentVersion);
  const canPublish = Boolean(form?.draft) && !dirtyFields;
  const canDiscard = dirtyFields || (published && Boolean(form?.hasDraft));

  const run = useCallback((action) => action(), []);
  const request = useSubmit(run);

  // Depois de cada ação, a tela passa a mostrar o formulário que a API
  // devolveu, com os campos do rascunho ou da versão vigente.
  function adopt(data, message) {
    setForm(data);
    const fresh = itemsFrom(data);
    setItems(fresh);
    setSavedItems(fresh);
    setNotice(message);
    setFieldsError(null);
  }

  function changeValues(changes) {
    setValues((current) => ({ ...current, ...changes }));
    setDataErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !(key in changes)),
      ),
    );
  }

  function checkData() {
    const errors = validateFormData(values);
    setDataErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function createNew() {
    const dataOk = checkData();
    if (items.length === 0) {
      setFieldsError(content.errors.empty);
      return;
    }
    if (!dataOk) {
      return;
    }
    const { data, error } = await request.submit(() =>
      createForm({
        ...toFormDataPayload(values),
        fields: items.map(toFieldInput),
      }),
    );
    if (error) {
      setFieldsError(errorMessage(error));
      return;
    }
    navigate(formPath(data.id), {
      replace: true,
      state: { notice: content.fields.draftSaved },
    });
  }

  async function saveData() {
    if (!checkData()) {
      return;
    }
    const { data, error } = await request.submit(() =>
      updateForm(form.id, toFormDataPayload(values)),
    );
    if (error) {
      setNotice(null);
      setDataErrors({ form: errorMessage(error) });
      return;
    }
    setForm(data);
    setSavedValues(values);
    setNotice(content.data.saved);
  }

  async function saveDraft() {
    if (items.length === 0) {
      setFieldsError(content.errors.empty);
      return;
    }
    const { data, error } = await request.submit(() =>
      saveFormDraft(form.id, { fields: items.map(toFieldInput) }),
    );
    if (error) {
      setFieldsError(errorMessage(error));
      return;
    }
    adopt(data, content.fields.draftSaved);
  }

  async function publish() {
    const { data, error } = await request.submit(() =>
      publishForm(form.id, published ? { confirmImpact: true } : {}),
    );
    setDialog(null);
    if (error) {
      setFieldsError(errorMessage(error));
      return;
    }
    adopt(data, content.fields.published(data.currentVersion.number));
  }

  async function discard() {
    setDialog(null);
    if (!(published && form.hasDraft)) {
      setItems(savedItems);
      setNotice(content.fields.discarded);
      return;
    }
    const { data, error } = await request.submit(() =>
      discardFormDraft(form.id),
    );
    if (error) {
      setFieldsError(errorMessage(error));
      return;
    }
    adopt(data, content.fields.discarded);
  }

  const pending = request.status === 'submitting';
  const header = isNew ? content.newTitle : form.name;
  const version = form?.currentVersion;

  return (
    <>
      <PageHeader
        title={header}
        subtitle={
          isNew
            ? null
            : version
              ? content.versionInfo(
                  version.number,
                  formatDate(version.publishedAt.slice(0, 10)),
                )
              : content.neverPublished
        }
        breadcrumbs={[{ label: navLabels.forms, to: PATHS.FORMS }]}
        actions={
          !isNew && can(P.FORMS_DEACTIVATE) ? (
            <StatusAction
              form={form}
              onChanged={(data) => {
                setForm(data);
                setNotice(null);
              }}
            />
          ) : null
        }
      />
      <Stack spacing={2.5}>
        {!isNew ? (
          <Box>
            <FormStatusChip status={form.status} />
          </Box>
        ) : null}
        {form?.status === 'inactive' ? (
          <Alert severity="warning">
            {content.inactiveNotice(
              formatDate(form.deactivatedAt.slice(0, 10)),
            )}
          </Alert>
        ) : null}
        {notice ? (
          <Alert severity="success" role="status">
            {notice}
          </Alert>
        ) : null}
        <SectionCard title={content.data.title}>
          {editable ? (
            <Stack spacing={2}>
              <FormDataFields
                values={values}
                errors={dataErrors}
                onChange={changeValues}
              />
              {dataErrors.form ? (
                <Alert severity="error">{dataErrors.form}</Alert>
              ) : null}
              {!isNew ? (
                <Box>
                  <Button
                    variant="outlined"
                    onClick={saveData}
                    disabled={!dirtyData}
                    loading={pending}
                  >
                    {content.data.save}
                  </Button>
                </Box>
              ) : null}
            </Stack>
          ) : (
            <FormDataSummary form={form} />
          )}
        </SectionCard>
        <SectionCard title={content.fields.title}>
          <Stack spacing={2}>
            {!isNew && editable && fieldsNotice(form, dirtyFields) ? (
              <Alert severity={dirtyFields ? 'warning' : 'info'}>
                {fieldsNotice(form, dirtyFields)}
              </Alert>
            ) : null}
            <FieldsEditor
              items={items}
              onItemsChange={(next) => {
                setItems(next);
                setFieldsError(null);
                setNotice(null);
              }}
              editable={editable}
            />
            {fieldsError ? <Alert severity="error">{fieldsError}</Alert> : null}
            {editable ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ justifyContent: 'flex-end', pt: 1 }}
              >
                {canDiscard && !isNew ? (
                  <Button
                    onClick={() => setDialog('discard')}
                    disabled={pending}
                  >
                    {content.fields.discard}
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  onClick={isNew ? createNew : saveDraft}
                  disabled={!isNew && !dirtyFields}
                  loading={pending}
                >
                  {content.fields.saveDraft}
                </Button>
                {!isNew ? (
                  <Button
                    variant="contained"
                    onClick={() =>
                      published ? setDialog('publish') : publish()
                    }
                    disabled={!canPublish}
                    loading={pending}
                  >
                    {content.fields.publish}
                  </Button>
                ) : null}
              </Stack>
            ) : null}
            {editable && !isNew && dirtyFields ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: { sm: 'right' } }}
              >
                {content.fields.publishHint}
              </Typography>
            ) : null}
          </Stack>
        </SectionCard>
      </Stack>
      {published ? (
        <ConfirmDialog
          open={dialog === 'publish'}
          title={content.publishDialog.title(version.number + 1)}
          text={content.publishDialog.text(version.number)}
          confirmLabel={content.publishDialog.confirm}
          pending={pending}
          onConfirm={publish}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <ConfirmDialog
        open={dialog === 'discard'}
        title={content.discardDialog.title}
        text={content.discardDialog.text}
        confirmLabel={content.discardDialog.confirm}
        tone="error"
        pending={pending}
        onConfirm={discard}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

/** Página do formulário (UC09, Figura 39): novo em `/formularios/novo`. */
export default function FormPage() {
  const { formId } = useParams();
  const location = useLocation();
  const load = useCallback(
    () =>
      formId ? getForm(formId) : Promise.resolve({ data: null, meta: {} }),
    [formId],
  );
  const resource = useResource(load);
  const initialNotice = location.state?.notice ?? null;

  if (!formId) {
    return <FormEditor initialForm={null} />;
  }
  if (resource.status === 'error' && resource.error.status === 404) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant="h1">{content.notFound}</Typography>
        <Box>
          <Button component={RouterLink} to={PATHS.FORMS} variant="contained">
            {content.backToList}
          </Button>
        </Box>
      </Stack>
    );
  }
  return (
    <ResourceState resource={resource}>
      {(form) => (
        <FormEditor
          key={form.id}
          initialForm={form}
          initialNotice={initialNotice}
        />
      )}
    </ResourceState>
  );
}
