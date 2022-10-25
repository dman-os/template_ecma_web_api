import express from "express";
import supertest from "supertest";

import { Context } from "../../src/endpoint";
import {
    configureExpress,
    getTestCtx,
    testHttpTable,
    user01,
} from "../";

describe("integration", () => {
    jest.setTimeout(30 * 1000);
    let ctx: Context;
    let cleanUp: () => Promise<void>;

    afterEach(async () => {
        await cleanUp();
    });

    testHttpTable(
        "DeleteUserEndpoint",
        async (name) => {
            ({ ctx, cleanUp } = await getTestCtx(name));
            const app = express();
            await configureExpress(app, ctx);
            return [app, ctx];
        },
        [
            {
                name: "works",
                method: "delete",
                path: `/users/${user01.id}`,
                statusCode: 204,
                extra: async ({ app }) => {
                    const createResp = await supertest(app).post(
                        `/users`,
                    ).send({
                      ...user01,
                      id: undefined,
                      password: "password",
                    });
                    createResp.statusCode.should.equal(201);
                },
            },
            {
                name: "is idempotent",
                method: "delete",
                path: `/users/12312`,
                statusCode: 204,
            },
        ],
    );
});
