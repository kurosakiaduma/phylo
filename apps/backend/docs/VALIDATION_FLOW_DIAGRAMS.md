# Tree Settings Validation - Visual Flow

## Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend UI                           │
│  (Settings Form with Preview Button)                         │
└────────────────┬─────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ PATCH Update │  │ POST Preview     │
│ /trees/{id}  │  │ /settings/preview│
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └───────────┬───────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │  Tree Validation Module      │
    │  validate_settings_change()  │
    └──────────────┬───────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐       ┌────────────────┐
│ Database    │       │  Validation    │
│ Queries     │       │  Rules Engine  │
└─────┬───────┘       └────────┬───────┘
      │                        │
      │  Get Members           │
      │  Get Relationships     │
      │                        │
      └───────────┬────────────┘
                  │
          ┌───────┴────────┐
          │                │
    ✅ Valid          ❌ Invalid
          │                │
          ▼                ▼
  ┌──────────────┐  ┌─────────────────┐
  │ Apply Update │  │ Return 409      │
  │ 200 OK       │  │ + Error Details │
  └──────────────┘  └─────────────────┘
```

---

## Validation Decision Tree

```
Settings Change Request
         │
         ▼
   ┌─────────────┐
   │ Is monogamy │
   │  changing?  │
   └──┬────────┬─┘
      │YES     │NO
      ▼        └──────┐
┌──────────────┐      │
│Check members │      │
│with multiple │      │
│spouses       │      │
└──┬────────┬──┘      │
   │        │         │
 >1     =0,1         │
   │        └─────────┤
   ▼                 │
BLOCK               │
(409)               │
                    │
                    ▼
              ┌──────────────┐
              │Is same-sex   │
              │ changing?    │
              └──┬────────┬──┘
                 │YES     │NO
                 ▼        └──────┐
           ┌──────────────┐      │
           │Check same-sex│      │
           │couples       │      │
           └──┬────────┬──┘      │
              │        │         │
            >0      =0          │
              │        └─────────┤
              ▼                 │
            BLOCK              │
            (409)              │
                               │
                               ▼
                         ┌──────────────┐
                         │Is max spouses│
                         │ changing?    │
                         └──┬────────┬──┘
                            │YES     │NO
                            ▼        └──────┐
                      ┌──────────────┐      │
                      │Check member  │      │
                      │spouse counts │      │
                      └──┬────────┬──┘      │
                         │        │         │
                       >max    <=max       │
                         │        └─────────┤
                         ▼                 │
                       BLOCK              │
                       (409)              │
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │All checks    │
                                    │passed?       │
                                    └──┬────────┬──┘
                                       │YES     │NO
                                       ▼        ▼
                                    ALLOW    BLOCK
                                    (200)    (409)
```

---

## Monogamy Validation Flow

```
Enable Monogamy Request
         │
         ▼
┌─────────────────────┐
│ Query: Get all      │
│ spouse relationships│
│ in tree             │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ Group by member_id  │
│ Count spouses       │
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  Count=1   Count>1
    │           │
    │           ▼
    │    ┌──────────────┐
    │    │ Get member   │
    │    │ names        │
    │    └──────┬───────┘
    │           │
    │           ▼
    │    ┌──────────────────┐
    │    │ Add to violations│
    │    │ list             │
    │    └──────┬───────────┘
    │           │
    └───────┬───┘
            │
            ▼
      ┌──────────────┐
      │ Violations   │
      │ list empty?  │
      └──┬────────┬──┘
         │YES     │NO
         ▼        ▼
      ALLOW    BLOCK
      (200)    (409)
               + violation
                 details
```

---

## Example Violation Response

```
User: Enable monogamy
  │
  ├─ John Smith has 2 spouses ❌
  ├─ Jane Doe has 3 spouses ❌
  │
  └─ Response:
      {
        "detail": {
          "message": "Settings change would violate existing relationships",
          "errors": [
            "Cannot enable monogamy: 2 member(s) have multiple spouses.",
            "Members affected: John Smith, Jane Doe"
          ],
          "impact": {
            "warnings": [
              {
                "type": "monogamy_violation",
                "count": 2,
                "members": ["John Smith", "Jane Doe"]
              }
            ]
          }
        }
      }
```

---

## Resolution Workflow

```
User encounters validation error
         │
         ▼
