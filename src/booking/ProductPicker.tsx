import { useState } from 'react';
import type { ProductSelection } from '../types';
import { useStore } from '../store';
import { money, includesVi } from '../lib/format';
import { saleProducts } from './products';

export function ProductPicker({
  branchId,
  value,
  onChange
}: {
  branchId: string;
  value: ProductSelection[];
  onChange: (items: ProductSelection[]) => void;
}) {
  const { data } = useStore();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState('all');
  const products = saleProducts(data, branchId);
  const select = (id: string, quantity: number) =>
    onChange(
      quantity > 0
        ? [...value.filter((i) => i.productId !== id), { productId: id, quantity }]
        : value.filter((i) => i.productId !== id)
    );
  const total = value.reduce(
    (s, i) => s + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.quantity,
    0
  );
  return (
    <div className="booking-product-picker">
      <div className="d-flex gap-2 mb-3">
        <input
          className="form-control"
          aria-label="Tìm sản phẩm"
          placeholder="Tìm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-select"
          aria-label="Nhóm sản phẩm"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="all">Tất cả nhóm</option>
          <option>Đồ ăn</option>
          <option>Phụ kiện yêu</option>
        </select>
      </div>
      <div className="booking-product-options">
        {products
          .filter((p) => (group === 'all' || p.group === group) && includesVi(p.name, search))
          .map((p) => {
            const qty = value.find((i) => i.productId === p.id)?.quantity ?? 0;
            return (
              <div className="booking-product-option" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {money(p.price)} · Còn {p.stock}
                  </small>
                </div>
                <input
                  type="number"
                  className="form-control"
                  aria-label={`Số lượng ${p.name}`}
                  min={0}
                  max={p.stock}
                  step={1}
                  disabled={!p.stock}
                  value={qty}
                  onChange={(e) => select(p.id, Number(e.target.value))}
                />
              </div>
            );
          })}
      </div>
      {!products.length && <p className="text-muted">Chi nhánh chưa có sản phẩm để bán.</p>}
      <p className="mt-3 mb-0">
        Đã chọn {value.reduce((s, i) => s + i.quantity, 0)} sản phẩm ·{' '}
        <strong>{money(total)}</strong>
      </p>
    </div>
  );
}
