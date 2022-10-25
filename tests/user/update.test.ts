import express from "express";
import supertest from "supertest";

import { Context } from "../../src/endpoint";
import {
    configureExpress,
    getTestCtx,
    testHttpTable,
    validateTestTable,
    user01,
    user02,
} from "../";
import { UpdateUserEndpoint } from "../../src/user";

const now = new Date();
const input = {
    email: "tranz@parent.dream",
    password: "password",
};

describe("validation", () => {
    validateTestTable(new UpdateUserEndpoint(), [
        {
            name: "rejects invalid email",
            input: {
                email: "invalid",
            },
            errorField: "email",
        },
        {
            name: "rejects too short password",
            input: {
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
        "UpdateUserEndpoint",
        async (name) => {
            ({ ctx, cleanUp } = await getTestCtx(name));
            const app = express();
            await configureExpress(app, ctx);
            return [app, ctx];
        },
        [
            {
                name: "works",
                method: "patch",
                path: `/users/${user01.id}`,
                statusCode: 200,
                reqBody: {
                    ...input,
                },
                extra: async ({ response, app }) => {
                    const getResponse = await supertest(app).get(
                        `/users/${response.body.id}`,
                    );
                    getResponse.statusCode.should.equal(200);
                    getResponse.body.id.should.equal(response.body.id);
                    new Date(getResponse.body.createdAt)
                        .valueOf()
                        .should.be.lt(
                            new Date(getResponse.body.updatedAt).valueOf(),
                        );
                    getResponse.body.email.should.equal(input.email);
                },
            },
            {
                name: "fails if user not found",
                method: "patch",
                path: `/users/456789`,
                statusCode: 404,
                reqBody: {
                    ...input,
                },
                errorType: "UserNotFound",
            },
            {
                name: "rejects if email occupied",
                method: "patch",
                path: `/users/${user01.id}`,
                statusCode: 400,
                reqBody: {
                    email: user02.email,
                },
                errorType: "EmailOccupied",
                printResponse: true,
            },
        ],
    );
});
