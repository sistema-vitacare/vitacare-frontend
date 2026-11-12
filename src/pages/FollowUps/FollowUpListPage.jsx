import { Stack } from '@mui/material';
import FollowUpFilters from '../../components/FollowUpFilters.jsx';
import FollowUpList from '../../components/FollowUpList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import PatientPicker from '../../components/PatientPicker.jsx';
import { followUpListContent as content } from '../../data/followUpPages.js';
import { useFollowUpFilters } from '../../hooks/useFollowUpFilters.js';

function PatientRecords({ patient }) {
  const { filters, update, options } = useFollowUpFilters(patient.id);
  return (
    <Stack spacing={2.5}>
      <FollowUpFilters filters={filters} update={update} options={options} />
      <FollowUpList patientId={patient.id} filters={filters} update={update} />
    </Stack>
  );
}

/** Registros de acompanhamento de um paciente (menu Registros; RF009, RF010). */
export default function FollowUpListPage() {
  return (
    <>
      <PageHeader title={content.title} subtitle={content.subtitle} />
      <PatientPicker content={content}>
        {(patient) => <PatientRecords key={patient.id} patient={patient} />}
      </PatientPicker>
    </>
  );
}
