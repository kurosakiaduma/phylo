import { Member, MemberId, MemberInput, Tree } from './types';
export declare class FamilyTreeCore {
    private members;
    private tree;
    constructor(tree: Tree, members?: Member[]);
    addMember(input: MemberInput): Member;
    getMember(id: MemberId): Member | undefined;
    updateMember(id: MemberId, updates: Partial<MemberInput>): Member;
    removeMember(id: MemberId): void;
    findMemberByName(name: string): Member | undefined;
    listMembers(): Member[];
    addSpouse(memberId: MemberId, spouseInput: MemberInput): Member;
    removeSpouse(memberId: MemberId, spouseId: MemberId): void;
    addChild(parentId: MemberId, childInput: MemberInput, secondParentId?: MemberId): Member;
    removeChild(parentId: MemberId, childId: MemberId): void;
    computeRelationship(aId: MemberId, bId: MemberId): string;
    listRelations(memberId: MemberId, type: string): MemberId[];
    findPath(fromId: MemberId, toId: MemberId): MemberId[];
    validate(): {
        errors: string[];
        warnings: string[];
    };
    serialize(): {
        tree: Tree;
        members: Member[];
    };
    private _getAncestorsAndDistance;
    static fromSerialized(payload: {
        tree: Tree;
        members: Member[];
    }): FamilyTreeCore;
}
//# sourceMappingURL=FamilyTreeCore.d.ts.map