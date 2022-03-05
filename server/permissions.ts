import {DbConnection} from "./db";

// 0 1 2 3 4 ... 63
// 

class Permissions {
    db:DbConnection

    constructor(db:DbConnection) {
        this.db = db;
    }

    async hasFlag(user:number, code:string):Promise<boolean> {
        let char = code[0];

        let userData = await this.db.getById("users", user);
        let perms:string = userData.permissions;
        return perms.includes(char);
    }

    async modFlag(user:number, code:string, trip:boolean):Promise<void> {
        let char = code[0];

        let userData = await this.db.getById("users", user);
        let perms:string = userData.permissions;
        if(trip) {
            if(!perms.includes(char)) perms += char;
        } else perms = perms.replace(char, "");

        await this.db.updateById("users", user, {permissions: perms});
    }
}

export default Permissions;