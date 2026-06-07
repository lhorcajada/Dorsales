import { useId } from 'react';

import styles from './SelectField.module.css';

interface SelectFieldOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  hint,
  disabled = false,
  required = false,
  name,
}: SelectFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <label className={styles['select-field']} htmlFor={id}>
      <span className={styles['select-field__label']}>{label}</span>
      <select
        id={id}
        name={name}
        className={styles['select-field__control']}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        aria-describedby={hintId}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={hintId} className={styles['select-field__hint']}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}