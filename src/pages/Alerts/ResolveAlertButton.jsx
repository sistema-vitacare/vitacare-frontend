import { Button } from '@mui/material';
import { useCallback, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { resolveAlertContent as content } from '../../data/alertPages.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { resolveAlert } from '../../services/alertService.js';

/**
 * Botão Resolver com a confirmação, usado na lista e no detalhe. Resolver
 * vale para toda a equipe e não tem volta. Se outra pessoa resolveu antes
 * (`409 ALERT_ALREADY_RESOLVED`), a tela é avisada do mesmo jeito, para
 * recarregar o alerta já resolvido.
 */
export default function ResolveAlertButton({
  alert,
  onResolved,
  variant = 'outlined',
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const action = useCallback(() => resolveAlert(alert.id), [alert.id]);
  const { status, submit } = useSubmit(action);

  async function confirm() {
    const result = await submit();
    if (result.data || result.error.code === 'ALERT_ALREADY_RESOLVED') {
      setOpen(false);
      onResolved({ alreadyResolved: !result.data });
      return;
    }
    setError(content.unexpected);
  }

  return (
    <>
      <Button
        size="small"
        variant={variant}
        aria-label={content.resolveOf(alert.title)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {content.resolve}
      </Button>
      <ConfirmDialog
        open={open}
        title={content.dialog.title}
        text={content.dialog.text}
        confirmLabel={content.dialog.confirm}
        pending={status === 'submitting'}
        error={error}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
