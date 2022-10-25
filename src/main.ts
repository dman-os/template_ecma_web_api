// read environment variables from `.env`
import * as dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";

import express from "express";
import { PrismaClient } from "@prisma/client";
import { configureExpress } from ".";

const prisma = new PrismaClient();

async function main() {
    const app = express();
    const stufff =123;
    const ctx = {
        prisma,
    };
    await configureExpress(app, ctx);

    const port = process.env.PORT ?? 3000;
    app.listen(port, () => {
        console.log(`hello at port ${port}`);
    });
}

main()
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
