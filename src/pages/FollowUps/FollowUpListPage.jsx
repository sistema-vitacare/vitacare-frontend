import {
  Autocomplete,
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import FollowUpFilters from '../../components/FollowUpFilters.jsx';
import FollowUpList from '../../components/FollowUpList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import {
  RECORDS_PATIENT_PARAM as PATIENT_PARAM,
  patientPath,
} from '../../constants/routes.js';
import { followUpListContent as content } from '../../data/followUpPages.js';
import { useFollowUpFilters } from '../../hooks/useFollowUpFilters.js';
import { useResource } from '../../hooks/useResource.js';
import { listPatients } from '../../services/patientService.js';

const PATIENTS_LIMIT = 100;
const loadPatients = () => listPatients({ limit: PATIENTS_LIMIT });

function PatientRecords({ patient }) {
  const { filters, update, options } = useFollowUpFilters(patient.id);
  return (
    <Stack spacing={2.5}>
      <FollowUpFilters filters={filters} update={update} options={options} />
      <FollowUpList patientId={patient.id} filters={filters} update={update} />
    </Stack>
  );
}

function Records({ patients }) {
  const [params, setParams] = useSearchParams();
  const patientId = params.get(PATIENT_PARAM) ?? '';
  const selected = patients.find((patient) => patient.id === patientId) ?? null;

  // Quem alcança um paciente só já entra na lista dele.
  const single = patients.length === 1 ? patients[0].id : null;
  useEffect(() => {
    if (single && !patientId) {
      setParams(new URLSearchParams([[PATIENT_PARAM, single]]), {
        replace: true,
      });
    }
  }, [single, patientId, setParams]);

  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <Autocomplete
            options={patients}
            value={selected}
            onChange={(_, patient) =>
              setParams(
                new URLSearchParams(
                  patient ? [[PATIENT_PARAM, patient.id]] : [],
                ),
                { replace: true },
              )
            }
            getOptionLabel={(patient) => patient.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={content.noPatients}
            sx={{ flex: 1, maxWidth: { sm: 480 } }}
            renderInput={(props) => (
              <TextField
                {...props}
                label={content.patient}
                placeholder={content.patientPlaceholder}
              />
            )}
          />
          {selected ? (
            <Box>
              <Button
                component={RouterLink}
                to={patientPath(selected.id)}
                variant="outlined"
              >
                {content.openPatient}
              </Button>
            </Box>
          ) : null}
        </Stack>
      </Card>
      {selected ? (
        <PatientRecords key={selected.id} patient={selected} />
      ) : (
        <Typography color="text.secondary">{content.choosePatient}</Typography>
      )}
    </Stack>
  );
}

/** Registros de acompanhamento de um paciente (menu Registros; RF009, RF010). */
export default function FollowUpListPage() {
  const patients = useResource(loadPatients);
  return (
    <>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <ResourceState resource={patients} emptyText={content.noPatients}>
        {(items) => <Records patients={items} />}
      </ResourceState>
    </>
  );
}
