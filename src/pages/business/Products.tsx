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
          <Field
            label="Tồn kho"
            name="stock"
            type="number"
            min={0}
            defaultValue={product?.stock ?? 0}
            required
          />
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
          stock: +v.stock,
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
              branchId: d.role === 'superadmin' ? defaultBranch(d) : 'sontra',
              ...fields
            });
        });
        toast('Đã lưu sản phẩm trong bản demo.');
      }
    });

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
              <td>{p.stock}</td>
              <td>
                {p.branchId === 'all' && data.role !== 'superadmin' ? null : (
                  <TextLink onClick={() => openForm(p)}>Sửa</TextLink>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </>
  );
}
