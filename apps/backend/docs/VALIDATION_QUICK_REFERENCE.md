# Tree Settings Validation - Quick Reference

## 🚀 Quick Start

### Testing the Feature

```bash
# Start backend
cd apps/backend
uvicorn api.main:app --reload --port 8000

# Run validation tests
python test_tree_validation.py
```

### Basic API Calls

```bash
# Preview settings change (safe, no modifications)
curl -X POST "http://localhost:8000/api/trees/{tree_id}/settings/preview" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"monogamy": true}'

# Apply settings change (validated, may fail)
curl -X PATCH "http://localhost:8000/api/trees/{tree_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"settings": {"monogamy": true}}'
```

---

## ⚠️ Validation Rules Summary

| Setting                              | Constraint              | Error When                 |
| ------------------------------------ | ----------------------- | -------------------------- |
| `monogamy: true`                     | Max 1 spouse per member | Any member has >1 spouse   |
| `allow_same_sex: false`              | No same-gender spouses  | Any same-sex couple exists |
| `allow_single_parent: false`         | Children need 2 parents | Any child has 1 parent     |
| `allow_multi_parent_children: false` | Max 2 parents per child | Any child has >2 parents   |
| `max_spouses_per_member: N`          | Spouse limit            | Any member has >N spouses  |
| `max_parents_per_child: N`           | Parent limit            | Any child has >N parents   |

---

## 📋 Common Scenarios

### Scenario 1: Enabling Monogamy

**Before**:

```json
{
  "monogamy": false,
  "allow_polygamy": true
}
```

**Attempt**:

```json
{
  "monogamy": true
}
```

**Result if John has 2 spouses**:

```json
{
  "detail": {
    "message": "Settings change would violate existing relationships",
    "errors": [
      "Cannot enable monogamy: 1 member(s) have multiple spouses. Members affected: John Smith"
    ]
  }
}
```

**Fix**: Remove one of John's spouse relationships, then retry.

---

### Scenario 2: Disabling Same-Sex Unions

**Before**:

```json
{
  "allow_same_sex": true
}
```

**Attempt**:

```json
{
  "allow_same_sex": false
}
```

**Result if Alice & Amy are spouses**:

```json
{
  "detail": {
    "errors": [
      "Cannot disable same-sex unions: 1 same-sex spouse relationship(s) exist. Relationships: Alice & Amy"
    ]
  }
}
```

**Fix**: Remove the Alice & Amy relationship, then retry.

---

### Scenario 3: Reducing Max Spouses

**Before**:

```json
{
  "max_spouses_per_member": 5
}
```

**Attempt**:

```json
{
  "max_spouses_per_member": 2
}
```

**Result if King Henry has 4 spouses**:

```json
{
  "detail": {
    "errors": [
      "Cannot reduce max_spouses_per_member to 2: 1 member(s) currently have more spouses (up to 4). Members affected: King Henry"
    ]
  }
}
```

**Fix**: Remove spouses until King Henry has ≤2, then retry.

---

## 🎯 Response Codes

| Code | Meaning     | Action                         |
| ---- | ----------- | ------------------------------ |
| 200  | Success     | Settings applied               |
| 400  | Bad Request | Invalid settings format        |
| 403  | Forbidden   | Not a custodian                |
| 404  | Not Found   | Tree doesn't exist             |
| 409  | Conflict    | Validation failed (see errors) |

---

## 🔍 Preview Endpoint

**Use when**: You want to see what would break before committing.

**Endpoint**: `POST /api/trees/{tree_id}/settings/preview`

**Response**:

```json
{
  "can_apply": false,
  "validation_errors": ["..."],
  "impact": {
    "total_members": 10,
    "warnings": [...]
  },
  "recommendation": "Cannot apply - would violate..."
}
```

**Key Fields**:

- `can_apply` - Boolean: safe to apply?
- `validation_errors` - Array: what's wrong
- `impact.warnings` - Array: detailed violations
- `recommendation` - String: what to do

---

## 💡 Resolution Strategies

### Strategy 1: Cancel Change

Keep current settings, don't modify anything.

### Strategy 2: Fix Data First

1. Identify affected members/relationships from error
2. Remove or modify conflicting relationships
3. Retry settings change

### Strategy 3: Preview First

1. Call preview endpoint
2. Review full impact
3. Decide whether to proceed or cancel

---

## 🛠️ Frontend Integration

### React Hook Example

```typescript
const useTreeSettings = (treeId: string) => {
  const preview = async (settings: TreeSettings) => {
    const res = await fetch(`/api/trees/${treeId}/settings/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include',
    });
    return res.json();
  };

  const apply = async (settings: TreeSettings) => {
    const res = await fetch(`/api/trees/${treeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
      credentials: 'include',
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail.message);
    }

    return res.json();
  };

  return { preview, apply };
};
```

### Usage in Component

```typescript
const { preview, apply } = useTreeSettings(treeId);

const handleChange = async (newSettings) => {
  // Preview first
  const result = await preview(newSettings);

  if (!result.can_apply) {
    // Show warnings
    setErrors(result.validation_errors);
    return;
  }

  // Safe to apply
  await apply(newSettings);
};
```

---

## 📁 File Locations

| File                               | Purpose               |
| ---------------------------------- | --------------------- |
| `utils/tree_validation.py`         | Core validation logic |
| `api/trees.py`                     | API endpoints         |
| `docs/TREE_SETTINGS_VALIDATION.md` | Full documentation    |
| `docs/VALIDATION_FLOW_DIAGRAMS.md` | Visual diagrams       |
| `test_tree_validation.py`          | Test suite            |

---

## 🧪 Testing Checklist

- [ ] Run unit tests: `python test_tree_validation.py`
- [ ] Test empty tree (should allow any change)
- [ ] Test monogamy with polygamous members
- [ ] Test same-sex with gay/lesbian couples
- [ ] Test single parent with orphans
- [ ] Test multi-parent with >2 parents
- [ ] Test max spouse reduction
- [ ] Test max parent reduction
- [ ] Test preview endpoint
- [ ] Test 409 error format
- [ ] Verify detailed error messages

---

## 🐛 Debugging Tips

### Problem: Validation passes but shouldn't

**Check**:

- Are relationships properly stored in database?
- Is tree_id correct?
- Are relationship types correct ('spouse', 'parent-child')?

### Problem: Validation fails but should pass

**Check**:

- Are member genders set correctly?
- Count relationships manually in database
- Check for orphaned relationships

### Problem: Errors not detailed enough

**Check**:

- Look at `impact.warnings` in response
- Use preview endpoint for more details
- Check logs for validation details

---

## 📚 Additional Resources

- **Full Docs**: `docs/TREE_SETTINGS_VALIDATION.md`
- **Flow Diagrams**: `docs/VALIDATION_FLOW_DIAGRAMS.md`
- **Task Tracking**: `family_tree_tasks.md` (Section 2.5.1)
- **Tests**: `test_tree_validation.py`
- **API**: `api/trees.py` (PATCH and preview endpoints)

---

## ⚡ Performance Notes

- Validation queries use indexed columns
- Efficient counting without loading full objects
- Preview endpoint is safe to call repeatedly
- No performance impact on tree creation
- Validation only runs on settings updates

---

## 🎓 Key Takeaways

1. **Always preview** before applying significant changes
2. **Read error messages** - they tell you exactly what's wrong
3. **Fix data first** - remove conflicts before changing settings
4. **Empty trees** are safe to modify anytime
5. **Validation protects** your data integrity

---

**Last Updated**: October 1, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
