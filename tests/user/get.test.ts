import express from "express";
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
        "GetUserEndpoint",
        async (name) => {
            ({ ctx, cleanUp } = await getTestCtx(name));
            const app = express();
            await configureExpress(app, ctx);
            return [app, ctx];
        },
        [
            {
                name: "works",
                method: "get",
                path: `/users/${user01.id}`,
                statusCode: 200,
            },
        ],
    );
});
