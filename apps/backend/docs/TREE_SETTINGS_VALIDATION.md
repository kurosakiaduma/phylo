# Tree Settings Validation - Edge Case Handling

## Problem Statement

When users create family trees with modern features enabled (polygamy, same-sex unions, multi-parent children, etc.) and then later decide to disable these features, it can create data integrity issues. For example:

- **Scenario 1**: User creates a tree with polygamy enabled, adds members with multiple spouses, then tries to enable monogamy
- **Scenario 2**: User allows same-sex unions, adds same-sex couples, then tries to disable this feature
- **Scenario 3**: User allows 4 parents per child, adds children with 3-4 parents, then tries to limit it to 2

These changes would break the existing tree structure and violate relationship constraints.

## Solution

We've implemented a **comprehensive validation system** that prevents destructive settings changes by:

1. **Analyzing existing relationships** before allowing settings changes
2. **Providing detailed feedback** about what would be violated
3. **Offering a preview endpoint** to see impact before applying changes
4. **Blocking invalid changes** with clear error messages

## Architecture

### Components

```
┌─────────────────────────────────────┐
│  PUT/PATCH /api/trees/{id}          │
│  (Tree Settings Update)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  utils/tree_validation.py           │
│  validate_settings_change()         │
├─────────────────────────────────────┤
│  • Check monogamy violations        │
│  • Check same-sex violations        │
│  • Check single parent violations   │
│  • Check multi-parent violations    │
│  • Check max spouse violations      │
│  • Check max parent violations      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Analyze Relationships              │
│  • Count spouses per member         │
│  • Count parents per child          │
│  • Check gender combinations        │
│  • Find constraint violations       │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    ✅ Valid      ❌ Invalid
        │             │
        ▼             ▼
   Apply Update   Return Error
                  + Impact Report
```

### Key Functions

#### `validate_settings_change()`

Main validation function that checks if settings changes are safe.

**Returns:**

- `(True, None)` - Safe to apply
- `(False, [errors])` - Violations found

#### `get_settings_change_impact()`

Detailed impact analysis showing what would be affected.

**Returns:**

```json
{
  "total_members": 10,
  "total_relationships": 15,
  "changes": [...],
  "warnings": [...],
  "safe": false
}
```

## Validation Rules

### 1. Monogamy Enforcement

**Rule**: Cannot enable monogamy if any member has multiple spouses.

**Check**: Count spouse relationships per member

```python
# Violation example:
John Smith has 3 spouses -> Cannot enable monogamy
```

**Error Message**:

```
Cannot enable monogamy: 2 member(s) have multiple spouses.
Members affected: John Smith, Jane Doe
```

---

### 2. Same-Sex Union Restriction

**Rule**: Cannot disable same-sex unions if same-sex couples exist.

**Check**: Compare genders of spouses

```python
# Violation example:
Alice & Amy (both female) -> Cannot disable same-sex unions
```

**Error Message**:

```
Cannot disable same-sex unions: 3 same-sex spouse relationship(s) exist.
Relationships: Alice & Amy, Bob & Bill, Carol & Catherine
```

---

### 3. Single Parent Restriction

**Rule**: Cannot disable single parents if children have only one parent.

**Check**: Count parent-child relationships per child

```python
# Violation example:
Child "Tommy" has 1 parent -> Cannot disable single parents
```

**Error Message**:

```
Cannot disable single parents: 5 child(ren) have only one parent.
Children affected: Tommy, Sarah, Mike, Lisa, David
```

---

### 4. Multi-Parent Restriction

**Rule**: Cannot disable multi-parent children if children have >2 parents.

**Check**: Count parents per child

```python
# Violation example:
Child "Emma" has 3 parents -> Cannot disable multi-parent
```

**Error Message**:

```
Cannot disable multi-parent children: 2 child(ren) have more than 2 parents.
Children affected: Emma, Oliver
```

---

### 5. Max Spouses Reduction

**Rule**: Cannot reduce max spouses below current maximum.

**Check**: Find member with most spouses

