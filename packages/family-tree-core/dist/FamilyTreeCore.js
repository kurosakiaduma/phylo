"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FamilyTreeCore = void 0;
const crypto_1 = require("crypto");
class FamilyTreeCore {
    constructor(tree, members = []) {
        this.members = new Map();
        this.tree = tree;
        members.forEach((member) => this.members.set(member.id, member));
    }
    // --- Member Management ---
    addMember(input) {
        const id = (0, crypto_1.randomUUID)();
        const newMember = {
            ...input,
            id,
            spouseIds: [],
            parentIds: [],
            childIds: [],
        };
        this.members.set(id, newMember);
        return newMember;
    }
    getMember(id) {
        return this.members.get(id);
    }
    updateMember(id, updates) {
        const member = this.getMember(id);
        if (!member) {
            throw new Error(`Member with id ${id} not found`);
        }
        const updatedMember = { ...member, ...updates };
        this.members.set(id, updatedMember);
        return updatedMember;
    }
    removeMember(id) {
        const memberToRemove = this.getMember(id);
        if (!memberToRemove) {
            return; // or throw? For now, idempotent
        }
        // Remove from spouse's spouseIds
        memberToRemove.spouseIds.forEach((spouseId) => {
            const spouse = this.getMember(spouseId);
            if (spouse) {
                spouse.spouseIds = spouse.spouseIds.filter((sid) => sid !== id);
            }
        });
        // Remove from children's parentIds
        memberToRemove.childIds.forEach((childId) => {
            const child = this.getMember(childId);
            if (child) {
                child.parentIds = child.parentIds.filter((pid) => pid !== id);
            }
        });
        // Remove from parents' childIds
        memberToRemove.parentIds.forEach((parentId) => {
            const parent = this.getMember(parentId);
            if (parent) {
                parent.childIds = parent.childIds.filter((cid) => cid !== id);
            }
        });
        this.members.delete(id);
    }
    findMemberByName(name) {
        const lowerCaseName = name.toLowerCase();
        for (const member of this.members.values()) {
            if (member.name.toLowerCase() === lowerCaseName) {
                return member;
            }
        }
        return undefined;
    }
    listMembers() {
        return Array.from(this.members.values());
    }
    // --- Relationship Management ---
    addSpouse(memberId, spouseInput) {
        const member = this.getMember(memberId);
        if (!member) {
            throw new Error(`Member with id ${memberId} not found`);
        }
        if (this.tree.settings.monogamy && member.spouseIds.length > 0) {
            throw new Error(`Member ${member.name} is already married and monogamy is enforced.`);
        }
        if (this.tree.settings.maxSpousesPerMember &&
            member.spouseIds.length >= this.tree.settings.maxSpousesPerMember) {
            throw new Error(`Member ${member.name} has reached the maximum number of spouses.`);
        }
        const newSpouse = this.addMember(spouseInput);
        member.spouseIds.push(newSpouse.id);
        newSpouse.spouseIds.push(member.id);
        return newSpouse;
    }
    removeSpouse(memberId, spouseId) {
        const member = this.getMember(memberId);
        const spouse = this.getMember(spouseId);
        if (!member || !spouse) {
            // Idempotent: if one is missing, the relationship can't exist
            return;
        }
        member.spouseIds = member.spouseIds.filter((id) => id !== spouseId);
        spouse.spouseIds = spouse.spouseIds.filter((id) => id !== memberId);
    }
    addChild(parentId, childInput, secondParentId) {
        const parent1 = this.getMember(parentId);
        if (!parent1) {
            throw new Error(`Parent with id ${parentId} not found`);
        }
        const parents = [parent1];
        if (secondParentId) {
            const parent2 = this.getMember(secondParentId);
            if (!parent2) {
                throw new Error(`Parent with id ${secondParentId} not found`);
            }
            parents.push(parent2);
        }
        if (!this.tree.settings.allowSingleParent && parents.length < 2) {
            throw new Error('Single parent children are not allowed in this tree.');
        }
        if (this.tree.settings.maxParentsPerChild && parents.length > this.tree.settings.maxParentsPerChild) {
            throw new Error(`Cannot add a child with more than ${this.tree.settings.maxParentsPerChild} parents.`);
        }
        const newChild = this.addMember(childInput);
        newChild.parentIds.push(...parents.map((p) => p.id));
        parents.forEach((p) => p.childIds.push(newChild.id));
        return newChild;
    }
    removeChild(parentId, childId) {
        const parent = this.getMember(parentId);
        const child = this.getMember(childId);
        if (!parent || !child) {
            return; // Idempotent
        }
        parent.childIds = parent.childIds.filter((id) => id !== childId);
        child.parentIds = child.parentIds.filter((id) => id !== parentId);
    }
    // --- Serialization & utils ---
    computeRelationship(aId, bId) {
        if (aId === bId)
            return 'Self';
        const a = this.getMember(aId);
        const b = this.getMember(bId);
        if (!a || !b)
            return 'Unknown';
        // Direct relations
        if (a.spouseIds.includes(bId))
            return 'Spouse';
        if (a.childIds.includes(bId))
            return 'Parent';
        if (a.parentIds.includes(bId))
            return 'Child';
        const ancestorsA = this._getAncestorsAndDistance(aId);
        const ancestorsB = this._getAncestorsAndDistance(bId);
        // Ancestor/Descendant
        if (ancestorsB.has(aId)) {
            const distance = ancestorsB.get(aId);
            if (distance === 2)
                return 'Grandparent';
            return `${'Great-'.repeat(distance - 2)}Grandparent`;
        }
        if (ancestorsA.has(bId)) {
            const distance = ancestorsA.get(bId);
            if (distance === 2)
                return 'Grandchild';
            return `${'Great-'.repeat(distance - 2)}Grandchild`;
        }
        // Common ancestors for collateral relations
        let closestCommonAncestor = null;
        let distA = -1, distB = -1;
        for (const [ancestorId, dA] of ancestorsA.entries()) {
            if (ancestorsB.has(ancestorId)) {
                const dB = ancestorsB.get(ancestorId);
                if (closestCommonAncestor === null || (dA + dB) < (distA + distB)) {
                    closestCommonAncestor = ancestorId;
                    distA = dA;
                    distB = dB;
                }
            }
        }
        if (closestCommonAncestor) {
            // Siblings (should be caught by this if direct parent check fails, e.g. half-siblings)
            if (distA === 1 && distB === 1)
                return 'Sibling';
            // Aunt/Uncle/Niece/Nephew
            if (distA === 1 && distB > 1)
                return `${'Great-'.repeat(distB - 2)}Aunt/Uncle`;
            if (distB === 1 && distA > 1)
                return `${'Great-'.repeat(distA - 2)}Niece/Nephew`;
            // Cousins
            const cousinLevel = Math.min(distA, distB) - 1;
            const removal = Math.abs(distA - distB);
            const ordinal = (n) => {
                const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
            };
            const removedStr = removal > 0 ? `, ${removal === 1 ? 'once' : removal === 2 ? 'twice' : `${removal} times`} removed` : '';
            return `${ordinal(cousinLevel)} Cousin${removedStr}`;
        }
        // In-laws (basic)
        for (const spouseId of a.spouseIds) {
            const spouse = this.getMember(spouseId);
            if (spouse) {
                if (spouse.parentIds.includes(bId))
                    return 'Parent-in-law';
                if (spouse.childIds.includes(bId))
                    return 'Child-in-law';
                const spouseAncestors = this._getAncestorsAndDistance(spouseId);
                if (Array.from(spouseAncestors.keys()).some(ancestorId => b.parentIds.includes(ancestorId))) {
                    return 'Sibling-in-law';
                }
            }
        }
        return 'Unknown';
    }
    listRelations(memberId, type) {
        const relations = [];
        const lowerCaseType = type.toLowerCase();
        for (const otherMember of this.members.values()) {
            if (otherMember.id === memberId)
                continue;
            const relationship = this.computeRelationship(memberId, otherMember.id);
            if (relationship.toLowerCase() === lowerCaseType) {
                relations.push(otherMember.id);
            }
        }
        return relations;
    }
    findPath(fromId, toId) {
        if (!this.members.has(fromId) || !this.members.has(toId)) {
            return [];
        }
        const queue = [{ id: fromId, path: [fromId] }];
        const visited = new Set([fromId]);
        while (queue.length > 0) {
            const { id, path } = queue.shift();
            if (id === toId) {
                return path;
            }
            const member = this.getMember(id);
            const neighbors = [...member.parentIds, ...member.childIds, ...member.spouseIds];
            for (const neighborId of neighbors) {
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push({ id: neighborId, path: [...path, neighborId] });
                }
            }
        }
        return []; // No path found
    }
    validate() {
        const errors = [];
        const warnings = [];
        for (const member of this.members.values()) {
            // Referential integrity
            for (const spouseId of member.spouseIds) {
                if (!this.members.has(spouseId)) {
                    errors.push(`[Integrity] Member ${member.id} has non-existent spouse ${spouseId}`);
                }
            }
            for (const parentId of member.parentIds) {
                if (!this.members.has(parentId)) {
                    errors.push(`[Integrity] Member ${member.id} has non-existent parent ${parentId}`);
                }
            }
            for (const childId of member.childIds) {
                if (!this.members.has(childId)) {
                    errors.push(`[Integrity] Member ${member.id} has non-existent child ${childId}`);
                }
                else {
                    // Circular dependency check
                    const ancestors = this._getAncestorsAndDistance(member.id);
                    if (ancestors.has(childId)) {
                        errors.push(`[Circular] Member ${childId} is an ancestor of their own parent ${member.id}`);
                    }
                }
            }
            // Orphan warning
            if (member.parentIds.length === 0) {
                warnings.push(`[Orphan] Member ${member.id} (${member.name}) has no parents.`);
            }
        }
        return { errors, warnings };
    }
    serialize() {
        return {
            tree: this.tree,
            members: this.listMembers(),
        };
    }
    _getAncestorsAndDistance(memberId) {
        const ancestors = new Map();
        const queue = [{ id: memberId, distance: 0 }];
        const visited = new Set([memberId]);
        while (queue.length > 0) {
            const { id, distance } = queue.shift();
            const member = this.getMember(id);
            if (member) {
                for (const parentId of member.parentIds) {
                    if (!visited.has(parentId)) {
                        visited.add(parentId);
                        ancestors.set(parentId, distance + 1);
                        queue.push({ id: parentId, distance: distance + 1 });
                    }
                }
            }
        }
        return ancestors;
    }
    static fromSerialized(payload) {
        return new FamilyTreeCore(payload.tree, payload.members);
    }
}
exports.FamilyTreeCore = FamilyTreeCore;
//# sourceMappingURL=FamilyTreeCore.js.map