import { Member, MemberInput, MemberId, Tree } from './types';

function makeId(prefix = 'm') {
  // simple unique id generator
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 100000).toString(36)}`;
}

export class FamilyTreeCore {
  tree: Tree;
  private members: Map<MemberId, Member>;

  constructor(tree: Tree, members?: Member[]) {
    this.tree = tree;
    this.members = new Map();
    (members || []).forEach((m) => this.members.set(m.id, deepClone(m)));
  }

  addMember(input: MemberInput): Member {
    const id = makeId('m');
    const member: Member = {
      id,
      name: input.name,
      email: input.email,
      dob: input.dob,
      gender: input.gender ?? 'unspecified',
      deceased: input.deceased ?? false,
      notes: input.notes,
      spouseIds: [],
      parentIds: [],
      childIds: [],
    };
    this.members.set(id, deepClone(member));
    return deepClone(member);
  }

  getMember(id: MemberId): Member | undefined {
    const m = this.members.get(id);
    return m ? deepClone(m) : undefined;
  }

  updateMember(id: MemberId, updates: Partial<MemberInput>): Member {
    const m = this.members.get(id);
    if (!m) throw new Error('Member not found');
    Object.assign(m, updates);
    this.members.set(id, m);
    return deepClone(m);
  }

  removeMember(id: MemberId): void {
    const m = this.members.get(id);
    if (!m) return;
    // remove relationships
    m.spouseIds.forEach((sid) => {
      const s = this.members.get(sid);
      if (s) s.spouseIds = s.spouseIds.filter((x) => x !== id);
    });
    m.parentIds.forEach((pid) => {
      const p = this.members.get(pid);
      if (p) p.childIds = p.childIds.filter((x) => x !== id);
    });
    m.childIds.forEach((cid) => {
      const c = this.members.get(cid);
      if (c) c.parentIds = c.parentIds.filter((x) => x !== id);
    });
    this.members.delete(id);
  }

  findMemberByName(name: string): Member | undefined {
    const needle = name.trim().toLowerCase();
    for (const m of this.members.values()) {
      if (m.name && m.name.toLowerCase() === needle) return deepClone(m);
    }
    return undefined;
  }

  listMembers(): Member[] {
    return Array.from(this.members.values()).map(deepClone);
  }

  addSpouse(memberId: MemberId, spouseInput: MemberInput): Member {
    const member = this.members.get(memberId);
    if (!member) throw new Error('member not found');

    // monogamy enforcement
    const settings = this.tree.settings;
    if (settings.monogamy && !settings.allowPolygamy) {
      if (member.spouseIds.length > 0) {
        throw new Error('Monogamy enforced: member already has a spouse');
      }
    }

    // create spouse
    const spouse = this.addMember(spouseInput);
    // update internal maps (addMember already added a copy)
    const spouseObj = this.members.get(spouse.id)!;
    const memberObj = this.members.get(memberId)!;
    if (!memberObj.spouseIds.includes(spouse.id)) memberObj.spouseIds.push(spouse.id);
    if (!spouseObj.spouseIds.includes(memberId)) spouseObj.spouseIds.push(memberId);
    this.members.set(memberId, memberObj);
    this.members.set(spouse.id, spouseObj);
    return deepClone(spouseObj);
  }

  removeSpouse(memberId: MemberId, spouseId: MemberId): void {
    const member = this.members.get(memberId);
    const spouse = this.members.get(spouseId);
    if (!member || !spouse) return;
    member.spouseIds = member.spouseIds.filter((s) => s !== spouseId);
    spouse.spouseIds = spouse.spouseIds.filter((s) => s !== memberId);
    this.members.set(memberId, member);
    this.members.set(spouseId, spouse);
  }

  addChild(parentId: MemberId, childInput: MemberInput, secondParentId?: MemberId): Member {
    const parent = this.members.get(parentId);
    if (!parent) throw new Error('parent not found');
    const settings = this.tree.settings;
    if (secondParentId && !this.members.has(secondParentId)) throw new Error('second parent not found');

    if (!secondParentId && !settings.allowSingleParent) {
      throw new Error('Single-parent children not allowed by tree settings');
    }

    const child = this.addMember(childInput);
    const childObj = this.members.get(child.id)!;
    // add parent-child links
    childObj.parentIds.push(parentId);
    parent.childIds.push(child.id);
    this.members.set(child.id, childObj);
    this.members.set(parentId, parent);

    if (secondParentId) {
      const second = this.members.get(secondParentId)!;
      childObj.parentIds.push(secondParentId);
      second.childIds.push(child.id);
      this.members.set(child.id, childObj);
      this.members.set(secondParentId, second);
    }
    return deepClone(childObj);
  }

  removeChild(parentId: MemberId, childId: MemberId): void {
    const parent = this.members.get(parentId);
    const child = this.members.get(childId);
    if (!parent || !child) return;
    parent.childIds = parent.childIds.filter((c) => c !== childId);
    child.parentIds = child.parentIds.filter((p) => p !== parentId);
    this.members.set(parentId, parent);
    this.members.set(childId, child);
  }

  findPath(fromId: MemberId, toId: MemberId): MemberId[] {
    // BFS on undirected graph composed of spouse and parent-child edges
    if (fromId === toId) return [fromId];
    const q: MemberId[] = [fromId];
    const prev = new Map<MemberId, MemberId | null>();
    prev.set(fromId, null);
    while (q.length) {
      const cur = q.shift()!;
      const curNode = this.members.get(cur);
      if (!curNode) continue;
      const neighbors = new Set<MemberId>([...curNode.spouseIds, ...curNode.parentIds, ...curNode.childIds]);
      for (const n of neighbors) {
        if (prev.has(n)) continue;
        prev.set(n, cur);
        if (n === toId) {
          // reconstruct path
          const path: MemberId[] = [toId];
          let p: MemberId | null = cur;
          while (p) {
            path.unshift(p);
            p = prev.get(p) ?? null;
          }
          return path;
        }
        q.push(n);
      }
    }
    return [];
  }

  computeRelationship(a: MemberId, b: MemberId): string {
    if (!this.members.has(a) || !this.members.has(b)) return 'unknown';
    const path = this.findPath(a, b);
    if (path.length === 0) return 'unrelated';
    // direct relations
    if (path.length === 2) {
      const [x, y] = path;
      const ma = this.members.get(a)!;
      if (ma.spouseIds.includes(b)) return 'spouse';
      if (ma.parentIds.includes(b)) return 'parent';
      if (ma.childIds.includes(b)) return 'child';
      return 'related';
    }
    // fallback: return path length
    return `${path.length - 1} steps`;
  }

  listRelations(memberId: MemberId, type: string): MemberId[] {
    const m = this.members.get(memberId);
    if (!m) return [];
    switch (type) {
      case 'spouse':
        return Array.from(m.spouseIds);
      case 'parent':
        return Array.from(m.parentIds);
      case 'child':
        return Array.from(m.childIds);
      default:
        return [];
    }
  }

  serialize(): { tree: Tree; members: Member[] } {
    return { tree: deepClone(this.tree), members: this.listMembers() };
  }

  static fromSerialized(payload: { tree: Tree; members: Member[] }): FamilyTreeCore {
    return new FamilyTreeCore(deepClone(payload.tree), deepClone(payload.members));
  }
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
