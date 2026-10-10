import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'lg';
}

const dialogs: HTMLElement[] = [];
const focusable = (dialog: HTMLElement) =>
  Array.from(
    dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')
  ).filter(
    (element) =>
      element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0
  );

export function Modal({ open, title, eyebrow, onClose, children, footer, size }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = window.setTimeout(() => setMounted(false), 150);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogs.push(dialog);
    document.body.classList.add('modal-open');
    const isTop = () => dialogs[dialogs.length - 1] === dialog;
    const focusFirst = () => (focusable(dialog)[0] ?? dialog).focus();
    const frame = requestAnimationFrame(focusFirst);
    const onFocus = (event: FocusEvent) => {
      if (isTop() && !dialog.contains(event.target as Node)) focusFirst();
    };
    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const targets = focusable(dialog);
      const first = targets[0],
        last = targets[targets.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      dialogs.splice(dialogs.indexOf(dialog), 1);
      if (!dialogs.length) document.body.classList.remove('modal-open');
      if (previous?.isConnected) previous.focus();
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <>
      <div
        ref={dialogRef}
        className={`modal fade d-block ${shown ? 'show' : ''}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-hidden={!open || undefined}
        onMouseDown={(e) => {
          if (open && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}
        >
          <div className="modal-content">
            <div className="modal-header">
              <div>
                {eyebrow && <div className="eyebrow">{eyebrow}</div>}
                <h2 id={titleId} className="modal-title">
                  {title}
                </h2>
              </div>
              <button type="button" className="btn-close" aria-label="Đóng" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className={`modal-backdrop fade ${shown ? 'show' : ''}`} />
    </>,
    document.body
  );
}
