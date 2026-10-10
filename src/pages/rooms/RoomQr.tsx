import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../../store';
import { createRoomQrDataUrl, downloadRoomQrPdf, roomQrUrl } from '../../lib/roomQr';

export const QrImage = memo(function QrImage({
  url,
  id,
  name,
  caption,
  showUrl = true
}: {
  url: string;
  id: number;
  name?: string;
  caption?: ReactNode;
  showUrl?: boolean;
}) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc('');
    createRoomQrDataUrl(url, 512)
      .then((data) => {
        if (alive) {
          setSrc(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [url]);

  const download = async () => {
    const data = await createRoomQrDataUrl(url, 1440);
    const a = document.createElement('a');
    a.href = data;
    a.download = `qr-phong-${id}.png`;
    a.click();
  };

  if (failed) return <div className="qr-img empty">Không tạo được QR.</div>;
  return (
    <>
      <div className="qr-img">
        {src ? (
          <img src={src} alt={`QR ${name ?? id}`} />
        ) : (
          <span className="spinner-border spinner-border-sm text-secondary" aria-hidden />
        )}
      </div>
      {caption}
      {showUrl && (
        <a className="qr-url" href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      )}
      <button type="button" className="text-link" onClick={download} disabled={!src}>
        <i className="bi bi-download" /> Tải PNG
      </button>
    </>
  );
});

export function QrDomainInput() {
  const { data } = useStore();
  return <p className="small text-muted mb-0">Tên miền QR chung: {data.qrDomain || 'Chưa cấu hình'}.</p>;
}

export function BranchQr({ branchId }: { branchId: string }) {
  const { data, toast } = useStore();
  const [exporting, setExporting] = useState(false);
  const branch = data.branches.find((b) => b.id === branchId);

  const items = useMemo(() => {
    if (!data.qrDomain) return [];
    const seen = new Set<number>();
    return data.rooms
      .filter((r) => r.branchId === branchId && Number(r.masterProductId) > 0)
      .sort((a, b) => a.number.localeCompare(b.number, 'vi', { numeric: true }))
      .filter((r) => !seen.has(r.masterProductId) && seen.add(r.masterProductId))
      .map((r) => ({
        masterProductId: r.masterProductId,
        name: r.name || `Phòng ${r.number}`,
        number: r.number,
        url: roomQrUrl(data.qrDomain, r.masterProductId)
      }));
  }, [data.rooms, data.qrDomain, branchId]);

  const pdf = async () => {
    if (!items.length) return;
    setExporting(true);
    try {
      await downloadRoomQrPdf(items, `qr-phong-${branch?.id ?? branchId}.pdf`);
      toast('Đã tải file PDF.');
    } catch {
      toast('Không tạo được file PDF.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="branch-qr">
      <p className="branch-qr-note">
        Mỗi Room ID có một mã QR riêng, dán cố định trong phòng. Khách quét là vào thẳng màn hình
        của đúng phòng đó, không phải nhập mã đặt phòng. Mã chỉ dùng được khi khách đang ở trong khu
        vực khách sạn nên không cần thay khi đổi khách. Bấm Tải PDF để lấy file in sẵn, mỗi trang 6
        phòng, tên phòng nằm ngoài khung để không che mã.
      </p>
      <div className="branch-qr-bar">
        <QrDomainInput />
        <button
          type="button"
          className="btn-primary-custom"
          onClick={pdf}
          disabled={!items.length || exporting}
        >
          {exporting ? (
            <span className="spinner-border spinner-border-sm" aria-hidden />
          ) : (
            <i className="bi bi-download" />
          )}{' '}
          Tải PDF ({items.length} phòng)
        </button>
      </div>
      {!data.qrDomain ? (
        <div className="branch-qr-empty">Nhập tên miền trang khách để tạo QR cho các phòng.</div>
      ) : !items.length ? (
        <div className="branch-qr-empty">Chi nhánh chưa có phòng nào có Room ID.</div>
      ) : (
        <div className="branch-qr-grid">
          {items.map((r) => (
            <article className="branch-qr-card" key={r.masterProductId}>
              <QrImage
                url={r.url}
                id={r.masterProductId}
                name={r.name}
                showUrl={false}
                caption={
                  <div className="branch-qr-cap">
                    <strong>{r.name}</strong>
                    <small>Room ID: {r.masterProductId}</small>
                  </div>
                }
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
