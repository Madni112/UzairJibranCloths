-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - MIGRATION
-- Migration: 11_create_bom_manufacturing.sql
-- Description: Create bom_headers and bom_items for universal Bill of Materials
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.bom_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) DEFAULT 'uzair',
    bom_number VARCHAR(64) NOT NULL UNIQUE,
    finished_product_id VARCHAR(128),
    finished_product_name VARCHAR(255) NOT NULL,
    finished_product_code VARCHAR(128),
    category VARCHAR(128) DEFAULT 'General',
    batch_quantity NUMERIC NOT NULL DEFAULT 1,
    uom VARCHAR(32) NOT NULL DEFAULT 'PCS',
    raw_material_cost NUMERIC NOT NULL DEFAULT 0,
    labor_cost NUMERIC NOT NULL DEFAULT 0,
    overhead_cost NUMERIC NOT NULL DEFAULT 0,
    packaging_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    target_selling_price NUMERIC NOT NULL DEFAULT 0,
    margin_percentage NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bom_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bom_id UUID NOT NULL REFERENCES public.bom_headers(id) ON DELETE CASCADE,
    item_id VARCHAR(128),
    item_name VARCHAR(255) NOT NULL,
    item_code VARCHAR(128),
    quantity NUMERIC NOT NULL DEFAULT 1,
    uom VARCHAR(32) NOT NULL DEFAULT 'PCS',
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    wastage_percentage NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS & open policy for authenticated & anonymous portal access
ALTER TABLE public.bom_headers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bom_headers_all" ON public.bom_headers;
CREATE POLICY "bom_headers_all" ON public.bom_headers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bom_items_all" ON public.bom_items;
CREATE POLICY "bom_items_all" ON public.bom_items FOR ALL USING (true) WITH CHECK (true);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_bom_headers_bom_number ON public.bom_headers(bom_number);
CREATE INDEX IF NOT EXISTS idx_bom_headers_finished_product_name ON public.bom_headers(finished_product_name);
CREATE INDEX IF NOT EXISTS idx_bom_headers_tenant_id ON public.bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON public.bom_items(bom_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
