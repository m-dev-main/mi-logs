import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  helpText?: string;
};

export function Textarea({
  id,
  label,
  helpText,
  className = "",
  ...props
}: TextareaProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");
  const helpId = helpText ? `${inputId}-help` : undefined;

  return (
    <label className={`field ${className}`.trim()} htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <textarea
        className="field__control field__control--textarea"
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
