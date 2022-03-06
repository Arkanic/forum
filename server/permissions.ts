import {DbConnection} from "./db";

// abcdefgh..
// view comment post delete admin

export enum PermissionCodes {
    View = "v",
    Comment = "c",
    Post = "p",
    Delete = "d",
    Admin = "a"
}

class Permissions {
    db:DbConnection

    constructor(db:DbConnection) {
        this.db = db;
    }

    hasFlag(perms:string, code:PermissionCodes):boolean {
        return perms.includes(code);
    }

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

    defaultUserPermissions():string {
        return PermissionCodes.View + PermissionCodes.Comment + PermissionCodes.Post;
    }

    defaultAnonPermissions():string {
        // need to be logged in to comment/post, so adding these permissions will do nothing
        return PermissionCodes.View;
    }
}

export default Permissions;