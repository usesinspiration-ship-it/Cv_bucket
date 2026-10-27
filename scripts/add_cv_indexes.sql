-- ==============================================================================
-- Jobusiness: Performance Indexes for CV Duplicate Checks and Lookups
-- Run this in your Supabase SQL Editor to make hash and phone checks instantaneous
-- ==============================================================================

-- 1. Index on fileHash for instant duplicate screening during upload
CREATE INDEX IF NOT EXISTS idx_cvs_file_hash ON public.cvs("fileHash");

-- 2. Index on phone number for phone duplicate detection
CREATE INDEX IF NOT EXISTS idx_cvs_phone ON public.cvs(phone);

-- 3. Index on userId for fast candidate filtering by owner
CREATE INDEX IF NOT EXISTS idx_cvs_user_id ON public.cvs("userId");

-- 4. Composite index on createdAt for fast library pagination
CREATE INDEX IF NOT EXISTS idx_cvs_created_at_desc ON public.cvs("createdAt" DESC);
