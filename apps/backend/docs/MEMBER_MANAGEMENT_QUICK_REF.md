# Member Management Quick Reference

**Phase 2.6** - Quick reference for developers implementing member management features.

---

## 🚀 Quick Start

### 1. Start Backend Server

```bash
cd /mnt/win3/work/family_tree/apps/backend
source .venv/bin/activate
uvicorn api.main:app --reload --port 8000
```

### 2. Run Tests

```bash
python test_member_management.py
```

### 3. Check API Docs

```
http://localhost:8000/docs
```

---

## 📡 API Endpoints Cheatsheet

| Method | Endpoint                | Auth      | Description        |
| ------ | ----------------------- | --------- | ------------------ |
| GET    | /api/trees/{id}/members | Any       | List members       |
| GET    | /api/members/{id}       | Any       | Get member details |
| POST   | /api/trees/{id}/members | Custodian | Create member      |
| PATCH  | /api/members/{id}       | Custodian | Update member      |
| DELETE | /api/members/{id}       | Custodian | Delete member      |

---

## 🔑 Authentication

```javascript
// All requests need authentication
fetch('/api/members/123', {
  credentials: 'include', // Include session cookie
});
```

---

## 📄 Pagination Pattern

```javascript
// First page
GET /api/trees/{id}/members?limit=50

// Next page (use last member's ID as cursor)
GET /api/trees/{id}/members?cursor=LAST_ID&limit=50

// Stop when: response.length < limit
```

---

## 🔍 Filtering & Search

```javascript
// Filter by status
?status=alive
?status=deceased

// Search by name (case-insensitive)
?search=John

// Combine
?status=alive&search=Smith&limit=20
```

---

## 💻 Code Snippets

### List Members with Pagination

```javascript
async function getAllMembers(treeId) {
  let cursor = null;
  const allMembers = [];

  while (true) {
    const params = new URLSearchParams({ limit: 50 });
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
      credentials: 'include',
    });
    const members = await response.json();
    allMembers.push(...members);

    if (members.length < 50) break;
    cursor = members[members.length - 1].id;
  }

  return allMembers;
}
```

### Create Member

```javascript
async function createMember(treeId, data) {
  const response = await fetch(`/api/trees/${treeId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      dob: data.dob, // ISO 8601: "1990-01-15"
      gender: data.gender,
      deceased: false,
      notes: data.notes,
    }),
  });

  if (!response.ok) throw new Error('Failed to create member');
  return await response.json();
}
```

### Update Member

```javascript
async function updateMember(memberId, updates) {
  const response = await fetch(`/api/members/${memberId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates), // Only send changed fields
  });

  if (!response.ok) throw new Error('Failed to update member');
  return await response.json();
}
```

### Delete Member

```javascript
async function deleteMember(memberId) {
  const response = await fetch(`/api/members/${memberId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) throw new Error('Failed to delete member');
  // 204 No Content - no response body
}
```

---

## ⚛️ React Query Hooks

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// List members
function useMembers(treeId, options = {}) {
  return useQuery({
    queryKey: ['members', treeId, options],
    queryFn: async () => {
      const params = new URLSearchParams(options);
      const response = await fetch(`/api/trees/${treeId}/members?${params}`, {
        credentials: 'include',
      });
      return response.json();
    },
  });
}

// Create member
function useCreateMember(treeId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/api/trees/${treeId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members', treeId]);
    },
  });
}

// Update member
function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, updates }) => {
      const response = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['member', data.id]);
      queryClient.invalidateQueries(['members', data.tree_id]);
    },
  });
}

// Delete member
function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId) => {
      await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members']);
    },
  });
}
```

---

## 🎨 React Component Example

```jsx
function MemberList({ treeId }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const { data: members, isLoading } = useMembers(treeId, {
    ...(search && { search }),
    ...(status !== 'all' && { status }),
  });

  const createMember = useCreateMember(treeId);
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <input
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All</option>
        <option value="alive">Living</option>
        <option value="deceased">Deceased</option>
      </select>

      <button
        onClick={() =>
          createMember.mutate({
            name: 'New Member',
            email: 'new@example.com',
          })
        }
      >
        Add Member
      </button>

      <ul>
        {members?.map((member) => (
          <li key={member.id}>
            {member.name}
            <button
              onClick={() =>
                updateMember.mutate({
                  memberId: member.id,
                  updates: { deceased: !member.deceased },
                })
              }
            >
              Toggle Status
            </button>
            <button onClick={() => deleteMember.mutate(member.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🔐 Authorization Quick Reference

| Role        | List | Get | Create | Update | Delete |
| ----------- | ---- | --- | ------ | ------ | ------ |
| Viewer      | ✅   | ✅  | ❌     | ❌     | ❌     |
| Contributor | ✅   | ✅  | ❌     | ❌     | ❌     |
| Custodian   | ✅   | ✅  | ✅     | ✅     | ✅     |

---

## ⚠️ Common Errors

### 400 Bad Request

```json
{ "detail": "Invalid status filter. Use 'alive' or 'deceased'" }
```

**Fix:** Use correct status values

### 401 Unauthorized

```json
{ "detail": "Not authenticated" }
```

**Fix:** Include session cookie or Bearer token

### 403 Forbidden

```json
{ "detail": "Requires custodian role or higher" }
```

**Fix:** User needs custodian permissions

### 404 Not Found

```json
{ "detail": "Member not found" }
```

**Fix:** Check member ID exists

---

## 📊 Request/Response Examples

### Create Member Request

```bash
curl -X POST "http://localhost:8000/api/trees/TREE_ID/members" \
  -H "Content-Type: application/json" \
  --cookie "session=TOKEN" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "dob": "1990-05-20",
    "gender": "female",
    "deceased": false,
    "notes": "Family historian"
  }'
