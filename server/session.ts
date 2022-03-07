import {nanoid} from "nanoid";
import express from "express";

/**
 * Map for user sessions
 */
export class Sessions extends Map {
    timeout:number;

    constructor(timeout = 1000 * 60 * 60 * 24 * 7) {
        super();
        this.timeout = timeout;
    }

    /**
     * Add a session given a name (automatically generates an ID, pushes, and returns it)
     *
     * @param name becomes the value
     * @returns the id, or session
     */
    add(name:string):string {
        const id = nanoid(128);
        this.set(id, name);

        setTimeout(() => {
            this.delete(id);
        }, this.timeout);

        return id;
    }

    /**
     * Retrieve name when given request
     *
     * @param req fetches cookies from this
     * @returns name from map
     */
    from(req:express.Request):string {
        return super.get(req.cookies.session as string);
    }

    /**
     * Purge all sessions from name
     *
     * @param name Name to check for
     */
    reset(name:string) {
        for(let [key, value] of this) {
            if(name === value) this.delete(key);
        }
    }
}

export default () => new Sessions();