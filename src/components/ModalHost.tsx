import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { formValues } from './Form';

interface FormSpec {
  kind: 'form';
  title: ReactNode;
  body: ReactNode;
  submitLabel?: string;
  size?: 'lg';
  onSubmit: (
    values: Record<string, string>,
    form: HTMLFormElement
  ) => boolean | void | Promise<boolean | void>;
}
interface InfoSpec {
  kind: 'info';
  title: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  size?: 'lg';
}
type Spec = FormSpec | InfoSpec;

interface ModalApi {
  openForm: (spec: Omit<FormSpec, 'kind'>) => void;
  openInfo: (spec: Omit<InfoSpec, 'kind'>) => void;
  close: () => void;
}

const Ctx = createContext<ModalApi | null>(null);
const FORM_ID = 'hostModalForm';

export function ModalHost({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const show = useCallback((s: Spec) => {
    setSpec(s);
    setVersion((v) => v + 1);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const api = useMemo<ModalApi>(
    () => ({
      openForm: (s) => show({ kind: 'form', ...s }),
      openInfo: (s) => show({ kind: 'info', ...s }),
      close
    }),
    [show, close]
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (spec?.kind !== 'form') return;
    const result = await spec.onSubmit(formValues(e.currentTarget), e.currentTarget);
    if (result !== false) close();
  };

  const footer =
    spec?.kind === 'form' ? (
      <>
        <button className="btn btn-light" type="button" onClick={close}>
          Hủy
        </button>
        <button className="btn-primary-custom" type="submit" form={FORM_ID}>
          {spec.submitLabel ?? 'Lưu bản demo'}
        </button>
      </>
    ) : (
      spec?.footer
    );

  return (
    <Ctx.Provider value={api}>
      {children}
      <Modal open={open} title={spec?.title} onClose={close} footer={footer} size={spec?.size}>
        {spec?.kind === 'form' ? (
          <form id={FORM_ID} key={version} onSubmit={submit}>
            {spec.body}
          </form>
        ) : (
          <div key={version}>{spec?.body}</div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}

export const useModal = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ModalHost missing');
  return ctx;
};
