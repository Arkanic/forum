import {Knex} from "knex";

export const up = (schema:Knex.SchemaBuilder) => {
    return schema.createTable("users", table => {
        table.increments("id").primary();
        table.bigInteger("created").unsigned();
        table.string("username", 32);
        table.string("about", 500);
        table.string("email", 320);
        table.string("avatar");
        table.string("permissions");
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
        table.integer("parent").unsigned();
        table.string("body", 1000);
    }).createTable("files", table => {
        table.increments("id").primary();
        table.string("name");
        table.binary("data", 8388608); // 8mb
    });
}

export const down = (knex:Knex) => {}