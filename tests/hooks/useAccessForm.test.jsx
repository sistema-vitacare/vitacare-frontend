import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { accessFields, fieldErrorMessages } from '../../src/data/access.js';
import { useAccessForm } from '../../src/hooks/useAccessForm.js';
import { validateEmail } from '../../src/utils/authValidation.js';

const validators = { email: validateEmail };

function formWith(email) {
  const focused = [];
  const form = { elements: { email: { focus: () => focused.push('email') } } };
  const hook = renderHook(() => useAccessForm({ email }, validators));
  return { ...hook, form, focused };
}

describe('useAccessForm', () => {
  it('recusa o envio, aponta o erro do campo e leva o foco a ele', () => {
    const { result, form, focused } = formWith('');

    let valid;
    act(() => {
      valid = result.current.check(form);
    });

    expect(valid).toBe(false);
    expect(result.current.fieldProps('email')).toMatchObject({
      error: true,
      helperText: fieldErrorMessages.email.required,
    });
    expect(focused).toEqual(['email']);
  });

  it('aceita o envio com os campos válidos', () => {
    const { result, form } = formWith('ana@ipeamarelo.example');

    let valid;
    act(() => {
      valid = result.current.check(form);
    });

    expect(valid).toBe(true);
    expect(result.current.fieldProps('email')).toMatchObject({
      error: false,
      label: accessFields.email.label,
    });
  });

  it('tira o erro do campo quando ele é editado', () => {
    const { result, form } = formWith('');
    act(() => {
      result.current.check(form);
    });

    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'ana@ipeamarelo.example' },
      });
    });

    expect(result.current.values.email).toBe('ana@ipeamarelo.example');
    expect(result.current.fieldProps('email').error).toBe(false);
  });
});
