-- ============================================================================
-- FIX TRANSLATION TABLE TRIGGERS
-- ============================================================================
-- Problem: The update_updated_at_column() function references 'updated_at'
-- but translation tables use 'last_updated_at' instead
--
-- Error: record "new" has no field "updated_at"
--
-- Solution: Create a separate trigger function for translation tables
-- and remove the incorrect triggers
-- ============================================================================

-- Create a trigger function specifically for translation tables
CREATE OR REPLACE FUNCTION update_translation_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the incorrect triggers that reference updated_at on translation tables
DROP TRIGGER IF EXISTS trg_update_region_translations_updated_at ON region_translations;
DROP TRIGGER IF EXISTS trg_update_country_translations_updated_at ON country_translations;
DROP TRIGGER IF EXISTS trg_update_plan_translations_updated_at ON plan_translations;
DROP TRIGGER IF EXISTS trg_update_regional_plan_translations_updated_at ON regional_plan_translations;

-- Create correct triggers for translation tables using last_updated_at
CREATE TRIGGER trg_update_region_translations_last_updated_at
    BEFORE UPDATE ON region_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_last_updated_at();

CREATE TRIGGER trg_update_country_translations_last_updated_at
    BEFORE UPDATE ON country_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_last_updated_at();

CREATE TRIGGER trg_update_plan_translations_last_updated_at
    BEFORE UPDATE ON plan_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_last_updated_at();

CREATE TRIGGER trg_update_regional_plan_translations_last_updated_at
    BEFORE UPDATE ON regional_plan_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_last_updated_at();

-- Verify the fix
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN (
    'region_translations',
    'country_translations',
    'plan_translations',
    'regional_plan_translations'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- Run this script in the Supabase SQL Editor to fix the trigger issue
-- After running, the translation APIs should work correctly
-- ============================================================================
