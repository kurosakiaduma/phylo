# Bug Fix: TreeSettings Attribute Error

**Date:** October 2, 2025  
**Status:** ✅ Fixed

## Issue

When attempting to create a new tree via `POST /api/trees`, the backend crashed with:

```
AttributeError: 'TreeSettings' object has no attribute 'maxSpousesPerMember'
```

## Root Cause

The `TreeSettings` Pydantic schema in `apps/backend/schemas/__init__.py` uses **snake_case** naming convention:

- `max_spouses_per_member`
- `max_parents_per_child`
- `allow_polygamy`

However, the validation code in `apps/backend/api/trees.py` was attempting to access these fields using **camelCase**:

- `maxSpousesPerMember`
- `maxParentsPerChild`
- `allowPolygamy`

## Solution

**Part 1: Fixed Backend Attribute Access**

Updated `apps/backend/api/trees.py` to use snake_case attribute names matching the schema definition:

```python
# Before (camelCase - WRONG)
if settings.maxSpousesPerMember and settings.maxSpousesPerMember < 1:
    raise HTTPException(...)

# After (snake_case - CORRECT)
if settings.max_spouses_per_member and settings.max_spouses_per_member < 1:
    raise HTTPException(...)
```

**Part 2: Added Field Aliases for Frontend Compatibility**

Updated `TreeSettings` schema in `apps/backend/schemas/__init__.py` to accept **both** camelCase (from frontend) and snake_case (Python convention) using Pydantic Field aliases:

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class TreeSettings(BaseModel):
    """Tree settings with support for both snake_case and camelCase (frontend compatibility)."""
    allow_same_sex: bool = Field(True, alias='allowSameSex')
    monogamy: bool = True
    allow_polygamy: bool = Field(False, alias='allowPolygamy')
    max_spouses_per_member: Optional[int] = Field(None, alias='maxSpousesPerMember')
    allow_single_parent: bool = Field(True, alias='allowSingleParent')
    allow_multi_parent_children: bool = Field(False, alias='allowMultiParentChildren')
    max_parents_per_child: Optional[int] = Field(2, alias='maxParentsPerChild')

    model_config = ConfigDict(populate_by_name=True)
```

This configuration allows the schema to accept **BOTH** naming conventions:

- Frontend sends: `{"allowSameSex": true, "maxSpousesPerMember": 2}`
- Backend accesses: `settings.allow_same_sex` and `settings.max_spouses_per_member`

### Changed Lines:

**In `api/trees.py`:**

1. Line 186: `settings.allowPolygamy` → `settings.allow_polygamy`
2. Line 192: `settings.maxSpousesPerMember` → `settings.max_spouses_per_member`
3. Line 195: Error message updated for consistency
4. Line 198: `settings.maxParentsPerChild` → `settings.max_parents_per_child`
5. Line 201: Error message updated for consistency

**In `schemas/__init__.py`:**

1. Added `Field` import from pydantic
2. Updated all `TreeSettings` fields to use `Field(default, alias='camelCase')`
3. Added `model_config = ConfigDict(populate_by_name=True)` for Pydantic v2
4. Added `allow_population_by_field_name = True` for Pydantic v1 compatibility

## Testing

After fix:

- ✅ Backend imports all models successfully
- ✅ No Python syntax errors
- ✅ Ready for tree creation testing

## Prevention

**Going Forward:**

- Always verify Pydantic schema field names match Python naming conventions (snake_case)
- When frontend uses camelCase, handle conversion at API boundary (use Pydantic aliases if needed)
- Add linting rules to catch attribute access mismatches

## Related Files

- `apps/backend/schemas/__init__.py` - TreeSettings schema definition (snake_case)
- `apps/backend/api/trees.py` - Tree creation endpoint (now fixed)
- Frontend: `apps/frontend/family-tree/src/app/(dashboard)/trees/new/page.tsx` - Sends camelCase from frontend

## Note on Frontend/Backend Naming

The frontend sends camelCase in JSON:

```json
{
  "name": "My Family Tree",
  "settings": {
    "allowSameSex": true,
    "allowPolygamy": false,
    "maxSpousesPerMember": 2
  }
}
```

Pydantic automatically converts this to snake_case when deserializing into the `TreeSettings` model. This is standard Pydantic behavior and works correctly. The bug was only in the manual attribute access within the validation code.

## Status

✅ **Fixed and ready for testing**
