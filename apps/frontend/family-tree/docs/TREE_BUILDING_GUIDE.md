# Family Tree Building - Visual Flow

## 🌳 Tree Building Philosophy

The custodian starts as the **center point** of the family tree and builds in all directions:

```
                    Grandparent ─── Grandparent
                          │              │
                          └──────┬───────┘
                    ┌─────────┴─────────┐
                    │                   │
                 Parent ─── Spouse   Parent ─── Spouse
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
                 Sibling  CUSTODIAN  Sibling
                             │
                    ┌────────┴────────┐
                    │                 │
             Custodian ─── Spouse     │
                    │                 │
                    └────────┬────────┘
                             │
                    ┌────────┼────────┐
                    │        │        │
                  Child   Child    Child
```

## 📍 Starting Point: The Custodian

When a custodian creates a tree, they should **add themselves first**:

```
Step 1: Empty Tree
┌─────────────────────────────────┐
│                                 │
│   "Add yourself as first member"│
│                                 │
│         [Add Yourself] →        │
│                                 │
└─────────────────────────────────┘

Step 2: Custodian Added
┌─────────────────────────────────┐
│                                 │
│          ┌─────────┐            │
│          │ YOU     │            │
│          │ John    │            │
│          └─────────┘            │
│                                 │
└─────────────────────────────────┘
```

## ⬆️ Building Upwards: Adding Parents

Click on yourself → Click "Add Parent"

```
Before:                After:
                       ┌─────────┐
                       │ Dad     │
                       └────┬────┘
                            │
┌─────────┐            ┌────┴────┐
│ YOU     │     →      │ YOU     │
│ John    │            │ John    │
└─────────┘            └─────────┘

Then add mother:
┌─────────┐   ┌─────────┐
│ Dad     │━━━│ Mom     │
└────┬────┘   └────┬────┘
     └─────────────┘
           │
     ┌─────┴─────┐
     │ YOU       │
     │ John      │
     └───────────┘
```

## ⬇️ Building Downwards: Adding Children

Click on yourself → Click "Add Child"

```
Before:                After:
┌─────────┐            ┌─────────┐
│ YOU     │            │ YOU     │
│ John    │     →      │ John    │
└─────────┘            └────┬────┘
                            │
                       ┌────┴────┐
                       │ Child   │
                       │ Alice   │
                       └─────────┘
```

## ↔️ Building Sideways: Adding Spouse

Click on yourself → Click "Add Spouse"

```
Before:                After:
┌─────────┐            ┌─────────┐ ♥ ┌─────────┐
│ YOU     │            │ YOU     │━━━│ Spouse  │
│ John    │     →      │ John    │   │ Jane    │
└─────────┘            └─────────┘   └─────────┘
```

## 🔄 Building Sideways: Adding Siblings

Click on yourself → Click "Add Parent" → Select "Sibling"

```
Before:                After:
┌─────────┐            ┌─────────┐
│ Dad     │            │ Dad     │
└────┬────┘            └────┬────┘
     │                      │
┌────┴────┐           ┌─────┴─────┐
│ YOU     │    →      │  │  │  │  │
│ John    │           │  │  │  │  │
└─────────┘           └──┼──┼──┼──┘
                         │  │  │
                    ┌────┴──┼──┴────┐
                    │       │       │
              ┌─────┴──┐ ┌──┴────┐ ┌┴──────┐
              │ Sibling│ │ YOU   │ │Sibling│
              │ Sarah  │ │ John  │ │ Mike  │
              └────────┘ └───────┘ └───────┘
```

## 🎯 Complete Family Tree Example

Building a 3-generation tree starting from custodian:

```
Generation 0 (Grandparents):
┌──────────┐ ♥ ┌──────────┐     ┌──────────┐ ♥ ┌──────────┐
│Grandpa A │━━━│Grandma A │     │Grandpa B │━━━│Grandma B │
└─────┬────┘   └────┬─────┘     └────┬─────┘   └────┬─────┘
      └─────────────┘                 └──────────────┘
             │                                │

Generation 1 (Parents):
      ┌──────┴──────┐                 ┌──────┴──────┐
      │             │                 │             │
┌─────┴────┐  ┌────┴─────┐     ┌─────┴────┐  ┌────┴─────┐
│ Uncle    │  │ Dad      │━━━♥━│ Mom      │  │ Aunt     │
└──────────┘  └────┬─────┘     └────┬─────┘  └──────────┘
                   └──────────────────┘
                           │

Generation 2 (Custodian + Siblings):
                    ┌──────┴──────┐
                    │      │      │
              ┌─────┴──┐ ┌─┴────┐ ┌┴──────┐
              │ Sister │ │ YOU  │ │Brother│
              └────────┘ │ John │ └───────┘
                         └──┬───┘
                            │━━━♥━━━┐
                         ┌──┴───┐   │
                         │Spouse│   │
                         │ Jane │◄──┘
                         └──┬───┘
                            │

Generation 3 (Children):
                     ┌──────┴──────┐
                     │      │      │
               ┌─────┴──┐ ┌─┴────┐ ┌┴──────┐
               │ Child  │ │Child │ │ Child │
               │ Alice  │ │ Bob  │ │Charlie│
               └────────┘ └──────┘ └───────┘
```

