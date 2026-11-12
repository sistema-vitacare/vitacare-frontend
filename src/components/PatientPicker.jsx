import {
  Autocomplete,
  Box,
  Button,
  Card,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { PATIENT_PARAM, patientPath } from '../constants/routes.js';
import { useResource } from '../hooks/useResource.js';
import { getPatient, listPatients } from '../services/patientService.js';
import ResourceState from './ResourceState.jsx';

const PATIENTS_LIMIT = 100;
const loadPatients = () => listPatients({ limit: PATIENTS_LIMIT });
const noPatient = () => Promise.resolve({ data: null, meta: {} });

function Picker({ patients, content, children }) {
  const [params, setParams] = useSearchParams();
  const patientId = params.get(PATIENT_PARAM) ?? '';
  const listed = patients.find((patient) => patient.id === patientId) ?? null;
  const isListed = listed !== null;

  // A lista traz só os ativos, como a listagem da API; o paciente inativo
  // que veio no endereço (do detalhe dele) é buscado pelo id. Fora do
  // alcance, a API responde 404, e a tela volta a pedir o paciente.
  const loadOther = useCallback(
    () => (patientId && !isListed ? getPatient(patientId) : noPatient()),
    [patientId, isListed],
  );
  const other = useResource(loadOther);
  const selected = listed ?? (other.status === 'success' ? other.data : null);
  const options = selected && !isListed ? [...patients, selected] : patients;

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
            options={options}
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
        children(selected)
      ) : (
        <Typography color="text.secondary">{content.choosePatient}</Typography>
      )}
    </Stack>
  );
}

/**
 * Escolha do paciente das telas que a API só lista por paciente (registros,
 * medicamentos e alertas). O paciente fica na query do endereço; `children`
 * recebe o paciente escolhido. Os textos vêm de cada tela, em `content`.
 */
export default function PatientPicker({ content, children }) {
  const patients = useResource(loadPatients);
  return (
    <ResourceState resource={patients} emptyText={content.noPatients}>
      {(items) => (
        <Picker patients={items} content={content}>
          {children}
        </Picker>
      )}
    </ResourceState>
  );
}
