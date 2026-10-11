export type ReaderState = 'waiting' | 'read' | 'issuing' | 'done' | 'error';

export function ReaderVisual({ state }: { state: ReaderState }) {
  return (
    <div className="ic-reader" aria-hidden="true">
      <span className="ic-card">
        <i className={`bi ${state === 'done' ? 'bi-check-lg' : 'bi-credit-card-2-front'}`} />
      </span>
      <span className="ic-pad" />
    </div>
  );
}
