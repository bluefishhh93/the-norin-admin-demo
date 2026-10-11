import { useState } from 'react';
import type { Product } from '../../types';
import { useStore } from '../../store';
import { useModal } from '../../components/ModalHost';
import { Field, Select } from '../../components/Form';
import { money } from '../../lib/format';
import { defaultBranch, scopedWithAll } from '../../lib/scope';
import { DataTable, Panel, PrimaryButton, TextLink, Toolbar } from '../../components/ui';

const GROUPS: [string, string][] = [
  ['all', 'Tất cả'],
  ['Đồ ăn', 'Đồ ăn'],
  ['Phụ kiện yêu', 'Phụ kiện yêu']
];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const readImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const imageOf = (p?: Product) => p?.productImages?.[0]?.image || p?.image || '';

type StockMode = 'in' | 'out';
const STOCK_MODES: [StockMode, string][] = [
  ['in', 'Nhập thêm'],
  ['out', 'Xuất bớt']
];
const nextStock = (current: number, mode: StockMode, qty: number) =>
  mode === 'in' ? current + qty : current - qty;

function StockFields({ product }: { product: Product }) {
  const [mode, setMode] = useState<StockMode>('in');
  const [qty, setQty] = useState('');
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const after = nextStock(product.stock, mode, n);
  return (
    <>
      <div className="stock-summary">
        <div>
          <span>Tồn hiện tại</span>
          <strong>{product.stock}</strong>
        </div>
        <i className="bi bi-arrow-right" />
        <div className={after < 0 ? 'invalid' : ''}>
          <span>Sau cập nhật</span>
          <strong>{after}</strong>
        </div>
      </div>
      <div className="reception-tabs stock-modes" role="tablist">
        {STOCK_MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={mode === id ? 'active' : ''}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      <Field
        label="Số lượng"
        name="qty"
        type="number"
        min={1}
        max={mode === 'out' ? product.stock : undefined}
        step={1}
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        autoFocus
        required
      />
      <Field
        label="Ghi chú"
        name="note"
        maxLength={80}
        placeholder={mode === 'in' ? 'VD: Nhập hàng NCC' : 'VD: Hư hỏng, hết hạn'}
      />
    </>
  );
}

export function Products() {
  const { data, update, toast } = useStore();
  const modal = useModal();
  const [group, setGroup] = useState('all');
  const list = scopedWithAll(data, data.products).filter(
    (p) => group === 'all' || p.group === group
  );

  const openForm = (product?: Product) =>
    modal.openForm({
      title: product ? 'Sửa sản phẩm' : 'Thêm sản phẩm',
      body: (
        <>
          <Field
            label="Tên sản phẩm"
            name="name"
            defaultValue={product?.name ?? ''}
            maxLength={70}
            required
          />
          <Select
            label="Nhóm hiển thị"
            name="group"
            options={GROUPS.slice(1)}
            defaultValue={product?.group ?? 'Đồ ăn'}
          />
          <Field
            label="Danh mục chi tiết"
            name="category"
            defaultValue={product?.category ?? ''}
            maxLength={60}
            required
          />
          <Field
            label="Giá bán (₫)"
            name="price"
            type="number"
            min={0}
            defaultValue={product?.price ?? 0}
            required
          />
          {!product && (
            <Field label="Tồn kho ban đầu" name="stock" type="number" min={0} step={1} defaultValue={0} required />
          )}
          <label className="form-label d-block">
            Ảnh sản phẩm (JPG, PNG, WebP, tối đa 1MB)
            <input
              className="form-control mt-1"
              name="imageFile"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          {imageOf(product) && (
            <img className="product-preview" src={imageOf(product)} alt="Ảnh hiện tại" />
          )}
        </>
      ),
      onSubmit: async (v, form) => {
        const file = (form.elements.namedItem('imageFile') as HTMLInputElement).files?.[0];
        let image = imageOf(product);
        if (file) {
          if (!IMAGE_TYPES.includes(file.type) || file.size > 1024 * 1024) {
            toast('Chỉ nhận ảnh JPG, PNG hoặc WebP tối đa 1MB.');
            return false;
          }
          try {
            image = await readImage(file);
          } catch {
            toast('Không đọc được ảnh.');
            return false;
          }
        }
        const fields = {
          name: v.name,
          group: v.group,
          category: v.category,
          price: +v.price,
          image,
          productImages: image ? [{ id: 1, image }] : [],
          productType: v.group === 'Phụ kiện yêu' ? 3 : 2
        };
        update((d) => {
          const target = product && d.products.find((p) => p.id === product.id);
          if (target) Object.assign(target, fields);
          else
            d.products.push({
              id: `SP-${Date.now()}`,
              branchId: defaultBranch(d),
              ...fields,
              stock: Math.max(0, Math.floor(+v.stock || 0))
            });
        });
        toast('Đã lưu sản phẩm trong bản demo.');
      }
    });

  const canEdit = (p: Product) => !(p.branchId === 'all' && data.role !== 'superadmin');

  const openStock = (product: Product) =>
    modal.openForm({
      title: `Cập nhật số lượng · ${product.name}`,
      submitLabel: 'Cập nhật',
      body: <StockFields product={product} />,
      onSubmit: (v) => {
        const mode = v.mode as StockMode;
        const qty = Number(v.qty);
        const current = data.products.find((p) => p.id === product.id)?.stock ?? product.stock;
        const after = nextStock(current, mode, qty);
        if (!Number.isSafeInteger(qty) || qty < 1 || after < 0) {
          toast(mode === 'out' ? `Chỉ còn ${current} để xuất.` : 'Kiểm tra lại số lượng.');
          return false;
        }
        const diff = after - current;
        update((d) => {
          const target = d.products.find((p) => p.id === product.id);
          if (!target) return;
          target.stock = after;
          if (diff)
            d.stockMoves.unshift({
              at: new Date().toISOString(),
              branchId: target.branchId,
              name: target.name,
              type: diff > 0 ? 'in' : 'out',
              qty: Math.abs(diff),
              note: v.note.trim() || STOCK_MODES.find(([id]) => id === mode)![1]
            });
        });
        toast(`Đã cập nhật ${product.name}: ${current} → ${after}.`);
      }
    });

  const remove = (product: Product) => {
    if (!confirm(`Xóa sản phẩm “${product.name}”?\nSản phẩm sẽ không còn hiển thị trên website và kiosk. Các booking đã gọi món này vẫn giữ nguyên.`))
      return;
    update((d) => {
      d.products = d.products.filter((p) => p.id !== product.id);
    });
    toast(`Đã xóa ${product.name}.`);
  };

  return (
    <>
      <Toolbar>
        <div className="filter-row mb-0">
          {GROUPS.map(([id, label]) => (
            <button
              key={id}
              className={`filter-btn ${group === id ? 'active' : ''}`}
              type="button"
              onClick={() => setGroup(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <PrimaryButton icon="bi-plus-lg" onClick={() => openForm()}>
          Thêm sản phẩm
        </PrimaryButton>
      </Toolbar>
      <Panel
        title="Danh sách sản phẩm"
        subtitle="Hai nhóm hiển thị trên website và kiosk: Đồ ăn, Phụ kiện yêu"
      >
        <DataTable
          headers={['ẢNH', 'MÃ', 'SẢN PHẨM', 'NHÓM / LOẠI', 'GIÁ BÁN', 'TỒN KHO', 'THAO TÁC']}
        >
          {list.map((p) => (
            <tr key={p.id}>
              <td>
                {imageOf(p) ? (
                  <img className="product-thumb" src={imageOf(p)} alt={`Ảnh ${p.name}`} />
                ) : (
                  <span className="product-thumb placeholder-image">
                    <i className="bi bi-image" />
                  </span>
                )}
              </td>
              <td>{p.id}</td>
              <td>
                <strong>{p.name}</strong>
              </td>
              <td>
                {p.group}
                <small>{p.category}</small>
              </td>
              <td>{money(p.price)}</td>
              <td>
                <strong className={p.stock <= 5 ? 'stock-low' : ''}>{p.stock}</strong>
                {p.stock <= 5 && <small>{p.stock ? 'Sắp hết' : 'Hết hàng'}</small>}
              </td>
              <td>
                {canEdit(p) && (
                  <span className="product-actions">
                    <TextLink icon="bi-box-seam" onClick={() => openStock(p)}>
                      Số lượng
                    </TextLink>
                    <TextLink onClick={() => openForm(p)}>Sửa</TextLink>
                    <TextLink icon="bi-trash" onClick={() => remove(p)}>
                      Xóa
                    </TextLink>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
