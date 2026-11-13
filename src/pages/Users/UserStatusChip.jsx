import { Chip } from '@mui/material';
import { userSituationLabels } from '../../data/userPages.js';
import { userSituation } from '../../utils/userActions.js';

// Convite vencido e link cancelado pedem ação do administrador: atenção.
const TONES = {
  active: { color: 'success', variant: 'filled' },
  invited: { color: 'info', variant: 'outlined' },
  expired: { color: 'warning', variant: 'outlined' },
  invalidated: { color: 'warning', variant: 'outlined' },
  inactive: { color: 'default', variant: 'outlined' },
};

/** Situação do usuário, com a do convite para quem ainda não entrou. */
export default function UserStatusChip({ user }) {
  const situation = userSituation(user);
  return (
    <Chip
      size="small"
      label={userSituationLabels[situation]}
      {...TONES[situation]}
    />
  );
}