```python
# Violation example:
max_spouses_per_member: 5 -> 2
But "King Henry" has 4 spouses -> Cannot reduce to 2
```

**Error Message**:

```
Cannot reduce max_spouses_per_member to 2: 1 member(s) currently have more spouses (up to 4).
Members affected: King Henry
```

---

### 6. Max Parents Reduction

**Rule**: Cannot reduce max parents below current maximum.

**Check**: Find child with most parents

```python
# Violation example:
max_parents_per_child: 4 -> 2
But "Shared Custody Kid" has 3 parents -> Cannot reduce to 2
```

**Error Message**:

```
Cannot reduce max_parents_per_child to 2: 1 child(ren) currently have more parents (up to 3).
Children affected: Shared Custody Kid
```

## API Usage

### Update Settings (with Validation)

**Endpoint**: `PATCH /api/trees/{tree_id}`

```bash
curl -X PATCH "http://localhost:8000/api/trees/{tree_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "monogamy": true,
      "allow_same_sex": false,
      "max_spouses_per_member": 2
    }
  }'
```

**Success Response (200)**:

```json
{
  "id": "uuid",
  "name": "Family Tree",
  "settings": {
    "monogamy": true,
    "allow_same_sex": false,
    "max_spouses_per_member": 2
  }
}
```

**Error Response (409 Conflict)**:

```json
{
  "detail": {
    "message": "Settings change would violate existing relationships",
    "errors": [
      "Cannot enable monogamy: 2 member(s) have multiple spouses. Members affected: John Smith, Jane Doe"
    ],
    "impact": {
      "total_members": 10,
      "total_relationships": 15,
      "changes": [...],
      "warnings": [
        {
          "type": "monogamy_violation",
          "count": 2,
          "members": ["John Smith", "Jane Doe"]
        }
      ],
      "safe": false
    },
    "suggestion": "Remove or modify the conflicting relationships before changing these settings"
  }
}
```

---

### Preview Settings Changes

**Endpoint**: `POST /api/trees/{tree_id}/settings/preview`

Preview the impact **without applying** the changes.

```bash
curl -X POST "http://localhost:8000/api/trees/{tree_id}/settings/preview" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "monogamy": true,
    "allow_same_sex": false,
    "allow_single_parent": false
  }'
```

**Response**:

```json
{
  "tree_id": "uuid",
  "current_settings": {
    "monogamy": false,
    "allow_same_sex": true,
    "allow_single_parent": true
  },
  "proposed_settings": {
    "monogamy": true,
    "allow_same_sex": false,
    "allow_single_parent": false
  },
  "impact": {
    "total_members": 10,
    "total_relationships": 15,
    "changes": [
      {
        "setting": "monogamy",
        "old_value": false,
        "new_value": true
      },
      {
        "setting": "allow_same_sex",
        "old_value": true,
        "new_value": false
      }
    ],
    "warnings": [
      {
        "type": "monogamy_violation",
        "count": 2,
        "members": ["John Smith", "Jane Doe"]
      },
      {
        "type": "same_sex_violation",
        "count": 1,
        "relationships": ["Alice & Amy"]
      }
    ],
    "safe": false
  },
  "can_apply": false,
  "validation_errors": [
    "Cannot enable monogamy: 2 member(s) have multiple spouses...",
    "Cannot disable same-sex unions: 1 same-sex spouse relationship(s) exist..."
  ],
  "recommendation": "Cannot apply - would violate existing relationships. Remove or modify conflicting relationships first."
}
```

## Frontend Integration

### Example React Hook

