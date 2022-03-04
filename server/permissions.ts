import {DbConnection} from "./db";

// 0 1 2 3 4 ... 63
// 

class Permissions {
    db:DbConnection

    constructor(db:DbConnection) {
        this.db = db;
    }

    async hasFlag(user:number, index:number):Promise<boolean> {
        let userData = await this.db.getById("users", user);
        let perms = userData.permissions;
        return (perms & (2 ** index)) > 0;
    }

    async modFlag(user:number, index:number, trip:boolean):Promise<void> {
        let userData = await this.db.getById("users", user);
        let perms = userData.permissions;
        let mask = 2 ** index;
        let result = trip ? (mask | perms) : (mask & ~perms);

        await this.db.updateById("users", user, {permissions: result});
    }
}

export default Permissions;