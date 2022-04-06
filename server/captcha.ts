import {createCanvas} from "canvas";

export interface Captcha {
    text:string,
    image:string
}

function random(min:number, max:number):number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randLetters(len:number):string {
    let alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for(let i = 0; i < len; i++) {
        result += alpha.charAt(random(0, alpha.length));
    }

    return result;
}

export default function genCaptcha():Captcha {
    const canvas = createCanvas(300, 100);
    const ctx = canvas.getContext("2d");

    let str = randLetters(6);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 300, 100);

    let fs = random(30, 40);
    ctx.font = `${fs}px monospace`;

    ctx.strokeStyle = "#000111";

    ctx.beginPath();
    ctx.moveTo(random(0, 300), random(0, 100));
    for(let i = 0; i < 50; i++) {
        ctx.lineTo(random(0, 300), random(0, 100));
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let x = random(100, 200);
    let y = random(45, 55);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random(-45, 45) * Math.PI / 180);
    ctx.fillText(str, 0, 0);
    ctx.restore();

    return {
        text: str,
        image: canvas.toDataURL()
    }
}