## 🔄 Interaction Flow

### From Empty Tree

```
┌─────────────────────────────────────────────┐
│ 1. View Empty Tree                          │
│    ↓                                        │
│ 2. Click "Add Yourself"                     │
│    ↓                                        │
│ 3. Fill Form (Name: John, Gender: Male)    │
│    ↓                                        │
│ 4. Submit → John appears as root node       │
└─────────────────────────────────────────────┘
```

### From Existing Member

```
┌─────────────────────────────────────────────┐
│ 1. Click on Member Card (John)              │
│    ↓                                        │
│ 2. Drawer Opens with Details                │
│    ↓                                        │
│ 3. Click Action Button:                     │
│    • "Add Parent" → Add parent              │
│    • "Add Spouse" → Add spouse              │
│    • "Add Child" → Add child                │
│    ↓                                        │
│ 4. Dialog Opens with Relationship Context   │
│    ↓                                        │
│ 5. Fill Form + Submit                       │
│    ↓                                        │
│ 6. Member Created + Relationship Linked     │
│    ↓                                        │
│ 7. Canvas Updates Automatically             │
└─────────────────────────────────────────────┘
```

### Quick Add (Floating Button)

```
┌─────────────────────────────────────────────┐
│ 1. Click Floating "Add Member" Button       │
│    ↓                                        │
│ 2. Dialog Opens (No Relationship Context)   │
│    ↓                                        │
│ 3. Fill Form                                │
│    ↓                                        │
│ 4. Submit → Member Added (No Links)         │
│    ↓                                        │
│ 5. Manually Create Relationships Later      │
└─────────────────────────────────────────────┘
```

## 🎨 Visual Indicators

### Card States

```
Normal Card:          Selected Card:        Highlighted Card:
┌─────────┐          ┌─────────┐          ┌─────────┐
│  Avatar │          │  Avatar │          │  Avatar │
│  Name   │          │  Name   │          │  Name   │
└─────────┘          └─────────┘          └─────────┘
                     (Blue Ring)          (Yellow Ring)

Deceased:            Couple Card:
┌─────────┐          ┌───────────────────────┐
│  Avatar │          │ ┌─────┐ ♥ ┌─────┐   │
│  Name̶   │          │ │ Him │━━━│ Her │   │
│ (faded) │          │ └─────┘   └─────┘   │
└─────────┘          └───────────────────────┘
```

### Relationship Lines

```
Parent-Child (Vertical):     Spouse (Horizontal):
     Parent                  Person ━━━♥━━━ Spouse
       │
       ├─── Child 1
       │
       └─── Child 2
```

## 📱 Button Locations

```
┌─────────────────────────────────────────────┐
│ Header: [Add Member] [Settings]   ← Top    │
├─────────────────────────────────────────────┤
│                                             │
│    Tree Canvas                              │
│    ┌─────┐                                  │
│    │ YOU │                                  │
│    └─────┘                                  │
│                                             │
│                                             │
│ [+ Add Member]        ← Bottom Left         │
│ (Floating Button)                           │
└─────────────────────────────────────────────┘

Member Drawer (Right Side):
┌─────────────────────┐
│ John                │
│ ───────────────     │
│ [Edit Member]       │
│ [Add Parent]        │
│ [Add Spouse]        │
│ [Add Child]         │
└─────────────────────┘
```

## 🎯 Best Practices

### Order of Building

1. **Start with yourself** (custodian)
2. **Add immediate family** (parents, siblings, spouse)
3. **Add children** (if any)
4. **Add grandparents** (parent's parents)
5. **Add extended family** (uncles, aunts, cousins)

### Why This Order?

✅ Most information is known about close family  
✅ Easy to verify accuracy  
✅ Natural tree growth pattern  
✅ Immediate visual feedback  
✅ Builds confidence in system

---

**Created**: October 2, 2025  
**Purpose**: User guidance for tree building  
**Audience**: Custodians and contributors
