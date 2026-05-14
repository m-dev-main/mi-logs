import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helpText?: string;
};

export function Input({ id, label, helpText, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const helpId = helpText ? `${inputId}-help` : undefined;

  return (
    <label className={`field ${className}`.trim()} htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <input
        className="field__control"
        id={inputId}
        aria-describedby={helpId}
        {...props}
      />
      {helpText ? (
        <span className="field__help" id={helpId}>
          {helpText}
        </span>
      ) : null}
    </label>
  );
}
