-- Fix: add missing onboarding columns to talent_profiles and client_profiles
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

ALTER TABLE talent_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step        integer  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed   boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS tagline                text,
  ADD COLUMN IF NOT EXISTS rate_currency          text     DEFAULT 'NGN';

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step        integer  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed   boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS hiring_categories      text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS typical_budget         text;
