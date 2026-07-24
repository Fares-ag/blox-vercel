import type { Product, ProductAttribute } from '../models/product.model';

/** Read a named attribute from the product attributes array (or map-like shape). */
export function getProductAttribute(
  product: Pick<Product, 'attributes'> | { attributes?: ProductAttribute[] | Record<string, unknown> | null },
  key: string
): string | undefined {
  const attrs = product.attributes;
  if (!attrs) return undefined;
  if (Array.isArray(attrs)) {
    const hit = attrs.find(
      (a) =>
        (a.id && a.id === key) ||
        (a.name && a.name.toLowerCase() === key.toLowerCase())
    );
    const v = hit?.value;
    return v != null && String(v).trim() ? String(v).trim() : undefined;
  }
  const raw = (attrs as Record<string, unknown>)[key];
  if (raw == null) return undefined;
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    const v = (raw as { value?: unknown }).value;
    return v != null && String(v).trim() ? String(v).trim() : undefined;
  }
  return String(raw).trim() || undefined;
}

export function getModelFamilyKey(product: Pick<Product, 'attributes' | 'model'>): string | undefined {
  return (
    getProductAttribute(product, 'model_family_key') ||
    (product.model ? product.model.toLowerCase().replace(/\s+/g, '-') : undefined)
  );
}

/** Familiar catalog title: `Audi Q5 Sportback` / `Audi Q7 250 kW`. */
export function formatProductDisplayTitle(
  product: Pick<Product, 'make' | 'model' | 'trim'>
): string {
  return [product.make, product.model, product.trim]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ');
}

export function getProductBodyStyle(
  product: Pick<Product, 'attributes' | 'trim'>
): string | undefined {
  return getProductAttribute(product, 'body_style') || undefined;
}

export function getProductPerformanceLine(
  product: Pick<Product, 'attributes'>
): string | undefined {
  return getProductAttribute(product, 'performance_line');
}
