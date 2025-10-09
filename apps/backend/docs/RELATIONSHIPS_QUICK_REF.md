# Relationship API Quick Reference

## Endpoints

### Add Spouse

```bash
POST /api/members/{id}/spouse?spouse_id={spouse_id}
Authorization: Custodian
```

### Remove Spouse

```bash
DELETE /api/members/{id}/spouse/{spouseId}
Authorization: Custodian
```

### Add Child

```bash
POST /api/members/{id}/children?child_id={child_id}&second_parent_id={optional}
Authorization: Custodian
```

### Remove Child

```bash
DELETE /api/members/{id}/children/{childId}
Authorization: Custodian
```

### Compute Relationship

```bash
GET /api/relations/{treeId}/between?from={from_id}&to={to_id}
Authorization: Any role
```

---

## Validation Rules

### Spouse

- ✅ Monogamy check (if enabled)
- ✅ Max spouses limit (if set)
- ✅ Same-sex validation (if restricted)
- ✅ No duplicates, no self-relationships

### Parent-Child

- ✅ Single-parent check (if restricted)
- ✅ Multi-parent check (>2 parents)
- ✅ Max parents limit (if set)
- ✅ No circular relationships
- ✅ No duplicates, no self-relationships

---

## Relationship Types

### Direct

- spouse
- parent
- child

### Siblings

- sibling (full)
- sibling (half)

### Extended

- grandparent / grandchild
- great-grandparent / great-grandchild
- aunt/uncle
- niece/nephew

### Cousins

- 1st cousin
- 2nd cousin
- etc.

### In-laws

- parent-in-law
- sibling-in-law
- step-child

---

## Error Codes

| Code | Meaning                  |
| ---- | ------------------------ |
| 201  | Created successfully     |
| 204  | Deleted successfully     |
| 400  | Validation failed        |
| 403  | Insufficient permissions |
| 404  | Not found                |
| 409  | Already exists           |

---

## Common Errors

**Monogamy**: "Monogamy enabled: {name} already has a spouse"

**Max Spouses**: "{name} has reached max spouses limit (N)"

**Same-Sex**: "Same-sex relationships are not allowed in this tree"

**Single Parent**: "Single-parent children are not allowed. Specify second parent."

**Circular**: "Cannot create circular parent-child relationship"

**Duplicate**: "Relationship already exists"

---

## Quick Examples

### Add Monogamous Spouse

```bash
curl -X POST "http://localhost:8000/api/members/alice_id/spouse?spouse_id=bob_id" \
  -H "Authorization: Bearer $TOKEN"
```

### Add Child with Two Parents

```bash
curl -X POST "http://localhost:8000/api/members/alice_id/children?child_id=charlie_id&second_parent_id=bob_id" \
  -H "Authorization: Bearer $TOKEN"
```

### Find Relationship

```bash
curl -X GET "http://localhost:8000/api/relations/tree_id/between?from=alice_id&to=bob_id" \
  -H "Authorization: Bearer $TOKEN"
```

### Remove Relationship

```bash
curl -X DELETE "http://localhost:8000/api/members/alice_id/spouse/bob_id" \
  -H "Authorization: Bearer $TOKEN"
```

---

## React Hooks

```typescript
// Add spouse
const addSpouse = useAddSpouse(memberId);
addSpouse.mutate(spouseId);

// Add child
const addChild = useAddChild(parentId);
addChild.mutate({ childId, secondParentId });

// Compute relationship
const { data } = useComputeRelationship(treeId, fromId, toId);

// Remove spouse
const removeSpouse = useRemoveSpouse(memberId);
removeSpouse.mutate(spouseId);
```

---

## Testing

```bash
cd apps/backend
python test_relationships.py
```

Tests: 7 scenarios covering all endpoints and validations

---

_Phase 2.7 Complete ✅_
