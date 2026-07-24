export interface Product {
  id: string;
  make: string;
  model: string;
  trim: string;
  modelYear: number;
  condition: 'new' | 'old';
  engine: string;
  color: string;
  mileage: number;
  price: number;
  status: 'active' | 'inactive';
  images: string[];
  documents: ProductDocument[];
  attributes: ProductAttribute[];
  description?: string;
  chassisNumber?: string;
  engineNumber?: string;
  /** Owning partner/dealer company. Undefined/null = platform (admin-managed). */
  companyId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDocument {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ProductFilter {
  condition?: ('new' | 'old')[];
  status?: ('active' | 'inactive')[];
  make?: string[];
  model?: string[];
  trim?: string[];
  modelYear?: number[];
  engine?: string[];
  color?: string[];
  /** Admin partner filter / dealer scope. */
  companyId?: string;
  /** UI-only convenience field (used by FilterPanel range sliders). */
  priceRange?: [number, number];
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  search?: string;
}
