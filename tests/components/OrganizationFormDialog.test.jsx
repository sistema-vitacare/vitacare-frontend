import { ThemeProvider } from '@mui/material';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrganizationFormDialog from '../../src/components/OrganizationFormDialog.jsx';
import { organization } from '../../src/data/mocks/organization.js';
import {
  organizationFieldErrors,
  organizationFieldLabels as labels,
  organizationFormContent as content,
} from '../../src/data/organizationFields.js';
import { ApiError } from '../../src/services/mockApi.js';
import { theme } from '../../src/styles/theme.js';

function renderDialog(save) {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn() };
  render(
    <ThemeProvider theme={theme}>
      <OrganizationFormDialog
        organization={organization}
        save={save}
        {...handlers}
      />
    </ThemeProvider>,
  );
  return {
    ...handlers,
    dialog: screen.getByRole('dialog', { name: content.title }),
  };
}

const field = (dialog, name) =>
  within(dialog).getByLabelText(labels[name], { exact: false });

const submit = (dialog) =>
  fireEvent.click(within(dialog).getByRole('button', { name: content.save }));

describe('OrganizationFormDialog', () => {
  it('só salva com mudança, e envia só os campos alterados, com o opcional apagado como nulo', async () => {
    const save = vi.fn().mockResolvedValue({ data: organization, meta: {} });
    const { dialog, onSaved } = renderDialog(save);
    expect(
      within(dialog).getByRole('button', { name: content.save }),
    ).toBeDisabled();

    fireEvent.change(field(dialog, 'phone'), {
      target: { value: ' (16) 3624-0000 ' },
    });
    fireEvent.change(field(dialog, 'legalName'), { target: { value: '' } });
    submit(dialog);

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({
      phone: '(16) 3624-0000',
      legalName: null,
    });
  });

  it('aponta o campo antes do envio, sem chamar a API', async () => {
    const save = vi.fn();
    const { dialog } = renderDialog(save);

    fireEvent.change(field(dialog, 'tradeName'), { target: { value: ' ' } });
    submit(dialog);

    expect(
      await within(dialog).findByText(
        organizationFieldErrors.tradeName.MIN_LENGTH,
      ),
    ).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it('devolve ao campo o erro que a API aponta', async () => {
    const save = vi.fn().mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'ORGANIZATION_DOCUMENT_TAKEN',
        message: 'Já existe uma organização com este documento.',
        fields: [{ field: 'document', code: 'DUPLICATE' }],
      }),
    );
    const { dialog, onSaved } = renderDialog(save);

    fireEvent.change(field(dialog, 'document'), {
      target: { value: '58.214.903/0001-07' },
    });
    submit(dialog);

    expect(
      await within(dialog).findByText(
        organizationFieldErrors.document.DUPLICATE,
      ),
    ).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
