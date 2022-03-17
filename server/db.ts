import * as knex from "knex";
import fs from "fs";

import {getMigration, getMigrations} from "./db/migrator";
import constants from "./constants";

const DATA_DIR = "fdata";

/**
 * Setup database & return it
 * Async
 */
export default async (type:string | undefined):Promise<knex.Knex<any, unknown[]>> => {
    return new Promise((resolve, reject) => {
        if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

        let db:knex.Knex<any, unknown[]> | PromiseLike<knex.Knex<any, unknown[]>>;
        db = knex.default({
            client: "better-sqlite3",
            connection: {
                filename: `./${DATA_DIR}/forum.db`
            },
            useNullAsDefault: true
        });

        initdb(db).then((_) => {
            resolve(db);
        });
    });
}

function readVersion():string {
    return fs.readFileSync(`./${DATA_DIR}/version`).toString();
}

function createVersion(version:string) {
    fs.writeFileSync(`./${DATA_DIR}/version`, version);
}

export async function initdb(db:knex.Knex<any, unknown[]>):Promise<knex.Knex.SchemaBuilder> {
    let {schema} = db;
    let version = "0.0.0";
    if(await schema.hasTable("users")) {
        version = readVersion();
    }

    let migrations = getMigrations(version);
    for(let i in migrations) {
        let migration = await getMigration(migrations[i]);
        migration.up(schema);
    }

    createVersion(constants.VERSION);

    return schema;
}

// provides generic functions for db
export class DbConnection {
    db:knex.Knex<any, unknown[]>

    constructor(db:knex.Knex<any, unknown[]>) {
        this.db = db;
    }

    async getByUsername(table:string, username:string) {
        let [result] = await this.db(table).select().where("username", username);
        return result;
    }

    async getById(table:string, id:number | string) {
        let [result] = await this.db(table).select().where("id", id);
        return result;
    }

    async insert(table:string, content:any) {
        let id = await this.db(table).insert(content);
        let [h] = id;
        return h;
    }

    async getPost(id:number | string) {
        let post = await this.getById("posts", id);
        if(!post) return null;
        post.comments = JSON.parse(post.comments);
        return post;
    }

    async updateById(table:string, id:number | string, content:any) {
        await this.db(table).update(content).where("id", id);
    }

    async updatePost(id:number | string, content:any) {
        if(content.comments) content.comments = JSON.stringify(content.comments);
        await this.updateById("posts", id, content);
    }

    async fetchRecentPosts(count:number) {
        const posts = await this.db("posts").orderBy("id", "desc").limit(count);
        return posts;
    }

    async getFile(name:string) {
        const [file] = await this.db("files").select().where("name", name);
        return file;
    }

    async deleteById(table:string, id:number | string) {
        await this.db(table).del().where("id", id);
    }
}