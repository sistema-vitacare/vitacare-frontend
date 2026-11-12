import {
  Alert,
  Box,
  Button,
  Card,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import {
  FilePdf,
  Image as ImageIcon,
  Paperclip,
  Trash,
} from '@phosphor-icons/react';
import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { followUpDetailContent } from '../../data/followUpPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  listAttachments,
  removeAttachment,
  uploadAttachment,
} from '../../services/attachmentService.js';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_LIMIT,
  attachmentFileError,
  formatFileSize,
} from '../../utils/attachments.js';
import { formatDateTime } from '../../utils/format.js';

const content = followUpDetailContent.attachments;

const errorText = (code) => content.errors[code] ?? content.errors.unexpected;

/**
 * Anexos do registro. A cuidadora autora anexa no registro válido de
 * paciente ativo, até 5; o profissional e o administrador removem
 * qualquer anexo, e a cuidadora, os que ela enviou. O download do arquivo
 * entra com a integração.
 */
export default function AttachmentsSection({ record, patientActive }) {
  const { can, session } = useSession();
  const inputRef = useRef(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  // O anexo escolhido fica guardado enquanto o diálogo fecha, para o texto
  // não mudar no meio da animação.
  const [removing, setRemoving] = useState(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const load = useCallback(() => listAttachments(record.id), [record.id]);
  const attachments = useResource(load);
  const run = useCallback((action) => action(), []);
  const request = useSubmit(run);
  const items = attachments.data ?? [];
  const isAuthor = record.author.id === session.user.id;
  const canUpload =
    can(P.FOLLOW_UPS_CREATE) &&
    isAuthor &&
    record.status === 'valid' &&
    patientActive &&
    attachments.status !== 'loading' &&
    items.length < ATTACHMENT_LIMIT;
  const canRemove = (attachment) =>
    can(P.FOLLOW_UPS_ANNUL) ||
    (can(P.FOLLOW_UPS_CREATE) && attachment.uploadedBy.id === session.user.id);

  async function upload(event) {
    const [file] = event.target.files;
    // O mesmo arquivo pode ser escolhido de novo depois de um erro.
    event.target.value = '';
    if (!file) {
      return;
    }
    const problem = attachmentFileError(file);
    setMessage(null);
    if (problem) {
      setError(errorText(problem));
      return;
    }
    const outcome = await request.submit(() =>
      uploadAttachment(record.id, file),
    );
    if (outcome.error) {
      setError(errorText(outcome.error.code));
      return;
    }
    setError(null);
    setMessage(content.uploaded);
    attachments.retry();
  }

  async function confirmRemove() {
    const outcome = await request.submit(() =>
      removeAttachment(record.id, removing.id),
    );
    setRemoveOpen(false);
    if (outcome.error) {
      setError(errorText(outcome.error.code));
      return;
    }
    setError(null);
    setMessage(content.removed);
    attachments.retry();
  }

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h2">{content.title}</Typography>
        {canUpload ? (
          <>
            <Button
              variant="outlined"
              startIcon={<Paperclip aria-hidden="true" />}
              onClick={() => inputRef.current?.click()}
              loading={request.status === 'submitting'}
            >
              {content.add}
            </Button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept={ATTACHMENT_ACCEPT}
              aria-label={content.add}
              onChange={upload}
            />
          </>
        ) : null}
      </Stack>
      {canUpload ? (
        <Typography variant="caption" color="text.secondary">
          {content.rules}
        </Typography>
      ) : null}
      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
        {message ? (
          <Alert severity="success" role="status">
            {message}
          </Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <ResourceState resource={attachments} emptyText={content.empty}>
          {(list) => (
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {list.map((attachment) => {
                const Icon =
                  attachment.contentType === 'application/pdf'
                    ? FilePdf
                    : ImageIcon;
                return (
                  <Stack
                    key={attachment.id}
                    component="li"
                    direction="row"
                    spacing={1.5}
                    sx={{
                      py: 1.25,
                      alignItems: 'center',
                      borderBottom: 1,
                      borderColor: 'divider',
                      '&:last-of-type': { borderBottom: 0 },
                    }}
                  >
                    <Icon size={24} aria-hidden="true" />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}
                      >
                        {attachment.fileName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {content.kinds[attachment.contentType]} ·{' '}
                        {formatFileSize(attachment.sizeBytes)} ·{' '}
                        {content.sentBy(
                          attachment.uploadedBy.name,
                          formatDateTime(attachment.uploadedAt),
                        )}
                      </Typography>
                    </Box>
                    {canRemove(attachment) ? (
                      <IconButton
                        aria-label={content.remove(attachment.fileName)}
                        onClick={() => {
                          setRemoving(attachment);
                          setRemoveOpen(true);
                        }}
                      >
                        <Trash size={18} aria-hidden="true" />
                      </IconButton>
                    ) : null}
                  </Stack>
                );
              })}
            </Box>
          )}
        </ResourceState>
      </Stack>
      <ConfirmDialog
        open={removeOpen}
        title={content.removeDialog.title}
        text={content.removeDialog.text(removing?.fileName ?? '')}
        confirmLabel={content.removeDialog.confirm}
        tone="error"
        pending={request.status === 'submitting'}
        onConfirm={confirmRemove}
        onClose={() => setRemoveOpen(false)}
      />
    </Card>
  );
}
