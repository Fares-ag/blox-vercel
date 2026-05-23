export interface Package {
  id: string;
  name: string;
  description: string;
  items: PackageItem[];
  price: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PackageItem {
  id: string;
  name: string;
  description: string;
}
