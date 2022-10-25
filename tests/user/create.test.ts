import express from "express";
import supertest from "supertest";

import { Context } from "../../src/endpoint";
import {
    configureExpress,
    getTestCtx,
    testHttpTable,
    validateTestTable,
    user01,
} from "../";
import { CreateUserEndpoint } from "../../src/user";

const now = new Date();
const input = {
    email: "tranz@parent.dream",
    password: "password",
};

describe("validation", () => {
    validateTestTable(new CreateUserEndpoint(), [
        {
            name: "rejects invalid email",
            input: {
                ...input,
                email: "invalid",
            },
            errorField: "email",
        },
        {
            name: "rejects too short password",
            input: {
                ...input,
                password: "shrt",
            },
            errorField: "password",
        },
    ]);
});

describe("integration", () => {
    jest.setTimeout(30 * 1000);
    let ctx: Context;
    let cleanUp: () => Promise<void>;

    afterEach(async () => {
        await cleanUp();
    });

    testHttpTable(
        "CreateUserEndpoint",
        async (name) => {
            ({ ctx, cleanUp } = await getTestCtx(name));
            const app = express();
            await configureExpress(app, ctx);
            return [app, ctx];
        },
        [
            {
                name: "works",
                method: "post",
                path: `/users`,
                statusCode: 201,
                reqBody: {
                    ...input,
                },
                extra: async ({ response, app }) => {
                    const getResponse = await supertest(app).get(
                        `/users/${response.body.id}`,
                    );
                    getResponse.statusCode.should.equal(200);
                    getResponse.body.id.should.equal(response.body.id);
                    getResponse.body.createdAt.should.not.be.undefined;
                    getResponse.body.updatedAt.should.not.be.undefined;
                    getResponse.body.email.should.equal(input.email);
                },
            },
            {
                name: "rejects if email occupied",
                method: "post",
                path: `/users`,
                statusCode: 400,
                reqBody: {
                    ...input,
                    email: user01.email,
                },
                errorType: "EmailOccupied",
            },
        ],
    );
});
