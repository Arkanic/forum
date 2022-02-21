import * as knex from "knex";
import fs from "fs";

const DATA_DIR = "fdata";

export default async (type:string | undefined):Promise<knex.Knex<any, unknown[]>> => {
    return new Promise((resolve, reject) => {
        if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

        let db:knex.Knex<any, unknown[]> | PromiseLike<knex.Knex<any, unknown[]>>;

        if(type == "production") {
            db = knex.default({
                client: "pg",
                version: "13.5",
                connection: {
                    connectionString: process.env.DATABASE_URL,
                    ssl: {
                        rejectUnauthorized: false
                    }
                },
                migrations: {
                    directory: __dirname + "/db/migrations",
                },
                seeds: {
                    directory: __dirname + "/db/seeds",
                }
            });
        } else {
            db = knex.default({
                client: "better-sqlite3",
                connection: {
                    filename: `./${DATA_DIR}/forum.db`
                },
                useNullAsDefault: true
            });
        }

        initdb(db.schema).then((_) => {
            resolve(db);
        });
    });
}

export async function initdb(schema:knex.Knex.SchemaBuilder):Promise<knex.Knex.SchemaBuilder> {
    if(await schema.hasTable("users")) return;

    return schema.createTable("users", table => {
        table.increments("id").primary();
        table.bigInteger("created").unsigned();
        table.string("username", 32);
        table.string("about", 500);
        table.string("email", 320);
        table.string("avatar");
    }).createTable("passwords", table => {
        table.integer("id").unsigned();
        table.binary("hash");
    }).createTable("posts", table => {
        table.increments("id").primary();
        table.bigInteger("created").unsigned();
        table.integer("author").unsigned();
        table.string("title", 100);
        table.string("body", 3000);
        table.string("attachment");
        // comments is an array of comment ids
        table.string("comments");
    }).createTable("comments", table => {
        table.increments("id").primary();
        table.bigInteger("created").unsigned();
        table.integer("author").unsigned();
        table.string("body", 1000);
    }).createTable("files", table => {
        table.increments("id").primary();
        table.string("name");
        table.binary("data", 8388608);
    });
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
        console.log(id);
        let [h] = id;
        return h;
    }

    async getPost(id:number | string) {
        let post = await this.getById("posts", id);
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
}