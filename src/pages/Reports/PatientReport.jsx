import { Box, Chip, Stack, Typography } from '@mui/material';
import { useCallback } from 'react';
import DefinitionList from '../../components/DefinitionList.jsx';
import EvolutionSeriesCard from '../../components/EvolutionSeriesCard.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import PeriodFields from '../../components/PeriodFields.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { followUpRecordsContent } from '../../data/followUpRecords.js';
import { doseUnitNames } from '../../data/medicationPages.js';
import { patientReportContent as content } from '../../data/patientReport.js';
import { patientStatusLabels, sexLabels } from '../../data/patientFields.js';
import { useReportFilters } from '../../hooks/useReportFilters.js';
import { useResource } from '../../hooks/useResource.js';
import {
  exportPatientReportPdf,
  getPatientReport,
} from '../../services/reportService.js';
import {
  formatAnswer,
  formatDate,
  formatDateTime,
  formatDose,
} from '../../utils/format.js';
import ExportPdfButton from './ExportPdfButton.jsx';

function Identification({ report }) {
  const { patient } = report;
  const labels = content.identification;
  return (
    <SectionCard title={labels.title}>
      <DefinitionList
        rows={[
          [labels.birthDate, formatDate(patient.birthDate)],
          [labels.sex, sexLabels[patient.sex] ?? labels.none],
          [labels.mainCondition, patient.mainCondition ?? labels.none],
          [
            labels.secondaryConditions,
            patient.secondaryConditions.length > 0
              ? patient.secondaryConditions.join(', ')
              : labels.none,
          ],
          [labels.responsible, patient.responsible?.name ?? labels.none],
          [labels.status, patientStatusLabels[patient.status]],
          [labels.organization, report.organization.name],
        ]}
      />
    </SectionCard>
  );
}

function Counts({ title, items }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
        {items.map(([key, name, total]) => (
          <Chip
            key={key}
            size="small"
            variant="outlined"
            label={content.summary.count(name, total)}
          />
        ))}
      </Stack>
    </Box>
  );
}

function Summary({ records }) {
  const labels = content.summary;
  const visit = (instant) => (instant ? formatDateTime(instant) : labels.none);
  return (
    <SectionCard title={labels.title}>
      <Stack spacing={2}>
        <DefinitionList
          rows={[
            [labels.total, String(records.total)],
            [labels.first, visit(records.firstVisitedAt)],
            [labels.last, visit(records.lastVisitedAt)],
          ]}
        />
        {records.total > 0 ? (
          <>
            <Counts
              title={labels.byForm}
              items={records.byForm.map((item) => [
                item.formId,
                item.formName,
                item.total,
              ])}
            />
            <Counts
              title={labels.byAuthor}
              items={records.byAuthor.map((item) => [
                item.userId,
                item.name,
                item.total,
              ])}
            />
          </>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

function Evolution({ series }) {
  return (
    <SectionCard title={content.evolution.title}>
      {series.length === 0 ? (
        <Typography color="text.secondary">
          {content.evolution.empty}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          }}
        >
          {series.map((item) => (
            <EvolutionSeriesCard key={item.fieldKey} series={item} />
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

function Records({ records }) {
  const labels = content.records;
  if (records.total === 0) {
    return (
      <SectionCard title={labels.title}>
        <Typography color="text.secondary">{labels.empty}</Typography>
      </SectionCard>
    );
  }
  return (
    <SectionCard title={labels.title}>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {records.items.map((record) => (
          <Box
            component="li"
            key={record.id}
            sx={{
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 0 },
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatDateTime(record.visitedAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {record.form.name} · {labels.by} {record.author.name}
              </Typography>
              {record.status === 'annulled' ? (
                <Chip
                  size="small"
                  color="error"
                  variant="outlined"
                  label={labels.annulled}
                />
              ) : null}
            </Stack>
            <Box
              sx={{
                mt: 0.5,
                display: 'flex',
                flexWrap: 'wrap',
                columnGap: 2.5,
                rowGap: 0.5,
              }}
            >
              {record.answers.map((answer) => (
                <Typography variant="body2" key={answer.fieldId}>
                  {answer.name}:{' '}
                  {formatAnswer(answer, followUpRecordsContent.answers)}
                </Typography>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </SectionCard>
  );
}

function Medications({ medications }) {
  const labels = content.medications;
  return (
    <SectionCard title={labels.title}>
      {medications.length === 0 ? (
        <Typography color="text.secondary">{labels.empty}</Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {medications.map((medication) => (
            <Typography component="li" variant="body2" key={medication.id}>
              <Box component="span" sx={{ fontWeight: 650 }}>
                {medication.name}
              </Box>{' '}
              ·{' '}
              {formatDose(
                medication.doseAmount,
                medication.doseUnit,
                doseUnitNames,
              )}{' '}
              · {medication.schedule.times.join(', ')}
            </Typography>
          ))}
        </Box>
      )}
    </SectionCard>
  );
}

function Report({ patient, onExported }) {
  const { from, to, errors, valid, query, update } = useReportFilters();
  const load = useCallback(
    () =>
      valid
        ? getPatientReport(patient.id, query)
        : Promise.resolve({ data: null, meta: {} }),
    [patient.id, query, valid],
  );
  const resource = useResource(load);
  const exportAction = useCallback(
    () => exportPatientReportPdf(patient.id, query),
    [patient.id, query],
  );

  return (
    <Stack spacing={2.5}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { md: 'flex-start' },
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h2">{patient.name}</Typography>
          {resource.data ? (
            <>
              <Typography variant="body2" color="text.secondary">
                {content.period(
                  formatDate(resource.data.period.from),
                  formatDate(resource.data.period.to),
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {content.generated(
                  formatDateTime(resource.data.generatedAt),
                  resource.data.generatedBy.name,
                )}
              </Typography>
            </>
          ) : null}
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <PeriodFields from={from} to={to} onChange={update} errors={errors} />
        </Stack>
      </Stack>
      {valid ? (
        <ResourceState resource={resource}>
          {(report) => (
            <Stack spacing={2.5}>
              <ExportPdfButton
                action={exportAction}
                labels={content}
                onExported={onExported}
              />
              <Identification report={report} />
              <Summary records={report.records} />
              <Evolution series={report.series} />
              <Records records={report.records} />
              <Medications medications={report.medications} />
            </Stack>
          )}
        </ResourceState>
      ) : null}
    </Stack>
  );
}

/**
 * Relatório do paciente (UC10, Figura 43): o paciente pela escolha comum às
 * telas por paciente e o período no endereço; sem período, a API usa os
 * últimos 30 dias. O conteúdo é montado pela API a cada pedido, e o PDF vem
 * dela, com o nome do arquivo.
 */
export default function PatientReport({ onExported }) {
  return (
    <PatientPicker content={content.picker}>
      {(patient) => (
        <Report key={patient.id} patient={patient} onExported={onExported} />
      )}
    </PatientPicker>
  );
}