```

### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tree_id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "dob": "1990-05-20",
  "gender": "female",
  "deceased": false,
  "notes": "Family historian",
  "created_at": "2025-10-01T12:00:00Z",
  "updated_at": "2025-10-01T12:00:00Z",
  "updated_by": "770e8400-e29b-41d4-a716-446655440002"
}
```

---

## 🧪 Testing

### Run Full Test Suite

```bash
python test_member_management.py
```

### Manual Testing with cURL

```bash
# 1. Login (get OTP)
curl -X POST http://localhost:8000/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Verify OTP (save cookie)
curl -X POST http://localhost:8000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "code": "123456"}'

# 3. Create tree
curl -X POST http://localhost:8000/api/trees \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "Test Tree"}'

# 4. Create member
curl -X POST http://localhost:8000/api/trees/TREE_ID/members \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name": "John Doe"}'

# 5. List members
curl -X GET "http://localhost:8000/api/trees/TREE_ID/members" \
  -b cookies.txt

# 6. Update member
curl -X PATCH http://localhost:8000/api/members/MEMBER_ID \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"deceased": true}'

# 7. Delete member
curl -X DELETE http://localhost:8000/api/members/MEMBER_ID \
  -b cookies.txt
```

---

## 📚 Additional Resources

- **Full Documentation:** `docs/MEMBER_MANAGEMENT.md`
- **Implementation Summary:** `PHASE_2.6_SUMMARY.md`
- **Test Suite:** `test_member_management.py`
- **API Reference:** `http://localhost:8000/docs` (FastAPI auto-generated)

---

## 🐛 Troubleshooting

### Issue: "Not authenticated"

**Solution:** Ensure you're including the session cookie or Bearer token

### Issue: "Tree not found"

**Solution:** Verify the tree ID exists and you have access

### Issue: "Requires custodian role"

**Solution:** Only custodians can create/update/delete members

### Issue: Pagination returns duplicates

**Solution:** Use cursor-based pagination correctly (pass last member's ID)

### Issue: Search returns no results

**Solution:** Search is case-insensitive but requires exact substring match

---

## ✅ Checklist for Frontend Integration

- [ ] Install React Query (`@tanstack/react-query`)
- [ ] Create member management hooks
- [ ] Implement member list component with filters
- [ ] Add create member form
- [ ] Add edit member functionality
- [ ] Add delete confirmation dialog
- [ ] Implement infinite scroll or pagination UI
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test with large datasets (500+ members)

---

**Need Help?** Check the full documentation in `docs/MEMBER_MANAGEMENT.md`
