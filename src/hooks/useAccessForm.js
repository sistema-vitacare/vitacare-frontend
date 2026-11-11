import { useCallback, useState } from 'react';
import { accessFields, fieldErrorMessages } from '../data/access.js';

/**
 * Estado dos formulários de acesso: valores, erro de cada campo e as
 * propriedades do `TextField`, com a mensagem abaixo do campo.
 *
 * `validators` liga cada campo a uma função de `authValidation`, que recebe o
 * valor e todos os valores (a confirmação compara com a nova senha).
 */
export function useAccessForm(initialValues, validators) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: null }));
  }, []);

  /** Valida antes do envio; com erro, leva o foco ao primeiro campo errado. */
  function check(form) {
    const found = Object.fromEntries(
      Object.entries(validators)
        .map(([name, validate]) => [name, validate(values[name], values)])
        .filter(([, error]) => error),
    );
    setErrors(found);
    const firstInvalid = Object.keys(validators).find((name) => found[name]);
    if (firstInvalid) {
      form.elements[firstInvalid].focus();
      return false;
    }
    return true;
  }

  function fieldProps(name) {
    const error = errors[name];
    return {
      name,
      id: `access-${name}`,
      label: accessFields[name].label,
      value: values[name],
      onChange: handleChange,
      error: Boolean(error),
      helperText: error
        ? fieldErrorMessages[name][error]
        : accessFields[name].helper,
      fullWidth: true,
    };
  }

  return {
    values,
    setValues,
    errors,
    setErrors,
    handleChange,
    check,
    fieldProps,
  };
}
