-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - MIGRATION
-- Migration: 10_create_user_devices.sql
-- Description: Create user_devices table for real multi-device tracking & remote logout
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(128) UNIQUE NOT NULL,
    user_email VARCHAR(255),
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    device_name VARCHAR(255),
    device_type VARCHAR(64),
    browser VARCHAR(128),
    os VARCHAR(128),
    screen_resolution VARCHAR(64),
    ip_address VARCHAR(64),
    location_name VARCHAR(255) DEFAULT 'Showroom Floor',
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & open policy for authenticated & anonymous portal access
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_devices_all" ON public.user_devices;
CREATE POLICY "user_devices_all" ON public.user_devices FOR ALL USING (true) WITH CHECK (true);

-- Index for speedy device lookup
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_tenant_id ON public.user_devices(tenant_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

