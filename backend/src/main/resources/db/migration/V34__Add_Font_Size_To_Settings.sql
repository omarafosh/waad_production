-- V34__Add_Font_Size_To_Settings.sql
-- Add font_size column to settings table to persist user preference
ALTER TABLE settings ADD COLUMN font_size DOUBLE PRECISION DEFAULT 1.0;
