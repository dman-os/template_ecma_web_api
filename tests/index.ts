export { configureExpress } from "../src";
import "chai/register-should";

import express from "express";
import supertest from "supertest";
import argon2 from "argon2";
import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

import { PrismaClient } from "@prisma/client";
// import { mockDeep } from "jest-mock-extended";

import { User, } from "../src/entities";
import {
  Context,
  Endpoint,
  HttpEndpoint,
  ValidationEndpointError,
  EndpointError,
} from "../src/endpoint";
import { extractEnv, dbg } from "../src/utils";

const now = new Date();

export const user01: User = {
  id: 1,
  email: "blck@rosa.ai",
};

export const user02: User = {
  id: 2,
  email: "snekk@scal.ez",
};

export async function populateMockEntities(ctx: Context) {
  const passHash = await argon2.hash("password");
  for (const user of [user01, user02]) {
    await ctx.prisma.user.create({
      data:
      {
        ...user,
        id: undefined,
        Credentials: {
          create: { passHash }
        }
      },

    });
  }
}

export type TestCtx = {
  ctx: Context;
  cleanUp: () => Promise<void>;
};

export type GetTestCtxFn = typeof getTestCtx;

export async function getTestCtx(testName: string): Promise<TestCtx> {
  const db_user = extractEnv("TEST_DB_USER");
  const db_pass = extractEnv("TEST_DB_PASS");
  const db_host = extractEnv("TEST_DB_HOST");
  const db_port = extractEnv("TEST_DB_PORT");
  const db_server_url = `postgres://${db_user}:${db_pass}@${db_host}:${db_port}`;
  const test_db_url = `${db_server_url}/${testName}`;
  try {
        /*const { stdout, stderr } = */ await execAsync(
    `./node_modules/.bin/prisma migrate reset --force`,
    {
      env: {
        ...process.env,
        DATABASE_URL: test_db_url,
      },
    },
  );
  } catch (err) {
    console.log(err);
    throw err;
  }
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: test_db_url,
      },
    },
  });
  const ctx: Context = {
    prisma,
    // prisma: mockDeep<PrismaClient>()
  };
  await populateMockEntities(ctx);

  return {
    ctx,
    cleanUp: async () => {
      await prisma.$disconnect();
      await execAsync(
        `echo "DROP DATABASE \\\"${testName}\\\"" | ./node_modules/.bin/prisma db execute --stdin --url="${db_server_url}"`,
      );
    },
  };
}

export type HttpTestTable = {
  name: string;
  path: string;
  method: "get" | "post" | "patch" | "delete";
  statusCode: number;
  reqBody?: Record<string, unknown>;
  // properties for which to check in the response
  checkBody?: Record<string, unknown>;
  errorType?: string;
  extra?: (args: {
    response: supertest.Response;
    app: express.Express;
    ctx: Context;
  }) => Promise<void>;
  printResponse?: boolean;
  authToken?: string;
}[];

export function testHttpTable(
  tableName: string,
  getCtx: (name: string) => Promise<[express.Express, Context]>,
  tests: HttpTestTable,
) {
  describe(tableName, () => {
    for (const {
      name,
      path,
      method,
      statusCode,
      reqBody,
      checkBody,
      errorType,
      extra,
      printResponse,
      authToken,
    } of tests) {
      it(name, async () => {
        const [app, ctx] = await getCtx(
          `${tableName}_${name}`.replaceAll(/ /g, "_"),
        );
        // TODO: look for a declarative way to make the request
        const request = supertest(app)[method](path);

        if (authToken) {
          request.set("Authorization", `Bearer ${authToken}`);
        }

        const response = await request.send(reqBody);

        if (printResponse) {
          console.log(JSON.stringify(response.body, undefined, "  "));
        }
        response.statusCode.should.equal(statusCode);
        if (checkBody) {
          for (const prop in checkBody) {
            response.body[prop].should.equal(checkBody[prop]);
          }
        }
        if (errorType) {
          response.body.type.should.equal(errorType);
        }
        if (extra) {
          await extra({ response, app, ctx });
        }
      });
    }
  });
}

export type ValidateTestTable<Req> = {
  name: string;
  input: object;
  // properties for which to check in the response
  checkBody?: Record<string, unknown>;
  errorField?: string;
  extra?:
  | ((req: Req) => Promise<void>)
  | ((err: ValidationEndpointError) => Promise<void>);
  printResponse?: boolean;
}[];

export function validateTestTable<Req, Res>(
  endpoint: HttpEndpoint<Req, Res>,
  tests: ValidateTestTable<Req>,
) {
  for (const {
    name,
    input,
    checkBody,
    errorField,
    extra,
    printResponse,
  } of tests) {
    it(name, async () => {
      let failed = false;
      let result: any;
      try {
        result = await endpoint.request(input);
      } catch (error) {
        failed = true;
        result = error;
      }

      if (printResponse) {
        console.log(JSON.stringify(result, undefined, "  "));
      }

      if (checkBody) {
        for (const prop in checkBody) {
          result.body[prop].should.equal(checkBody[prop]);
        }
      }
      if (errorField) {
        if (!failed) {
          throw new Error("did not throw");
        }
        const error = result as ValidationEndpointError;
        if (!error.issues.some((err) => err.property == errorField)) {
          console.log(result);
          throw new Error(
            `ValidationEndpointErrors did not contain err at property ${errorField}`,
          );
        }
      }
      if (extra) {
        await extra(result);
      }
    });
  }
}

export type TestTable<Req, Res> = {
  name: string;
  request: Req;
  // properties for which to check in the response
  checkBody?: Record<string, unknown>;
  errorCode?: number;
  errorType?: string;
  extra?:
  | ((req: Res) => Promise<void>)
  | ((err: EndpointError) => Promise<void>);
  printResponse?: boolean;
}[];

export function testTable<Req, Res>(
  endpoint: Endpoint<Req, Res>,
  getCtx: (name: string) => Context,
  tests: TestTable<Req, Res>,
) {
  for (const {
    name,
    request,
    checkBody,
    errorCode,
    errorType,
    extra,
    printResponse,
  } of tests) {
    it(name, async () => {
      const ctx = getCtx(name);
      let response: any;
      let failed = false;
      try {
        response = endpoint.handle(ctx, request);
      } catch (error) {
        failed = true;
        response = error;
      }

      if (printResponse) {
        console.log(JSON.stringify(response, undefined, "  "));
      }

      if (checkBody) {
        for (const prop in checkBody) {
          response.body[prop].should.equal(checkBody[prop]);
        }
      }
      if (errorType || errorCode) {
        if (!failed) {
          throw new Error("did not throw");
        }
        if (errorType) {
          response.type.should.equal(errorType);
        }
        if (errorCode) {
          response.code.should.equal(errorCode);
        }
      }
      if (extra) {
        await extra(response);
      }
    });
  }
}
