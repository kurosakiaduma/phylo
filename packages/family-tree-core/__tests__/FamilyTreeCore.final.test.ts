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

describe('Validation and Final Coverage', () => {
  it('detects circular dependencies in validation', () => {
    const core = new FamilyTreeCore(baseTree);
    const a = core.addMember({ name: 'A' });
    const b = core.addChild(a.id, { name: 'B' });

    // Manually create a circular dependency for testing
    const memberA = core.getMember(a.id)!;
    memberA.parentIds.push(b.id);
    core.updateMember(a.id, memberA);

    const { errors } = core.validate();
    expect(errors).toContain(`[Circular] Member ${b.id} is an ancestor of their own parent ${a.id}`);
  });

  it('returns Unknown for non-related members', () => {
    const core = new FamilyTreeCore(baseTree);
    const a = core.addMember({ name: 'A' });
    const b = core.addMember({ name: 'B' });
    expect(core.computeRelationship(a.id, b.id)).toBe('Unknown');
  });

  it('handles self relationship in computeRelationship', () => {
    const core = new FamilyTreeCore(baseTree);
    const a = core.addMember({ name: 'A' });
    expect(core.computeRelationship(a.id, a.id)).toBe('Self');
  });

  it('handles max spouses constraint', () => {
    const tree: Tree = { ...baseTree, settings: { ...baseTree.settings, monogamy: false, allowPolygamy: true, maxSpousesPerMember: 1 } };
    const core = new FamilyTreeCore(tree);
    const a = core.addMember({ name: 'A' });
    core.addSpouse(a.id, { name: 'S1' });
    expect(() => core.addSpouse(a.id, { name: 'S2' })).toThrow('has reached the maximum number of spouses');
  });

  it('handles single parent constraint', () => {
    const tree: Tree = { ...baseTree, settings: { ...baseTree.settings, allowSingleParent: false } };
    const core = new FamilyTreeCore(tree);
    const p1 = core.addMember({ name: 'P1' });
    expect(() => core.addChild(p1.id, { name: 'C1' })).toThrow('Single parent children are not allowed');
  });
});
