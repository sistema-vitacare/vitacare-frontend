import { Stack, Typography } from '@mui/material';
import { managementReportContent as content } from '../../data/managementReports.js';
import { formatDate } from '../../utils/format.js';

/** Período resolvido pela API e condição aplicada, acima de cada relatório. */
export default function ReportHeader({ report }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="body2" color="text.secondary">
        {content.period(
          formatDate(report.period.from),
          formatDate(report.period.to),
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {content.condition(report.condition)}
      </Typography>
    </Stack>
  );
}
