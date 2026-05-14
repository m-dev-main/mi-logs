import type { ReactNode } from "react";
import { Button } from "./Button";

type DialogProps = {
  title: string;
  children: ReactNode;
  isOpen: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
};

export function Dialog({
  title,
  children,
  isOpen,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  isBusy = false,
}: DialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-labelledby="dialog-title"
        aria-modal="true"
        className="dialog"
        role="dialog"
      >
        <h2 id="dialog-title">{title}</h2>
        <div className="dialog__body">{children}</div>
        <div className="dialog__actions">
          <Button disabled={isBusy} onClick={onCancel} variant="ghost">
            {cancelLabel}
          </Button>
          <Button disabled={isBusy} onClick={onConfirm} variant="danger">
            {isBusy ? "Working..." : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
