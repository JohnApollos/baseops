-- ============================================================
-- Migration: 00005_cod_settlement_ledger.sql
-- Description: Financial Event Ledger & COD Settlement Architecture
--   - Adds COD and reconciliation tracking to public.parcels
--   - Adds immutable financial execution audit fields to public.delivery_events
--   - Adds collision and settlement exception tracking for offline sync
--   - Enforces non-negative financial invariants via CHECK constraints
--   - Adds indexes for financial variance and reconciliation reporting
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTEND PARCELS TABLE WITH CASH-ON-DELIVERY (COD) METRICS
-- ------------------------------------------------------------

ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS cod_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pending';

-- Domain constraint: Ensure non-negative amounts
ALTER TABLE public.parcels
  DROP CONSTRAINT IF EXISTS chk_parcels_cod_non_negative,
  ADD CONSTRAINT chk_parcels_cod_non_negative CHECK (cod_amount >= 0.00 AND collected_amount >= 0.00);

-- Domain constraint: Valid payment methods
ALTER TABLE public.parcels
  DROP CONSTRAINT IF EXISTS chk_parcels_payment_method,
  ADD CONSTRAINT chk_parcels_payment_method CHECK (payment_method IN ('cash', 'mpesa', 'prepaid', 'none'));

-- Domain constraint: Valid reconciliation lifecycle statuses
ALTER TABLE public.parcels
  DROP CONSTRAINT IF EXISTS chk_parcels_reconciliation_status,
  ADD CONSTRAINT chk_parcels_reconciliation_status CHECK (reconciliation_status IN ('pending', 'reconciled', 'disputed', 'waived'));

-- ------------------------------------------------------------
-- 2. EXTEND DELIVERY EVENTS WITH IMMUTABLE FINANCIAL LEDGER DATA
-- ------------------------------------------------------------

ALTER TABLE public.delivery_events
  ADD COLUMN IF NOT EXISTS amount_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS is_collision BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collision_reason TEXT;

-- Domain constraint: Valid payment methods on execution event
ALTER TABLE public.delivery_events
  DROP CONSTRAINT IF EXISTS chk_delivery_events_payment_method,
  ADD CONSTRAINT chk_delivery_events_payment_method CHECK (payment_method IN ('cash', 'mpesa', 'none'));

-- Domain constraint: Ensure non-negative collected amount on events
ALTER TABLE public.delivery_events
  DROP CONSTRAINT IF EXISTS chk_delivery_events_amount_non_negative,
  ADD CONSTRAINT chk_delivery_events_amount_non_negative CHECK (amount_collected >= 0.00);

-- ------------------------------------------------------------
-- 3. HIGH-PERFORMANCE INDEXES FOR FINANCIAL REPORTING & AUDITING
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_parcels_org_reconciliation 
  ON public.parcels(org_id, reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_parcels_org_payment_method 
  ON public.parcels(org_id, payment_method);

CREATE INDEX IF NOT EXISTS idx_delivery_events_org_collision 
  ON public.delivery_events(org_id, is_collision);

CREATE INDEX IF NOT EXISTS idx_delivery_events_org_payment 
  ON public.delivery_events(org_id, payment_method, created_at DESC);

COMMENT ON COLUMN public.parcels.cod_amount IS 'Expected Cash-on-Delivery amount to collect from recipient upon delivery.';
COMMENT ON COLUMN public.parcels.collected_amount IS 'Actual Cash-on-Delivery amount recorded upon delivery.';
COMMENT ON COLUMN public.parcels.reconciliation_status IS 'End-of-day settlement status: pending, reconciled, disputed, or waived.';
COMMENT ON COLUMN public.delivery_events.is_collision IS 'True if an offline delivery collided with a server-side state change (e.g. cancelled order).';