```typescript
const useTreeSettings = (treeId: string) => {
  const [settings, setSettings] = useState<TreeSettings>();
  const [previewResult, setPreviewResult] = useState<any>();

  const previewChange = async (newSettings: TreeSettings) => {
    const response = await fetch(`/api/trees/${treeId}/settings/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
      credentials: 'include',
    });

    const result = await response.json();
    setPreviewResult(result);
    return result;
  };

  const applySettings = async (newSettings: TreeSettings) => {
    try {
      const response = await fetch(`/api/trees/${treeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail.message);
      }

      return await response.json();
    } catch (error) {
      // Handle validation errors
      console.error('Settings update failed:', error);
      throw error;
    }
  };

  return { settings, previewChange, applySettings, previewResult };
};
```

### Example Usage in Component

```typescript
function TreeSettingsForm({ treeId }: { treeId: string }) {
  const { previewChange, applySettings } = useTreeSettings(treeId);
  const [showWarning, setShowWarning] = useState(false);
  const [impact, setImpact] = useState<any>();

  const handleSettingsChange = async (newSettings: TreeSettings) => {
    // Preview first
    const preview = await previewChange(newSettings);

    if (!preview.can_apply) {
      // Show warnings
      setImpact(preview.impact);
      setShowWarning(true);
      return;
    }

    // Safe to apply
    await applySettings(newSettings);
  };

  return (
    <div>
      {showWarning && (
        <Alert severity="error">
          <AlertTitle>Cannot Apply Settings</AlertTitle>
          {impact.validation_errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
          <p>{impact.recommendation}</p>
        </Alert>
      )}

      {/* Settings form */}
    </div>
  );
}
```

## Resolution Workflow

When a user tries to make an invalid settings change:

1. **User attempts change** → `PATCH /api/trees/{id}`
2. **Validation fails** → Returns 409 with detailed errors
3. **Frontend shows warnings** → Display affected members/relationships
4. **User options**:
   - **Option A**: Cancel the settings change
   - **Option B**: Remove/modify conflicting relationships first
   - **Option C**: Use preview endpoint to see full impact

### Example Resolution Flow

```
User wants to enable monogamy
          ↓
Validation detects John has 2 spouses
          ↓
Show error: "John Smith has 2 spouses"
          ↓
User options:
  1. Keep polygamy enabled
  2. Remove one of John's spouse relationships
  3. Choose different spouse as "primary"
          ↓
After resolving conflicts
          ↓
Settings update succeeds
```

## Testing

### Test Cases

```python
# Test 1: Enable monogamy with polygamous members
def test_monogamy_with_multiple_spouses():
    # Setup: Create member with 2 spouses
    # Attempt: Enable monogamy
    # Expected: 409 error with violation details

# Test 2: Disable same-sex with existing same-sex couple
def test_disable_same_sex_with_existing_couples():
    # Setup: Create same-sex couple
    # Attempt: Disable allow_same_sex
    # Expected: 409 error

# Test 3: Reduce max spouses below current
def test_reduce_max_spouses():
    # Setup: Member with 3 spouses
    # Attempt: Set max_spouses_per_member = 2
    # Expected: 409 error

# Test 4: Valid change on empty tree
def test_valid_change_empty_tree():
    # Setup: Empty tree
    # Attempt: Any settings change
    # Expected: 200 success

# Test 5: Preview endpoint
def test_preview_impact():
    # Setup: Tree with violations
    # Attempt: Preview settings change
    # Expected: Detailed impact report
```

## Performance Considerations

### Query Optimization

- All validation queries use indexed columns
- Composite indexes on `(tree_id, type)` for relationships
- Efficient counting without loading full objects

### Caching Strategy

For large trees, consider caching:

- Relationship counts per member
- Gender statistics
- Parent-child mappings

```python
# Example caching
@lru_cache(maxsize=128)
def get_spouse_counts(tree_id: UUID):
    # Cache for 5 minutes
    pass
```

## Future Enhancements

- [ ] Batch relationship fixes (auto-resolve conflicts)
- [ ] Settings history/versioning
- [ ] Rollback mechanism
- [ ] More granular warnings (show specific relationships)
- [ ] Export conflict report as PDF
- [ ] Suggest resolution strategies
- [ ] "Dry run" mode for mass changes

## Summary

This edge case handling ensures:

✅ **Data Integrity** - No orphaned or invalid relationships  
✅ **User Safety** - Prevents accidental data loss  
✅ **Clear Feedback** - Detailed error messages  
✅ **Informed Decisions** - Preview before applying  
✅ **Flexible Resolution** - Multiple paths forward

The system protects users from making destructive changes while maintaining flexibility for legitimate use cases.
