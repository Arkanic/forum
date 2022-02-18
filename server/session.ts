import {nanoid} from "nanoid";
import express from "express";

export class Sessions extends Map {
    timeout:number;

    constructor(timeout = 1000 * 60 * 60 * 24 * 7) {
        super();
        this.timeout = timeout;
    }

    add(name:string):string {
        const id = nanoid(32);
        this.set(id, name);

        setTimeout(() => {
            this.delete(id);
        }, this.timeout);

        return id;
    }

    from(req:express.Request) {
        return super.get(req.cookies.session as string);
    }

    reset(name:string) {
        for(let [key, value] of this) {
            if(name === value) this.delete(key);
        }
    }
}

export default () => new Sessions();