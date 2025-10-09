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

const polygamyTree: Tree = {
    id: 't_2',
    name: 'Polygamy Tree',
    settings: {
      allowSameSex: true,
      monogamy: false,
      allowPolygamy: true,
      maxSpousesPerMember: 3,
      allowSingleParent: true,
      allowMultiParentChildren: true,
      maxParentsPerChild: 3,
    },
  };

describe('Member Management (CRUD)', () => {
  let core: FamilyTreeCore;
  beforeEach(() => {
    core = new FamilyTreeCore(baseTree);
  });

  it('adds and gets a member', () => {
    const member = core.addMember({ name: 'Alice' });
    expect(core.getMember(member.id)).toEqual(member);
  });

  it('updates a member', () => {
    const member = core.addMember({ name: 'Alice' });
    core.updateMember(member.id, { name: 'Alicia' });
    expect(core.getMember(member.id)?.name).toBe('Alicia');
  });

  it('removes a member and cleans up relationships', () => {
    const parent = core.addMember({ name: 'Parent' });
    const child = core.addChild(parent.id, { name: 'Child' });
    core.removeMember(parent.id);
    expect(core.getMember(parent.id)).toBeUndefined();
    expect(core.getMember(child.id)?.parentIds).not.toContain(parent.id);
  });

  it('lists all members', () => {
    core.addMember({ name: 'Alice' });
    core.addMember({ name: 'Bob' });
    expect(core.listMembers().length).toBe(2);
  });
});

describe('Relationship Management', () => {
    it('enforces monogamy', () => {
        const core = new FamilyTreeCore(baseTree);
        const member = core.addMember({ name: 'Alice' });
        core.addSpouse(member.id, { name: 'Bob' });
        expect(() => core.addSpouse(member.id, { name: 'Charlie' })).toThrow('is already married');
    });

    it('allows polygamy when enabled', () => {
        const core = new FamilyTreeCore(polygamyTree);
        const member = core.addMember({ name: 'Alice' });
        core.addSpouse(member.id, { name: 'Bob' });
        core.addSpouse(member.id, { name: 'Charlie' });
        expect(core.getMember(member.id)?.spouseIds.length).toBe(2);
    });

    it('removes a spouse', () => {
        const core = new FamilyTreeCore(baseTree);
        const member = core.addMember({ name: 'Alice' });
        const spouse = core.addSpouse(member.id, { name: 'Bob' });
        core.removeSpouse(member.id, spouse.id);
        expect(core.getMember(member.id)?.spouseIds).not.toContain(spouse.id);
        expect(core.getMember(spouse.id)?.spouseIds).not.toContain(member.id);
    });

    it('adds a child with a single parent', () => {
        const core = new FamilyTreeCore(baseTree);
        const parent = core.addMember({ name: 'Parent' });
        const child = core.addChild(parent.id, { name: 'Child' });
        expect(child.parentIds).toContain(parent.id);
        expect(parent.childIds).toContain(child.id);
    });

    it('adds a child with multiple parents when allowed', () => {
        const core = new FamilyTreeCore(polygamyTree);
        const p1 = core.addMember({ name: 'Parent1' });
        const p2 = core.addMember({ name: 'Parent2' });
        const child = core.addChild(p1.id, { name: 'Child' }, p2.id);
        expect(child.parentIds).toEqual(expect.arrayContaining([p1.id, p2.id]));
    });
});

describe('Relationship Computation', () => {
    let core: FamilyTreeCore;
    let p1: any, p2: any, c1: any, c2: any, gc1: any, spouse: any;

    beforeAll(() => {
        core = new FamilyTreeCore(baseTree);
        p1 = core.addMember({ name: 'P1' });
        p2 = core.addMember({ name: 'P2' });
        spouse = core.addSpouse(p1.id, { name: 'Spouse' });
        c1 = core.addChild(p1.id, { name: 'C1' }, p2.id);
        c2 = core.addChild(p1.id, { name: 'C2' }, p2.id);
        gc1 = core.addChild(c1.id, { name: 'GC1' });
    });

    it('computes direct relationships', () => {
        expect(core.computeRelationship(c1.id, p1.id)).toBe('Child');
        expect(core.computeRelationship(p1.id, c1.id)).toBe('Parent');
        expect(core.computeRelationship(p1.id, spouse.id)).toBe('Spouse');
    });

    it('computes siblings', () => {
        expect(core.computeRelationship(c1.id, c2.id)).toBe('Sibling');
    });

    it('computes grandparents and great-grandparents', () => {
        expect(core.computeRelationship(gc1.id, p1.id)).toBe('Grandchild');
        expect(core.computeRelationship(p1.id, gc1.id)).toBe('Grandparent');
    });

    it('computes cousins', () => {
        // Setup: Two siblings (pa, pb) have children (ca, cb respectively).
        // ca and cb should be 1st cousins.
        const core = new FamilyTreeCore(baseTree);
        const gp = core.addMember({ name: 'Grandparent' });
        const pa = core.addChild(gp.id, { name: 'Parent A' });
        const pb = core.addChild(gp.id, { name: 'Parent B' });
        const ca = core.addChild(pa.id, { name: 'Cousin A' });
        const cb = core.addChild(pb.id, { name: 'Cousin B' });
        const cca = core.addChild(ca.id, { name: 'Cousin Child A' });

        expect(core.computeRelationship(ca.id, cb.id)).toBe('1st Cousin');
        expect(core.computeRelationship(cca.id, cb.id)).toBe('1st Cousin, once removed');
    });

    it('computes in-laws', () => {
        const core = new FamilyTreeCore(baseTree);
        const p1 = core.addMember({ name: 'P1' });
        const spouseParent = core.addMember({ name: 'SpouseParent' });
        const spouse = core.addChild(spouseParent.id, { name: 'Spouse' });
        core.addSpouse(p1.id, { name: spouse.name }); // This creates a new spouse with the same name

        // We need to find the actual spouse of p1 to test the in-law relationship
        const p1_reloaded = core.getMember(p1.id)!;
        const actualSpouseId = p1_reloaded.spouseIds[0];
        const actualSpouse = core.getMember(actualSpouseId)!;
        actualSpouse.parentIds.push(spouseParent.id); // Manually create the link for the test
        core.updateMember(actualSpouse.id, actualSpouse);

        expect(core.computeRelationship(p1.id, spouseParent.id)).toBe('Parent-in-law');
    });
});

describe('Serialization and Validation', () => {
    it('serializes and restores a tree', () => {
        const core = new FamilyTreeCore(baseTree);
        const p1 = core.addMember({ name: 'P1' });
        const p2 = core.addMember({ name: 'P2' });
        core.addChild(p1.id, { name: 'C1' }, p2.id);
        const serialized = core.serialize();
        const restored = FamilyTreeCore.fromSerialized(serialized);
        expect(restored.listMembers().length).toBe(3);
        expect(restored.findMemberByName('C1')).toBeDefined();
    });

    it('validates data integrity', () => {
        const core = new FamilyTreeCore(baseTree);
        const member = core.addMember({ name: 'Alice' });
        member.spouseIds.push('non-existent-id');
        core.updateMember(member.id, member);
        const { errors } = core.validate();
        expect(errors).toContain(`[Integrity] Member ${member.id} has non-existent spouse non-existent-id`);
    });
});