┌─────────────────────┐
│ View Error Details  │
│ • Affected members  │
│ • Relationship count│
└─────────┬───────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
Option A:    Option B:
Keep        Fix Data
Settings    First
    │           │
    │           ▼
    │    ┌─────────────────┐
    │    │ Remove extra    │
    │    │ relationships   │
    │    └─────────┬───────┘
    │              │
    │              ▼
    │       ┌──────────────┐
    │       │ Retry update │
    │       └──────┬───────┘
    │              │
    │              ▼
    │         ✅ Success
    │
    └─────► ⏸️ No change
```

---

## Preview vs Update Comparison

```
┌──────────────────────────────────────────────────────────┐
│                    PREVIEW ENDPOINT                       │
│            POST /trees/{id}/settings/preview              │
├──────────────────────────────────────────────────────────┤
│ 1. Analyze current state                                 │
│ 2. Check proposed changes                                │
│ 3. Find all violations                                   │
│ 4. Return detailed report                                │
│ 5. ❌ DO NOT apply changes                               │
│ 6. ✅ Safe to call repeatedly                            │
└──────────────────────────────────────────────────────────┘
                           vs
┌──────────────────────────────────────────────────────────┐
│                     UPDATE ENDPOINT                       │
│                PATCH /trees/{id}                          │
├──────────────────────────────────────────────────────────┤
│ 1. Analyze current state                                 │
│ 2. Check proposed changes                                │
│ 3. Find violations                                       │
│ 4. IF violations: Return 409 ❌                          │
│ 5. IF valid: Apply changes ✅                            │
│ 6. Commit to database                                    │
└──────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌──────────┐      ┌──────────┐      ┌──────────────┐
│  User    │──1──▶│ Frontend │──2──▶│   Backend    │
│          │      │   UI     │      │   API        │
└──────────┘      └──────────┘      └──────┬───────┘
                                           │
                                           │ 3. Validate
                                           ▼
                                    ┌─────────────┐
                                    │ Validation  │
                                    │   Module    │
                                    └──────┬──────┘
                                           │
                                           │ 4. Query
                                           ▼
                                    ┌─────────────┐
                                    │  Database   │
                                    │  • Members  │
                                    │  • Relations│
                                    └──────┬──────┘
                                           │
                                           │ 5. Results
                                           ▼
                                    ┌─────────────┐
                                    │  Analysis   │
                                    │  • Count    │
                                    │  • Compare  │
                                    │  • Report   │
                                    └──────┬──────┘
                                           │
                              ┌────────────┴─────────────┐
                              │                          │
                              ▼                          ▼
                       ┌──────────────┐         ┌──────────────┐
                       │   Valid      │         │   Invalid    │
                       │  • Apply     │         │  • Return    │
                       │  • Commit    │         │    409       │
                       │  • Return    │         │  • Detailed  │
                       │    200       │         │    errors    │
                       └──────┬───────┘         └──────┬───────┘
                              │                        │
                              │ 6. Response            │
                              └────────────┬───────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  Frontend   │
                                    │  • Success  │
                                    │  • Errors   │
                                    └──────┬──────┘
                                           │
                                           │ 7. Display
                                           ▼
                                    ┌─────────────┐
                                    │    User     │
                                    │  Feedback   │
                                    └─────────────┘
```

---

## Validation Checks Overview

```
╔═══════════════════════════════════════════════════════════╗
║               VALIDATION CHECKS MATRIX                    ║
╠═══════════════════════════════════════════════════════════╣
║ Setting Change          │ Check Performed                 ║
╠═════════════════════════╪═════════════════════════════════╣
║ Enable Monogamy         │ Count spouses per member        ║
║                         │ Block if any member has >1      ║
╠═════════════════════════╪═════════════════════════════════╣
║ Disable Same-Sex        │ Check gender of spouse pairs    ║
║                         │ Block if any same-sex couples   ║
╠═════════════════════════╪═════════════════════════════════╣
║ Disable Single Parent   │ Count parents per child         ║
║                         │ Block if any child has 1 parent ║
╠═════════════════════════╪═════════════════════════════════╣
║ Disable Multi-Parent    │ Count parents per child         ║
║                         │ Block if any child has >2       ║
╠═════════════════════════╪═════════════════════════════════╣
║ Reduce Max Spouses      │ Find member with most spouses   ║
║                         │ Block if exceeds new limit      ║
╠═════════════════════════╪═════════════════════════════════╣
║ Reduce Max Parents      │ Find child with most parents    ║
║                         │ Block if exceeds new limit      ║
╚═════════════════════════╧═════════════════════════════════╝
```

This visual documentation provides clear diagrams of:

- Overall system architecture
- Decision trees for validation
- Specific validation flows
- Error response structures
- Resolution workflows
- Data flow diagrams
- Validation check matrix
