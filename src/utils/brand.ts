/**
 * Dynamic Enterprise Branding Configuration for Uzair Jibran Cloth
 * 
 * Guarantees zero cross-contamination so brand name, codes, and credentials
 * remain strictly scoped to UZAIR JIBRAN CLOTH.
 */

export interface BrandConfig {
  isAlm: boolean;
  code: 'UJC' | 'ALM' | 'ZAC';
  name: string;
  fullName: string;
  brandWord1: string;
  brandWord2: string;
  brandSuffix: string;
  shortName: string;
  portalName: string;
  adminEmail: string;
  supportPhone: string;
  address: string;
  tagline: string;
}

export function detectIsAlm(): boolean {
  return false;
}

export function getBrandConfig(): BrandConfig {
  return {
    isAlm: false,
    code: 'UJC',
    name: 'Uzair Jibran Cloth',
    fullName: 'UZAIR JIBRAN CLOTH',
    brandWord1: 'UZAIR',
    brandWord2: 'JIBRAN',
    brandSuffix: 'CLOTH',
    shortName: 'UJC',
    portalName: 'Uzair Jibran Cloth (UJC)',
    adminEmail: 'uzairjibran@nht.com',
    supportPhone: '0312-8039911',
    address: 'Cloth Market, Pakistan',
    tagline: 'Retail & Wholesale Textile Management Infrastructure',
  };
}

