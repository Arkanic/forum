import * as knex from "knex";
import fs from "fs";

const DATA_DIR = "fdata";

export default async ():Promise<knex.Knex<any, unknown[]>> => {
    return new Promise((resolve, reject) => {
        if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

        const db = knex.default({
            client: "better-sqlite3",
            connection: {
                filename: `./${DATA_DIR}/forum.db`
            },
            useNullAsDefault: true
        });

        initdb(db.schema).then((_) => {
            resolve(db);
        });
    });
}

export async function initdb(schema:knex.Knex.SchemaBuilder):Promise<knex.Knex.SchemaBuilder> {
    if(await schema.hasTable("users")) return;

    return schema.createTable("users", table => {
        table.increments("id").primary();
        table.date("created");
        table.string("username", 32);
        table.string("about", 500);
        table.string("email", 320);
        table.string("avatar");
    }).createTable("passwords", table => {
        table.integer("id").unsigned();
        table.binary("hash");
    }).createTable("posts", table => {
        table.increments("id").primary();
        table.date("created");
        table.integer("author").unsigned();
        table.string("title", 100);
        table.string("body", 3000);
        table.string("attachment");
        // comments is an array of comment ids
        table.string("comments");
    }).createTable("comments", table => {
        table.increments("id").primary();
        table.date("created");
        table.integer("author").unsigned();
        table.string("body", 1000);
    });
}