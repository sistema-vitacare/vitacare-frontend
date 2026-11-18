import { Alert, Button, Stack } from '@mui/material';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import DefinitionList from '../../components/DefinitionList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import ResourceState from '../../components/ResourceState.jsx';
import SectionCard from '../../components/SectionCard.jsx';
import { PATHS } from '../../constants/routes.js';
import { navLabels } from '../../data/navigation.js';
import { profileLabels } from '../../data/profiles.js';
import {
  userDetailContent as content,
  userListContent,
} from '../../data/userPages.js';
import { useResource } from '../../hooks/useResource.js';
import { useSession } from '../../hooks/useSession.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import {
  deactivateUser,
  getUser,
  issueTemporaryPassword,
  reactivateUser,
  reissueInvitation,
} from '../../services/userService.js';
import { formatDateTime } from '../../utils/format.js';
import { maskCpf } from '../../utils/masks.js';
import { userActions, userSituation } from '../../utils/userActions.js';
import InvitationResultDialog from './InvitationResultDialog.jsx';
import ProfileDialog from './ProfileDialog.jsx';
import UserFormDialog from './UserFormDialog.jsx';
import UserStatusChip from './UserStatusChip.jsx';

// Ações que geram um convite ou uma senha e mostram o resultado uma vez.
const ISSUE_ACTIONS = {
  reissueInvitation: (user) => reissueInvitation(user.id),
  reissueWithPassword: (user) =>
    reissueInvitation(user.id, { channel: 'temporary_password' }),
  temporaryPassword: (user) => issueTemporaryPassword(user.id),
};

const STATUS_ACTIONS = {
  deactivate: { run: deactivateUser, text: content.deactivate, tone: 'error' },
  reactivate: {
    run: reactivateUser,
    text: content.reactivate,
    tone: 'primary',
  },
};

function UserData({ user }) {
  const { fields } = content;
  return (
    <SectionCard title={content.dataTitle}>
      <DefinitionList
        rows={[
          [fields.email, user.email],
          [fields.cpf, maskCpf(user.cpf)],
          [fields.phone, user.phone ?? content.noPhone],
          [fields.profile, profileLabels[user.profile.code]],
          [fields.status, <UserStatusChip key="status" user={user} />],
          [
            fields.lastAccess,
            user.lastAccessAt
              ? formatDateTime(user.lastAccessAt)
              : userListContent.neverAccessed,
          ],
          [fields.createdAt, formatDateTime(user.createdAt)],
        ]}
      />
    </SectionCard>
  );
}

function Invitation({ user }) {
  const { invitation } = user;
  const { invitationFields: fields } = content;
  const hint = content.invitationHint[userSituation(user)];
  const rows = [
    [fields.channel, content.channelLabels[invitation.channel]],
    [fields.expiresAt, formatDateTime(invitation.expiresAt)],
  ];
  // Só o link passa pelo e-mail; a senha provisória o administrador entrega.
  if (invitation.channel === 'email') {
    rows.push([
      fields.sentAt,
      invitation.sentAt ? formatDateTime(invitation.sentAt) : content.notSent,
    ]);
  }
  return (
    <SectionCard title={content.invitationTitle}>
      <Stack spacing={2}>
        <DefinitionList rows={rows} />
        {hint ? <Alert severity="warning">{hint}</Alert> : null}
      </Stack>
    </SectionCard>
  );
}

function UserDetail({ user, reload }) {
  const { can, session } = useSession();
  const actions = userActions(user, { viewerId: session.user.id, can });
  const [dialog, setDialog] = useState(null);
  // A confirmação guarda a ação à parte de estar aberta, para o texto não
  // sumir enquanto o diálogo fecha.
  const [statusName, setStatusName] = useState(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [issued, setIssued] = useState(null);

  const issueAction = useCallback((name) => ISSUE_ACTIONS[name](user), [user]);
  const issue = useSubmit(issueAction);
  const statusAction = useCallback(
    (name) => STATUS_ACTIONS[name].run(user.id),
    [user.id],
  );
  const statusChange = useSubmit(statusAction);

  async function runIssue(name) {
    const outcome = await issue.submit(name);
    if (outcome.data) {
      setIssued(outcome);
    }
  }

  // Recarregar desmonta a página enquanto busca o usuário; por isso a
  // recarga espera o diálogo do resultado fechar.
  function closeIssued() {
    setIssued(null);
    reload();
  }

  async function confirmStatus() {
    const outcome = await statusChange.submit(statusName);
    if (outcome.data) {
      setStatusOpen(false);
      reload();
    }
  }

  function open(name) {
    if (ISSUE_ACTIONS[name]) {
      runIssue(name);
      return;
    }
    if (STATUS_ACTIONS[name]) {
      setStatusName(name);
      setStatusOpen(true);
      return;
    }
    setDialog(name);
  }

  const buttons = actions.map((name) => (
    <Button
      key={name}
      variant={name === 'edit' ? 'contained' : 'outlined'}
      color={name === 'deactivate' ? 'error' : 'primary'}
      loading={
        issue.status === 'submitting' && ISSUE_ACTIONS[name] !== undefined
      }
      onClick={() => open(name)}
    >
      {content.actions[name]}
    </Button>
  ));
  const statusText = STATUS_ACTIONS[statusName]?.text;

  return (
    <>
      <PageHeader
        title={user.name}
        breadcrumbs={[{ label: navLabels.users, to: PATHS.USERS }]}
        actions={buttons.length > 0 ? <>{buttons}</> : null}
      />
      <Stack spacing={2.5}>
        {issue.status === 'error' ? (
          <Alert severity="error">
            {issue.error.message ?? content.unexpected}
          </Alert>
        ) : null}
        <UserData user={user} />
        {user.invitation ? <Invitation user={user} /> : null}
      </Stack>

      {dialog === 'edit' ? (
        <UserFormDialog
          user={user}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      {dialog === 'changeProfile' ? (
        <ProfileDialog
          user={user}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      ) : null}
      <ConfirmDialog
        open={statusOpen}
        title={statusText?.title}
        text={statusText?.text(user.name)}
        confirmLabel={statusText?.confirm}
        tone={STATUS_ACTIONS[statusName]?.tone}
        pending={statusChange.status === 'submitting'}
        error={
          statusChange.status === 'error'
            ? (statusChange.error.message ?? content.unexpected)
            : null
        }
        onConfirm={confirmStatus}
        onClose={() => setStatusOpen(false)}
      />
      {issued ? (
        <InvitationResultDialog
          outcome={issued}
          userName={user.name}
          onClose={closeIssued}
        />
      ) : null}
    </>
  );
}

/**
 * Página do usuário (UC03): dados com o CPF inteiro, convite e as ações que
 * a situação e a permissão permitem. A própria conta só se edita.
 */
export default function UserDetailPage() {
  const { userId } = useParams();
  const load = useCallback(() => getUser(userId), [userId]);
  const resource = useResource(load);
  return (
    <ResourceState resource={resource}>
      {(user) => <UserDetail user={user} reload={resource.retry} />}
    </ResourceState>
  );
}
