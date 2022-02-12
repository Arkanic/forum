import express from "express";
import multer from "multer";
import {Knex} from "knex";
import fs from "fs";
import path from "path";
import {customAlphabet} from "nanoid";

const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);

const DATA_DIR = "fdata";
const FILES_DIR = "files";

export function initFiles(db:Knex):multer.Multer {
    if(!fs.existsSync(`./${DATA_DIR}/${FILES_DIR}`)) fs.mkdirSync(`./${DATA_DIR}/${FILES_DIR}`);
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, `./${DATA_DIR}/${FILES_DIR}`);
        },
        filename: async (req, file, cb) => {
            const fn = `${nanoid()}${path.extname(file.filename)}`;
            cb(null, fn);
        }
    });
    const upload = multer({storage});
    return upload;
}