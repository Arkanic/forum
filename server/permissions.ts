import {DbConnection} from "./db";

// abcdefgh..
// view comment post delete admin

/**
 * Map of codes for permissions
 * "Permissions" are a string of these codes
 */
export enum PermissionCodes {
    View = "v", // View posts
    Comment = "c", // Comment on posts
    Post = "p", // Post
    Delete = "d", // Delete others' posts and comments
    Admin = "a" // Modify other user's roles
}

export const CodeNameMap = {
    "v": "View Posts",
    "c": "Comment",
    "p": "Post",
    "d": "Delete Any Post",
    "a": "Administrate roles"
};

/**
 * Simplified system for checking user flags
 * Usage of DB is depreceated. Should use independent functions.
 */
class Permissions {
    db:DbConnection

    constructor(db:DbConnection) {
        this.db = db;
    }

    /**
     * Check if a permissions string contains a particular code
     *
     * @param perms string of permissions 
     * @param code check for
     * @returns true?
     */
    hasFlag(perms:string, code:PermissionCodes):boolean {
        return perms.includes(code);
    }

    /**
     * Turn a flag on/off in a givern permissions string
     *
     * @param perms string of permissions
     * @param code to change
     * @param trip what should it be set to?
     * @returns modified string
     */
    modFlag(perms:string, code:PermissionCodes, trip:boolean):string {
        if(trip) {
            if(!perms.includes(code)) perms += code;
        } else perms = perms.replace(code, "");

        return perms;
    }

    async userHasFlag(user:number, code:PermissionCodes):Promise<boolean> {
        let userData = await this.db.getById("users", user);
        let perms:string = userData.permissions;
        return this.hasFlag(perms, code);
    }

    async userModFlag(user:number, code:PermissionCodes, trip:boolean):Promise<void> {
        let userData = await this.db.getById("users", user);
        let perms:string = userData.permissions;

        perms = this.modFlag(perms, code, trip);

        await this.db.updateById("users", user, {permissions: perms});
    }

    /**
     * Permissions for a user by default
     */
    defaultUserPermissions():string {
        return PermissionCodes.View + PermissionCodes.Comment + PermissionCodes.Post;
    }

    /**
     * Permissions for anonymous by default
     */
    defaultAnonPermissions():string {
        // need to be logged in to comment/post, so adding these permissions will do nothing
        return PermissionCodes.View;
    }
}

export default Permissions;