import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PATHS,
  auditEventPath,
  userPath,
} from '../../../src/constants/routes.js';
import {
  auditEventContent as content,
  auditSeverityLabels,
} from '../../../src/data/auditPages.js';
import AuditEventPage from '../../../src/pages/Audit/AuditEventPage.jsx';
import { resetMockState } from '../../../src/services/mockApi.js';
import { formatDateTime } from '../../../src/utils/format.js';
import { renderPage } from '../../support/renderPage.jsx';

const NOW = new Date('2026-11-13T15:00:00.000Z');
const eventId = (sequence) =>
  `a0d17000-0000-5000-8000-${String(sequence).padStart(12, '0')}`;
const PROFILE_CHANGED = eventId(9);
const MEDICATION_UPDATED = eventId(5);
const FORM_PUBLISHED = eventId(8);
const ALERT_GENERATED = eventId(3);
const FOREIGN_USER_CREATED = eventId(23);
const PATRICIA = '2fb0cec5-0e79-5ae3-9dd8-bea87be4292f';

function renderEvent(id, { profile = 'admin' } = {}) {
  return renderPage(
    [
      { path: PATHS.AUDIT, element: <p>Lista da auditoria</p> },
      { path: PATHS.AUDIT_EVENT, element: <AuditEventPage /> },
      { path: PATHS.USER_DETAIL, element: <p>Página do usuário</p> },
    ],
    { profile, path: auditEventPath(id) },
  );
}

// Valor de um rótulo na lista de definições.
const valueOf = (section, label) =>
  within(section).getByText(label).nextElementSibling;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  resetMockState();
  vi.useRealTimers();
});

describe('evento', () => {
  it('o título é o rótulo da ação', async () => {
    renderEvent(PROFILE_CHANGED);

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Alterou perfil de usuário',
      }),
    ).toBeInTheDocument();
  });

  it('mostra os dados do evento, com link para o item', async () => {
    renderEvent(PROFILE_CHANGED);

    const event = await screen.findByRole('region', {
      name: content.eventTitle,
    });
    const { fields } = content;
    expect(valueOf(event, fields.occurredAt)).toHaveTextContent(
      formatDateTime('2026-11-12T09:00:00.000Z'),
    );
    expect(valueOf(event, fields.actor)).toHaveTextContent(
      'Helena Vasconcelos',
    );
    expect(valueOf(event, fields.profile)).toHaveTextContent('Administrador');
    expect(valueOf(event, fields.action)).toHaveTextContent(
      'user.profile_changed',
    );
    expect(valueOf(event, fields.severity)).toHaveTextContent(
      auditSeverityLabels.warning,
    );
    expect(valueOf(event, fields.ip)).toHaveTextContent('192.0.2.10');
    expect(
      within(valueOf(event, fields.entity)).getByRole('link', {
        name: /Patrícia Lemos Duarte/,
      }),
    ).toHaveAttribute('href', userPath(PATRICIA));
  });

  it('mostra os valores gravados com os rótulos das chaves conhecidas', async () => {
    renderEvent(PROFILE_CHANGED);

    const values = await screen.findByRole('region', {
      name: content.afterTitle,
    });
    expect(valueOf(values, 'Perfil anterior')).toHaveTextContent('admin');
    expect(valueOf(values, 'Perfil novo')).toHaveTextContent('professional');
    expect(
      screen.queryByRole('region', { name: content.beforeTitle }),
    ).not.toBeInTheDocument();
  });

  it('junta a lista de campos em texto corrido', async () => {
    renderEvent(MEDICATION_UPDATED);
    const medication = await screen.findByRole('region', {
      name: content.afterTitle,
    });
    expect(valueOf(medication, 'Campos alterados')).toHaveTextContent(
      'times, notes',
    );
  });

  it('mostra sim ou não no lugar de verdadeiro ou falso', async () => {
    renderEvent(FORM_PUBLISHED);
    const form = await screen.findByRole('region', {
      name: content.afterTitle,
    });
    expect(valueOf(form, 'Impacto confirmado')).toHaveTextContent(content.yes);
  });

  it('evento de sistema sai como "Sistema", sem perfil e sem IP', async () => {
    renderEvent(ALERT_GENERATED);

    const event = await screen.findByRole('region', {
      name: content.eventTitle,
    });
    expect(valueOf(event, content.fields.actor)).toHaveTextContent('Sistema');
    expect(valueOf(event, content.fields.profile)).toHaveTextContent('—');
    expect(valueOf(event, content.fields.ip)).toHaveTextContent('—');
  });
});

describe('alcance', () => {
  it('o administrador não alcança evento de outra organização', async () => {
    renderEvent(FOREIGN_USER_CREATED);

    expect(await screen.findByText(content.notFound)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: content.backToAudit }),
    ).toHaveAttribute('href', PATHS.AUDIT);
  });

  it('a plataforma vê o evento de outra organização mascarado e sem link para o item', async () => {
    renderEvent(FOREIGN_USER_CREATED, { profile: 'platform_admin' });

    const event = await screen.findByRole('region', {
      name: content.eventTitle,
    });
    expect(valueOf(event, content.fields.organization)).toHaveTextContent(
      'Clínica Bem Viver',
    );
    expect(valueOf(event, content.fields.actor)).toHaveTextContent(
      'L**** A****** R****',
    );
    expect(valueOf(event, content.fields.entity)).toHaveTextContent(
      'O***** R***',
    );
    expect(
      within(valueOf(event, content.fields.entity)).queryByRole('link'),
    ).not.toBeInTheDocument();
  });
});
