import {
  Box,
  Card,
  Chip,
  Link,
  Pagination,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useId } from 'react';
import { Link as RouterLink } from 'react-router';
import { recordPath } from '../constants/routes.js';
import { followUpRecordsContent as content } from '../data/followUpRecords.js';
import { useResource } from '../hooks/useResource.js';
import { listFollowUps } from '../services/followUpService.js';
import { formatAnswer, formatDateTime } from '../utils/format.js';
import ResourceState from './ResourceState.jsx';

const PAGE_SIZE = 20;

function RecordItem({ record }) {
  const annulled = record.status === 'annulled';
  const visitedAt = formatDateTime(record.visitedAt);
  return (
    <Box
      component="li"
      sx={{
        py: 2,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
        opacity: annulled ? 0.75 : 1,
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
      >
        <Link
          component={RouterLink}
          to={recordPath(record.id)}
          aria-label={content.list.open(visitedAt)}
          variant="body2"
          sx={{ fontWeight: 700 }}
        >
          {visitedAt}
        </Link>
        <Typography variant="body2" color="text.secondary">
          {record.form.name} · {content.list.by} {record.author.name}
        </Typography>
        {annulled ? (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={content.list.annulled}
          />
        ) : null}
      </Stack>
      <Box
        sx={{
          mt: 1,
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 2.5,
          rowGap: 0.5,
          textDecoration: annulled ? 'line-through' : 'none',
        }}
      >
        {record.answers.map((answer) => (
          <Typography variant="body2" key={answer.fieldId}>
            {answer.name}: {formatAnswer(answer, content.answers)}
          </Typography>
        ))}
      </Box>
      {record.notes ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {content.list.notes}: {record.notes}
        </Typography>
      ) : null}
      {annulled ? (
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
          {content.list.annulledBy(
            record.annulment.annulledBy.name,
            formatDateTime(record.annulment.annulledAt),
          )}{' '}
          {content.list.reason}: {record.annulment.reason}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Registros de um paciente, do mais recente ao mais antigo, com os filtros
 * de `useFollowUpFilters`, paginados de 20 em 20. Cada registro leva ao
 * detalhe dele.
 */
export default function FollowUpList({ patientId, filters, update }) {
  const titleId = useId();
  const { from, to, formId, authorUserId, page } = filters;
  const load = useCallback(
    () =>
      listFollowUps({
        patientId,
        from: from || undefined,
        to: to || undefined,
        formId: formId || undefined,
        authorUserId: authorUserId || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [patientId, from, to, formId, authorUserId, page],
  );
  const records = useResource(load);
  const pagination = records.meta?.pagination;
  const filtered = Boolean(from || to || formId || authorUserId);

  return (
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Typography id={titleId} variant="h2">
        {content.list.title}
      </Typography>
      {records.status === 'success' ? (
        <Typography variant="body2" color="text.secondary">
          {content.list.count(pagination.total)}
        </Typography>
      ) : null}
      <Box sx={{ mt: 1 }}>
        <ResourceState
          resource={records}
          emptyText={filtered ? content.list.noResults : content.list.empty}
        >
          {(items) => (
            <Box
              component="ul"
              aria-labelledby={titleId}
              sx={{ m: 0, p: 0, listStyle: 'none' }}
            >
              {items.map((record) => (
                <RecordItem key={record.id} record={record} />
              ))}
            </Box>
          )}
        </ResourceState>
      </Box>
      {pagination && pagination.totalPages > 1 ? (
        <Pagination
          aria-label={content.list.paginationLabel}
          count={pagination.totalPages}
          page={pagination.page}
          color="primary"
          onChange={(_, value) => update({ page: value }, { keepPage: true })}
          getItemAriaLabel={(type, value) =>
            type === 'page'
              ? `Ir para a página ${value}`
              : `Ir para a página ${type === 'next' ? 'seguinte' : 'anterior'}`
          }
          sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}
        />
      ) : null}
    </Card>
  );
}
