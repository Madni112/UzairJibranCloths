-- ====================================================================
-- NOOR HORIZON TECHNOLOGIES ERP - MIGRATION
-- Migration: 09_add_vendor_city_and_area.sql
-- Description: Add city, area, and sub_area columns to vendors table
-- ====================================================================

ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS sub_area text;
ALTER TABLE IF EXISTS vendors ADD COLUMN IF NOT EXISTS "subArea" text;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
