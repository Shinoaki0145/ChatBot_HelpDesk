

class Group {
    public id: number;
    public owner: string;
    public name: string;

    constructor(id, owner, name) {
        this.id = id;
        this.owner = owner;
        this.name = name;
    }

    getId() {
        return this.id;
    }

    setOwner(owner: string) {
        this.owner = owner;
    }

    getOwner() {
        return this.owner;
    }

    setName(name: string) {
        this.name = name;
    }

    getName() {
        return this.name;
    }
}

class GroupService {

    loadGroup(user_id: number): Group[] {
        return [];
    }

    loadMembers(group_id: number): string[] {
        return [];
    }

    removeGroup(group_id: number): boolean {
        return false;
    }

    updateGroupName(group_id: number, name: string): boolean {
        return false;
    }

    updateGroupMembers(group_id: number, members: string[]): boolean {
        return false;
    }

    addGroup(owner: string, name: string, members: string[]): boolean {
        return false;
    }
}

export { Group, GroupService };