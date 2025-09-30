import { FamilyTreeCore } from '../src/FamilyTreeCore';
import { Tree } from '../src/types';

const baseTree: Tree = {
  id: 't_1',
  name: 'Test Tree',
  settings: {
    allowSameSex: true,
    monogamy: true,
    allowPolygamy: false,
    allowSingleParent: true,
    allowMultiParentChildren: false,
  },
};

describe('FamilyTreeCore basic operations', () => {
  it('can add and find a member by name', () => {
    const core = new FamilyTreeCore(baseTree);
    const m = core.addMember({ name: 'Alice' });
    expect(core.findMemberByName('alice')?.id).toBe(m.id);
  });

  it('enforces monogamy by default', () => {
    const core = new FamilyTreeCore(baseTree);
    const a = core.addMember({ name: 'A' });
    const s1 = core.addSpouse(a.id, { name: 'S1' });
    expect(core.getMember(a.id)?.spouseIds).toContain(s1.id);
    // adding another spouse should throw because monogamy=true and allowPolygamy=false
    expect(() => core.addSpouse(a.id, { name: 'S2' })).toThrow();
  });

  it('can add a child with a single parent when allowed', () => {
    const core = new FamilyTreeCore(baseTree);
    const p = core.addMember({ name: 'Parent' });
    const c = core.addChild(p.id, { name: 'Child' });
    expect(core.getMember(c.id)?.parentIds).toContain(p.id);
    expect(core.getMember(p.id)?.childIds).toContain(c.id);
  });

  it('serializes and restores a tree', () => {
    const core = new FamilyTreeCore(baseTree);
    const a = core.addMember({ name: 'X' });
    const s = core.addSpouse(a.id, { name: 'Y' });
    const serialized = core.serialize();
    const restored = FamilyTreeCore.fromSerialized(serialized);
    expect(restored.findMemberByName('x')?.name).toBe('X');
    expect(restored.findMemberByName('y')?.name).toBe('Y');
  });
});
