import type { DemoData, Folio, OrderLine, ProductSelection } from '../types';

export const isProduct = (line: OrderLine) => line.productType === 2 || line.productType === 3;
export const saleProducts = (d: DemoData, branchId: string) => d.products.filter(p => (p.branchId === branchId || p.branchId === 'all') && (p.productType === 2 || p.productType === 3));
export function validateProducts(d: DemoData, branchId: string, selections: ProductSelection[]): string | null {
  const seen = new Set<string>();
  for (const item of selections) {
    const product = saleProducts(d, branchId).find(p => p.id === item.productId);
    if (!product || seen.has(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return 'Kiểm tra sản phẩm và số lượng đã chọn.';
    if (item.quantity > product.stock) return `${product.name} chỉ còn ${product.stock}.`;
    seen.add(item.productId);
  }
  return null;
}
export function addProducts(d: DemoData, f: Folio, selections: ProductSelection[], phase: OrderLine['phase']) {
  for (const item of selections) {
    const p = d.products.find(p => p.id === item.productId)!;
    p.stock -= item.quantity;
    f.orderDetails.push({ productId: p.id, name: p.name, productType: p.productType, phase, quantity: item.quantity, price: p.price, source: 'Lễ tân', orderedAt: new Date().toISOString(), stockReserved: true, fulfillment: 'new' });
    d.stockMoves.unshift({ at: new Date().toISOString(), branchId: p.branchId, name: p.name, type: 'out', qty: item.quantity, note: `${f.code} · bán tại quầy` });
  }
}
export function cancelProduct(d: DemoData, f: Folio, index: number) {
  const item = f.orderDetails[index];
  if (!isProduct(item) || item.fulfillment === 'delivered' || item.fulfillment === 'cancelled') return;
  item.fulfillment = 'cancelled';
  if (item.stockReserved && item.productId) {
    const p = d.products.find(p => p.id === item.productId)!;
    p.stock += item.quantity;
    item.stockReserved = false;
    d.stockMoves.unshift({ at: new Date().toISOString(), branchId: p.branchId, name: p.name, type: 'in', qty: item.quantity, note: `${f.code} · hủy món chưa giao` });
  }
}
