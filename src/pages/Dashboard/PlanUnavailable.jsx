import { Alert, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router';
import { PERMISSIONS as P } from '../../constants/permissions.js';
import { PATHS } from '../../constants/routes.js';
import { dashboardContent as content } from '../../data/dashboardPages.js';
import { useSession } from '../../hooks/useSession.js';

/**
 * Plano sem o painel: a mensagem da API e, para quem lê a organização, o
 * caminho para as Configurações, onde se pede a mudança de plano.
 */
export default function PlanUnavailable({ message }) {
  const { can } = useSession();
  return (
    <Alert
      severity="info"
      action={
        can(P.ORGANIZATION_READ) ? (
          <Button component={RouterLink} to={PATHS.SETTINGS} color="inherit">
            {content.plan.action}
          </Button>
        ) : null
      }
    >
      {message}
    </Alert>
  );
}
