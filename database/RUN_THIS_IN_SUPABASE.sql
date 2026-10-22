-- ====================================================================
-- XENITH ERP - UNIVERSAL PRODUCTION SETUP
-- Run this directly in Supabase SQL Editor
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CREATE ALL TABLES (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(128),
    business_activity VARCHAR(255) DEFAULT 'Cloth Retail & Wholesale',
    allowed_modules JSONB DEFAULT '["sales", "purchase", "inventory", "crm", "accounts", "reports"]'::jsonb,
    seller_address TEXT,
    location_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.companies (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(64),
    email VARCHAR(128),
    ntn VARCHAR(64),
    strn VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    "customerName" VARCHAR(255),
    customername VARCHAR(255),
    customer_code VARCHAR(64),
    "customerCode" VARCHAR(64),
    account_code VARCHAR(64),
    coa_code VARCHAR(64),
    page_no VARCHAR(64),
    "pageNo" VARCHAR(64),
    "registrationType" VARCHAR(64) DEFAULT 'Retail / General',
    registrationtype VARCHAR(64) DEFAULT 'Retail / General',
    "primaryPhone" VARCHAR(64),
    phone VARCHAR(64),
    "secondaryPhone" VARCHAR(64),
    secondaryphone VARCHAR(64),
    email VARCHAR(128),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(64) DEFAULT 'Hyderabad',
    province VARCHAR(64) DEFAULT 'Sindh',
    company VARCHAR(255),
    "cnicNo" VARCHAR(32),
    "ntnNo" VARCHAR(32),
    ntn_strn VARCHAR(64),
    "stRegNo" VARCHAR(32),
    notes TEXT,
    "followUpDate" DATE,
    "currentBalance" NUMERIC(15, 2) DEFAULT 0.00,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    opening_balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_recoveries (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    customer_id BIGINT,
    customer_name VARCHAR(255),
    amount NUMERIC(15, 2) DEFAULT 0.00,
    recovery_code VARCHAR(64),
    date DATE DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(64) DEFAULT 'Cash',
    bank_account VARCHAR(128),
    reference_no VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vendors (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    vendor_name VARCHAR(255),
    name VARCHAR(255),
    company_name VARCHAR(255),
    vendor_code VARCHAR(64),
    "vendorCode" VARCHAR(64),
    page_no VARCHAR(64),
    "pageNo" VARCHAR(64),
    contact_name VARCHAR(128),
    cell_no VARCHAR(64),
    phone_no VARCHAR(64),
    phone VARCHAR(64),
    email VARCHAR(128),
    address TEXT,
    province VARCHAR(64) DEFAULT 'Sindh',
    ntn VARCHAR(32),
    cnic VARCHAR(32),
    strn VARCHAR(32),
    "currentBalance" NUMERIC(15, 2) DEFAULT 0.00,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64),
    parent_id BIGINT REFERENCES public.inventory_categories(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_brands (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_surface_finishes (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    location_type VARCHAR(64) DEFAULT 'Warehouse',
    address TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_uom (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    short_code VARCHAR(32) NOT NULL,
    full_name VARCHAR(64) NOT NULL,
    category VARCHAR(64) DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    product_name VARCHAR(255) NOT NULL,
    item_sr_no VARCHAR(128),
    category VARCHAR(128),
    sub_category VARCHAR(128),
    sub_sub_category VARCHAR(128),
    brand VARCHAR(128),
    bin VARCHAR(128),
    uom VARCHAR(64) DEFAULT 'EACH',
    product_description TEXT,
    profit NUMERIC(15, 2) DEFAULT 0.00,
    purchase_price NUMERIC(15, 2) DEFAULT 0.00,
    retail_price NUMERIC(15, 2) DEFAULT 0.00,
    sales_price NUMERIC(15, 2) DEFAULT 0.00,
    mrp NUMERIC(15, 2) DEFAULT 0.00,
    current_stock NUMERIC(15, 2) DEFAULT 0.00,
    min_stock_alert NUMERIC(15, 2) DEFAULT 5.00,
    pieces_per_box NUMERIC(10, 2),
    pcs_per_box NUMERIC(10, 2),
    pieces_per_packing NUMERIC(10, 2),
    hs_code VARCHAR(64) DEFAULT '',
    item_type VARCHAR(64) DEFAULT 'goods',
    scenario_name VARCHAR(128) DEFAULT '',
    sro_schedule_no VARCHAR(64),
    service_charges NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.opening_stocks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    product_id BIGINT,
    product_name VARCHAR(255),
    "itemName" VARCHAR(255),
    warehouse_id BIGINT,
    warehouse VARCHAR(128),
    location VARCHAR(128),
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    qty NUMERIC(15, 2) DEFAULT 0,
    unit_cost NUMERIC(15, 2) DEFAULT 0,
    entry_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    warehouse_id BIGINT,
    warehouse_name VARCHAR(128),
    product_id BIGINT,
    product_name VARCHAR(255),
    quantity NUMERIC(15, 2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_balances (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    product_name VARCHAR(255),
    warehouse_name VARCHAR(128),
    quantity NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    transfer_number VARCHAR(64),
    transfer_no VARCHAR(64),
    from_warehouse_id BIGINT,
    to_warehouse_id BIGINT,
    from_location VARCHAR(128),
    to_location VARCHAR(128),
    transfer_date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(64) DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.salesmen (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(255) NOT NULL,
    invoice_name VARCHAR(128),
    invoice_names TEXT,
    linked_salesmen JSONB DEFAULT '[]'::jsonb,
    phone VARCHAR(64),
    email VARCHAR(128),
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    commissionRate NUMERIC(5, 2) DEFAULT 0.00,
    target_amount NUMERIC(15, 2) DEFAULT 0.00,
    achieved_amount NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_leads (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    client VARCHAR(255),
    contact VARCHAR(255),
    phone VARCHAR(64),
    items JSONB DEFAULT '[]'::jsonb,
    interest TEXT,
    est_value NUMERIC(15, 2) DEFAULT 0.00,
    stage VARCHAR(64) DEFAULT 'New Inquiry',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crm_quotations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    quotation_number VARCHAR(64),
    quote_no VARCHAR(64),
    customer VARCHAR(255),
    customer_name VARCHAR(255),
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(64) DEFAULT 'Draft',
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    invoice_no VARCHAR(64) NOT NULL,
    customer_id BIGINT,
    customer_name VARCHAR(255) NOT NULL,
    buyer_ntn VARCHAR(32),
    invoice_date DATE DEFAULT CURRENT_DATE,
    warehouse VARCHAR(128),
    dispatch_warehouse VARCHAR(128),
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    cash_amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    bank_amount NUMERIC(15, 2) DEFAULT 0.00,
    receipt_status VARCHAR(64) DEFAULT 'Unpaid',
    sale_status VARCHAR(64) DEFAULT 'Final',
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_returns (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    return_no VARCHAR(64),
    original_invoice_no VARCHAR(64),
    customer_name VARCHAR(255),
    customer_id BIGINT,
    return_date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    payout_amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    receipt_status VARCHAR(64) DEFAULT 'Pending',
    status VARCHAR(64) DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_return_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    receipt_number VARCHAR(64),
    return_no VARCHAR(64),
    invoice_no VARCHAR(64),
    sales_return_id BIGINT,
    return_id BIGINT,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    refund_amount NUMERIC(15, 2) DEFAULT 0.00,
    payment_mode VARCHAR(64) DEFAULT 'Cash',
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_challans (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    challan_number VARCHAR(64),
    challan_no VARCHAR(64),
    invoice_id BIGINT,
    invoice_no VARCHAR(64),
    customer_id BIGINT,
    customer_name VARCHAR(255),
    dispatch_warehouse VARCHAR(128),
    driver_name VARCHAR(128),
    vehicle_no VARCHAR(64),
    transport_name VARCHAR(128),
    transportation VARCHAR(128),
    po_no VARCHAR(64),
    remarks TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total_quantity NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_discount NUMERIC(15, 2) DEFAULT 0.00,
    total_net_amount NUMERIC(15, 2) DEFAULT 0.00,
    delivery_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(64) DEFAULT 'Dispatched',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.supplier_purchases (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    bill_number VARCHAR(64),
    purchase_no VARCHAR(64),
    vendor_id BIGINT,
    supplier_name VARCHAR(255),
    target_warehouse VARCHAR(128),
    purchase_date DATE DEFAULT CURRENT_DATE,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    cash_amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    bank_amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    balance_amount NUMERIC(15, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(15, 2) DEFAULT 0.00,
    payment_status VARCHAR(64) DEFAULT 'Unpaid',
    payment_term VARCHAR(64) DEFAULT 'Credit',
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_returns (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    return_no VARCHAR(64),
    return_number VARCHAR(64),
    purchase_no VARCHAR(64),
    vendor_id BIGINT,
    vendor_name VARCHAR(255),
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    amount_paid NUMERIC(15, 2) DEFAULT 0.00,
    source_warehouse VARCHAR(128),
    status VARCHAR(64) DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_return_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    receipt_number VARCHAR(64),
    return_no VARCHAR(64),
    return_id BIGINT,
    amount_received NUMERIC(15, 2) DEFAULT 0.00,
    refund_amount NUMERIC(15, 2) DEFAULT 0.00,
    payment_mode VARCHAR(64) DEFAULT 'Cash',
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grn_receipts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    grn_number VARCHAR(64),
    purchase_id BIGINT,
    vendor_id BIGINT,
    vendor_name VARCHAR(255),
    received_date DATE DEFAULT CURRENT_DATE,
    warehouse_id BIGINT,
    status VARCHAR(64) DEFAULT 'Received',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grn_items (
    id BIGSERIAL PRIMARY KEY,
    grn_id BIGINT,
    product_id BIGINT,
    product_name VARCHAR(255),
    warehouse_name VARCHAR(128),
    quantity_received NUMERIC(15, 2) DEFAULT 0.00,
    accepted_qty NUMERIC(15, 2) DEFAULT 0.00,
    unit_cost NUMERIC(15, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    account_code VARCHAR(64) NOT NULL,
    account_title VARCHAR(255) NOT NULL,
    control_code VARCHAR(64),
    category_code VARCHAR(64),
    sub_category_code VARCHAR(64),
    account_type VARCHAR(64),
    opening_balance NUMERIC(15, 2) DEFAULT 0.00,
    balance_nature VARCHAR(16) DEFAULT 'Debit',
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coa_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coa_sub_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(128) NOT NULL,
    sub_category_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coa_controls (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(128) NOT NULL,
    sub_category_name VARCHAR(128) NOT NULL,
    control_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banks (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    bank_name VARCHAR(128) NOT NULL,
    "bankName" VARCHAR(128),
    account_title VARCHAR(128) NOT NULL,
    "accountTitle" VARCHAR(128),
    account_number VARCHAR(64) NOT NULL,
    "accountNumber" VARCHAR(64),
    branch_name VARCHAR(128),
    current_balance NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.financial_vouchers (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    voucher_no VARCHAR(64) NOT NULL,
    voucher_type VARCHAR(64) NOT NULL,
    voucher_date DATE DEFAULT CURRENT_DATE,
    account_code VARCHAR(64),
    account_title VARCHAR(255),
    debit NUMERIC(15, 2) DEFAULT 0.00,
    credit NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    original_invoice_no VARCHAR(64),
    items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    narration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_employees (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(255) NOT NULL,
    designation VARCHAR(128),
    designation_name VARCHAR(128),
    department VARCHAR(128),
    phone VARCHAR(64),
    email VARCHAR(128),
    basic_salary NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_designations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    title VARCHAR(128),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hr_attendance (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    employee_id BIGINT,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(32) DEFAULT 'Present'
);

CREATE TABLE IF NOT EXISTS public.hr_pay_heads (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    type VARCHAR(64) DEFAULT 'Earnings',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.logistics_transportation (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    driver_name VARCHAR(128),
    vehicle_number VARCHAR(64),
    base_charges NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(32) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    user_email VARCHAR(128),
    action VARCHAR(64),
    module VARCHAR(64),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. RETROACTIVE COLUMN HARMONIZATION (Runs BEFORE any seed insert!)
-- ====================================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "currentBalance" NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "registrationType" VARCHAR(64) DEFAULT 'Retail / General';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS registrationtype VARCHAR(64) DEFAULT 'Retail / General';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS "secondaryPhone" VARCHAR(64);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS secondaryphone VARCHAR(64);

ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS "vendorCode" VARCHAR(64);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS "pageNo" VARCHAR(64);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_name VARCHAR(128);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS cell_no VARCHAR(64);
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS phone_no VARCHAR(64);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sales_price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS cash_amount_paid NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS dispatch_warehouse VARCHAR(128);
ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS sale_status VARCHAR(64) DEFAULT 'Final';

ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS challan_no VARCHAR(64);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS dispatch_warehouse VARCHAR(128);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS transport_name VARCHAR(128);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS transportation VARCHAR(128);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS po_no VARCHAR(64);
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS total_quantity NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS total_discount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS total_net_amount NUMERIC(15, 2) DEFAULT 0.00;

-- Ensure tenant_id exists across all operational tables
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.inventory_locations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.inventory_uom ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.inventory_brands ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.inventory_surface_finishes ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.crm_quotations ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.sales_invoices ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.grn_receipts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.salesmen ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.financial_vouchers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'bashir';

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.crm_quotations ADD COLUMN IF NOT EXISTS quote_no VARCHAR(64);

ALTER TABLE public.grn_receipts ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255);
ALTER TABLE public.grn_receipts ADD COLUMN IF NOT EXISTS status VARCHAR(64) DEFAULT 'Received';
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS accepted_qty NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS product_name VARCHAR(255);
ALTER TABLE public.grn_items ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(128);

ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS purchase_no VARCHAR(64);
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS target_warehouse VARCHAR(128);
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS cash_amount_paid NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS bank_amount_paid NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.supplier_purchases ADD COLUMN IF NOT EXISTS payment_term VARCHAR(64) DEFAULT 'Credit';

ALTER TABLE public.inventory_locations ADD COLUMN IF NOT EXISTS location_type VARCHAR(64) DEFAULT 'Warehouse';
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS transfer_no VARCHAR(64);
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS from_location VARCHAR(128);
ALTER TABLE public.stock_transfers ADD COLUMN IF NOT EXISTS to_location VARCHAR(128);

ALTER TABLE public.hr_designations ADD COLUMN IF NOT EXISTS title VARCHAR(128);
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS designation_name VARCHAR(128);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(128);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS "accountTitle" VARCHAR(128);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS "accountNumber" VARCHAR(64);

-- Drop any restrictive NOT NULL on tenant_id across all tables (only for varchar/text columns)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'tenant_id'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN tenant_id DROP NOT NULL;';
            IF r.data_type IN ('character varying', 'text', 'character') THEN
                EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ALTER COLUMN tenant_id SET DEFAULT ''bashir'';';
                EXECUTE 'UPDATE public.' || quote_ident(r.table_name) || ' SET tenant_id = ''bashir'' WHERE tenant_id IS NULL;';
            END IF;
        EXCEPTION WHEN OTHERS THEN 
            NULL; -- Safely ignore if column type is UUID or restricted
        END;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_returns' AND column_name = 'return_no' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.purchase_returns ALTER COLUMN return_no DROP NOT NULL;
    END IF;
END $$;

-- 4. PERMISSIONS & DATA API GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 5. RLS POLICIES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS allow_all_' || quote_ident(r.tablename) || ' ON public.' || quote_ident(r.tablename) || ';';
        EXECUTE 'CREATE POLICY allow_all_' || quote_ident(r.tablename) || ' ON public.' || quote_ident(r.tablename) || ' FOR ALL TO public USING (true) WITH CHECK (true);';
    END LOOP;
END $$;

-- 6. SEED DATA (Now runs after all columns exist with 100% certainty)
INSERT INTO public.tenants (slug, name, email)
VALUES
    ('uzair', 'Uzair Jibran Cloth', 'admin@uzairjibrancloth.com'),
    ('bashir', 'NHT ENTERPRISE - Master', 'admin@nhtenterprise.com'),
    ('demo', 'Xenith ERP Demo', 'demo@xenitherp.com')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.companies (tenant_id, name, address, phone)
VALUES
    ('uzair', 'Uzair Jibran Cloth (Main Store)', 'Main Cloth Market', '0300-1234567'),
    ('bashir', 'NHT ENTERPRISE (Main Showroom)', 'Plot 12-A, Commercial Area, Hyderabad', '0300-1234567'),
    ('bashir', 'Al-Madina Traders', 'Shop # 4, Ceramic Market, Saddar', '0312-7654321')
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_locations (tenant_id, name, address, description)
VALUES
    ('uzair', 'Main Fabric Warehouse', 'Central Facility', 'Primary fabric storage and rolls'),
    ('uzair', 'Retail Outlet Showroom', 'Main Cloth Market', 'Retail shop and counter'),
    ('bashir', 'Main Warehouse (Site A)', 'Industrial Zone, Hyderabad', 'Primary central inventory warehouse'),
    ('bashir', 'City Center Showroom', 'Commercial Market, Saddar', 'Retail and display stock')
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_uom (tenant_id, short_code, full_name, category)
VALUES
    ('bashir', 'SQFT', 'Square Feet', 'Area & Surface'),
    ('bashir', 'SQM', 'Square Meter', 'Area & Surface'),
    ('bashir', 'BOX', 'Carton / Box', 'Packaging'),
    ('bashir', 'EACH', 'Each / Single Unit', 'Count & Units'),
    ('bashir', 'PCS', 'Pieces', 'Count & Units'),
    ('bashir', 'MTR', 'Meter', 'Length & Distance'),
    ('bashir', 'KG', 'Kilogram', 'Weight & Mass')
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_categories (tenant_id, name, description)
VALUES
    ('bashir', 'Wall Tiles', 'Glazed ceramic and porcelain wall tiles'),
    ('bashir', 'Floor Tiles', 'Vitrified polished and matte floor tiles'),
    ('bashir', 'Porcelain Tiles', 'Heavy duty outdoor and indoor porcelain'),
    ('bashir', 'Sanitary Ware', 'Commode, wash basins, vanities and bidets'),
    ('bashir', 'Bath Fittings', 'Mixers, taps, showers, and accessories')
ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_surface_finishes (tenant_id, name, description)
VALUES
    ('bashir', 'Master Tiles', 'Master ceramic & porcelain tiles'),
    ('bashir', 'Karam Ceramics', 'Premium floor and wall collection'),
    ('bashir', 'Sonex', 'Sanitary fixtures and fittings'),
    ('bashir', 'Porta', 'Luxury sanitary ware'),
    ('bashir', 'RAK Ceramics', 'Imported luxury tiles')
ON CONFLICT DO NOTHING;

INSERT INTO public.customers (tenant_id, "customerName", customer_code, "primaryPhone", city, province, company, "currentBalance", balance)
VALUES
    ('bashir', 'Al-Razi Construction Co.', '1020-001', '0300-8889991', 'Hyderabad', 'Sindh', 'NHT ENTERPRISE (Main Showroom)', 45000.00, 45000.00),
    ('bashir', 'Haji Muhammad Ismail & Sons', '1020-002', '0312-3334445', 'Karachi', 'Sindh', 'Al-Madina Traders', 125000.00, 125000.00),
    ('bashir', 'Malik Builders & Developers', '1020-003', '0333-5556667', 'Sukkur', 'Sindh', 'NHT ENTERPRISE (Main Showroom)', 0.00, 0.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.products (tenant_id, product_name, category, brand, uom, purchase_price, retail_price, sales_price, current_stock, min_stock_alert)
VALUES
    ('bashir', 'Super White Glossy 60x120', 'Floor Tiles', 'Master Tiles', 'SQFT', 180.00, 240.00, 240.00, 1500.00, 100.00),
    ('bashir', 'Calacatta Gold Marble Finish 60x60', 'Floor Tiles', 'Karam Ceramics', 'SQFT', 160.00, 210.00, 210.00, 2200.00, 150.00),
    ('bashir', 'Matte Grey Subway Tile 30x60', 'Wall Tiles', 'Master Tiles', 'SQFT', 140.00, 185.00, 185.00, 850.00, 50.00),
    ('bashir', 'One-Piece Smart Commode Ivory', 'Sanitary Ware', 'Porta', 'EACH', 18500.00, 24000.00, 24000.00, 25.00, 5.00),
    ('bashir', 'Single Lever Basin Mixer Chrome', 'Bath Fittings', 'Sonex', 'EACH', 4200.00, 5800.00, 5800.00, 60.00, 10.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.crm_leads (tenant_id, client, contact, phone, interest, est_value, stage, notes)
VALUES
    ('bashir', 'Apex Construction - Gulberg Tower', 'Engr. Tariq', '0300-1122334', 'Porcelain Floor Tiles 60x120 (3,500 sqft)', 840000.00, 'Quotation Sent', 'Quotation submitted with 5% discount option'),
    ('bashir', 'Hassan Residency Bathroom Renovation', 'Mr. Hassan', '0313-9988776', 'Sanitary Ware & Bath Fittings', 165000.00, 'New Inquiry', 'Wants modern wall-hung commodes and chrome mixers')
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_categories (name)
VALUES ('1. ASSETS'), ('2. LIABILITIES'), ('3. EQUITY / CAPITAL'), ('4. REVENUE'), ('5. EXPENSES')
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_sub_categories (category_name, sub_category_name)
VALUES
    ('1. ASSETS', 'Current Assets'),
    ('1. ASSETS', 'Fixed Assets'),
    ('2. LIABILITIES', 'Current Liabilities'),
    ('4. REVENUE', 'Operating Revenue'),
    ('5. EXPENSES', 'Cost of Goods Sold')
ON CONFLICT DO NOTHING;

INSERT INTO public.coa_controls (category_name, sub_category_name, control_name)
VALUES
    ('1. ASSETS', 'Current Assets', 'Customers'),
    ('1. ASSETS', 'Current Assets', 'Banks & Cash'),
    ('1. ASSETS', 'Current Assets', 'Inventory'),
    ('2. LIABILITIES', 'Current Liabilities', 'Suppliers / Vendors')
ON CONFLICT DO NOTHING;

INSERT INTO public.hr_designations (name, title, description)
VALUES 
    ('Showroom Manager', 'Showroom Manager', 'Manager in charge of retail showroom'),
    ('Sales Executive', 'Sales Executive', 'Direct sales and customer relations'),
    ('Accountant', 'Accountant', 'Accounts & ledger management'),
    ('Warehouse Officer', 'Warehouse Officer', 'Inventory and dispatches')
ON CONFLICT DO NOTHING;

INSERT INTO public.logistics_transportation (name, base_charges, status)
VALUES 
    ('Faisal Movers Cargo', 2500.00, 'Active'),
    ('Daewoo Express Cargo', 3500.00, 'Active'),
    ('Local Truck Carriage (Hyderabad/Karachi)', 12000.00, 'Active')
ON CONFLICT DO NOTHING;

-- 7. CRM FOLLOW-UPS TABLE
CREATE TABLE IF NOT EXISTS public.crm_follow_ups (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    contact_phone TEXT,
    objective TEXT NOT NULL,
    due_date TEXT NOT NULL,
    assignee TEXT DEFAULT 'Sales Team',
    priority TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    tenant_id TEXT
);

ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_follow_ups_public_all" ON public.crm_follow_ups;
CREATE POLICY "crm_follow_ups_public_all" ON public.crm_follow_ups FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. COMPREHENSIVE SCHEMA COMPATIBILITY PATCHES (PREVENT SCHEMA CACHE ERRORS ACROSS ALL PAGES)
ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES public.inventory_categories(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_categories ADD COLUMN IF NOT EXISTS code VARCHAR(64);

CREATE TABLE IF NOT EXISTS public.inventory_prints (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    name VARCHAR(128) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.inventory_prints ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_prints' AND policyname = 'inventory_prints_all') THEN
        CREATE POLICY "inventory_prints_all" ON public.inventory_prints FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
UPDATE public.customers SET customer_name = COALESCE("customerName", customername) WHERE customer_name IS NULL;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS item_code VARCHAR(128);
UPDATE public.products SET sale_price = COALESCE(sales_price, retail_price, 0), price = COALESCE(retail_price, sales_price, 0), item_code = item_sr_no WHERE sale_price IS NULL OR sale_price = 0;

ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS actitle VARCHAR(255);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS acnumber VARCHAR(255);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS "acTitle" VARCHAR(255);
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS "acNumber" VARCHAR(255);
UPDATE public.banks SET 
    actitle = COALESCE(account_title, "accountTitle"), 
    acnumber = COALESCE(account_number, "accountNumber"),
    "acTitle" = COALESCE(account_title, "accountTitle"), 
    "acNumber" = COALESCE(account_number, "accountNumber")
WHERE actitle IS NULL;

ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS inward_status VARCHAR(64) DEFAULT 'Received';
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS received_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(128);
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS total_net_amount NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.sales_returns ADD COLUMN IF NOT EXISTS warehouse_name VARCHAR(128) DEFAULT 'Main Warehouse';
UPDATE public.sales_returns SET invoice_no = original_invoice_no, total_net_amount = total_amount WHERE invoice_no IS NULL;

ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(128);
ALTER TABLE public.purchase_returns ADD COLUMN IF NOT EXISTS total_net_amount NUMERIC(15, 2) DEFAULT 0.00;

ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS ac_code VARCHAR(64);
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS ac_title VARCHAR(255);
UPDATE public.chart_of_accounts SET ac_code = account_code, ac_title = account_title WHERE ac_code IS NULL;

ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS freight_payment_status VARCHAR(64) DEFAULT 'Pending';
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS freight_charges NUMERIC(15, 2) DEFAULT 0.00;

-- Minimal Default Chart of Accounts for Cloth Retail & Wholesale Business
INSERT INTO public.chart_of_accounts (account_code, ac_code, account_title, ac_title, category_code, sub_category_code, control_code, balance_nature, opening_balance, notes)
VALUES
  ('1010-001', '1010-001', 'Cash in Hand', 'Cash in Hand', '1. ASSETS', 'Current Assets', 'Cash', 'Debit', 0.00, 'Main shop counter cash drawer'),
  ('3010-001', '3010-001', 'Owner Capital', 'Owner Capital', '3. EQUITY', 'Capital & Equity', 'Capital', 'Credit', 0.00, 'Initial capital & business investment by owner'),
  ('3010-002', '3010-002', 'Owner Drawings', 'Owner Drawings', '3. EQUITY', 'Capital & Equity', 'Capital', 'Debit', 0.00, 'Personal cash withdrawals by owner'),
  ('5020-001', '5020-001', 'Shop Expenses', 'Shop Expenses', '5. EXPENSES', 'Indirect Expenses', 'General Expenses', 'Debit', 0.00, 'Daily shop expenses (rent, electricity, tea, staff, cleaning)')
ON CONFLICT (account_code) DO NOTHING;

DELETE FROM public.inventory_categories WHERE name IN ('Wall Tiles', 'Floor Tiles', 'Porcelain Tiles', 'Sanitary Ware', 'Bath Fittings');
DELETE FROM public.products WHERE category IN ('Wall Tiles', 'Floor Tiles', 'Porcelain Tiles', 'Sanitary Ware', 'Bath Fittings');
NOTIFY pgrst, 'reload schema';


