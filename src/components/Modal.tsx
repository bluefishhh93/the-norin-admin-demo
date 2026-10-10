import { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'lg';
}

export function Modal({ open, title, eyebrow, onClose, children, footer, size }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

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
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open'); };
  }, [open, onClose]);

  if (!mounted) return null;
  return (
    <>
      <div className={`modal fade d-block ${shown ? 'show' : ''}`} tabIndex={-1} role="dialog" aria-modal="true" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size ? `modal-${size}` : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2 className="modal-title">{title}</h2></div>
              <button type="button" className="btn-close" aria-label="Đóng" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className={`modal-backdrop fade ${shown ? 'show' : ''}`} />
    </>
  );
}
