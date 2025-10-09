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

describe('Advanced Relationship Computation', () => {
  let core: FamilyTreeCore;

  beforeAll(() => {
    core = new FamilyTreeCore(baseTree);
    const grandparent = core.addMember({ name: 'Grandparent' });
    const parentA = core.addChild(grandparent.id, { name: 'Parent A' });
    const parentB = core.addChild(grandparent.id, { name: 'Parent B' });
    const childA = core.addChild(parentA.id, { name: 'Child A' });
    const childB = core.addChild(parentB.id, { name: 'Child B' });
  });

  it('computes aunt/uncle relationships', () => {
    const parentA = core.findMemberByName('Parent A')!;
    const childB = core.findMemberByName('Child B')!;
    expect(core.computeRelationship(parentA.id, childB.id)).toBe('Aunt/Uncle');
  });

  it('computes niece/nephew relationships', () => {
    const childB = core.findMemberByName('Child B')!;
    const parentA = core.findMemberByName('Parent A')!;
    expect(core.computeRelationship(childB.id, parentA.id)).toBe('Niece/Nephew');
  });

  it('computes great-aunt/uncle relationships', () => {
    const grandparent = core.findMemberByName('Grandparent')!;
    const grandUncle = core.addChild(grandparent.id, { name: 'Grand Uncle'});
    const parentA = core.findMemberByName('Parent A')!;
    const childOfParentA = core.addChild(parentA.id, { name: 'Child of Parent A' });
    const greatGrandChild = core.addChild(childOfParentA.id, { name: 'Great Grand Child'});

    expect(core.computeRelationship(greatGrandChild.id, grandUncle.id)).toBe('Great-Niece/Nephew');
  });
});

describe('Error Handling and Edge Cases', () => {
    it('throws when updating a non-existent member', () => {
        const core = new FamilyTreeCore(baseTree);
        expect(() => core.updateMember('non-existent', { name: 'test' })).toThrow();
    });

    it('throws when adding spouse to non-existent member', () => {
        const core = new FamilyTreeCore(baseTree);
        expect(() => core.addSpouse('non-existent', { name: 'test' })).toThrow();
    });

    it('throws when adding child to non-existent parent', () => {
        const core = new FamilyTreeCore(baseTree);
        expect(() => core.addChild('non-existent', { name: 'test' })).toThrow();
    });
});
