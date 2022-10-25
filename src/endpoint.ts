import { plainToClass, ClassConstructor } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { PrismaClient } from "@prisma/client";

import { dbg } from "./utils";

export interface Context {
    prisma: PrismaClient;
}

export abstract class Endpoint<Req, Res> {
    abstract handle(ctx: Context, request: Req): Promise<Res>;
}

export class EndpointError extends Error {
    constructor(public code: number, public type: string) {
        super();
    }
}

export enum EndpointErrorTypes {
    InvalidInput = "InvalidInput",
    Internal = "Internal",
    AccessDenied = "AccessDenied",
    Unauthenticated = "Unauthenticated",
}

export type HttpMethod = "get" | "post" | "patch" | "delete";
export type HttpSuccessStatusCode = 200 | 201 | 204;

export abstract class HttpEndpoint<Req, Res> extends Endpoint<Req, Res> {
    abstract method(): HttpMethod;
    abstract path(): string;
    abstract successCode(): HttpSuccessStatusCode;
    abstract request(input: object): Promise<Req>;
    async handleHttp(ctx: Context, input: object): Promise<Res> {
        const request = await this.request(input);
        return this.handle(ctx, request);
    }
}

export class ValidationEndpointError extends EndpointError {
    constructor(public issues: ValidationError[]) {
        super(400, EndpointErrorTypes.InvalidInput);
    }
}

export async function validateClass<T extends object>(
    validationClass: ClassConstructor<T>,
    input: object,
): Promise<T> {
    const request = plainToClass(validationClass, input, {
        excludeExtraneousValues: true,
    });
    const errors = await validate(request, { forbidUnknownValues: true });
    if (errors.length > 0) throw new ValidationEndpointError(errors);
    return request;
}

export function EndpointShorthand<Req extends object, Res>({
    method,
    successCode,
    path,
    requestClass,
}: {
    method: HttpMethod;
    successCode: HttpSuccessStatusCode;
    path: string;
    requestClass: ClassConstructor<Req>;
}) {
    abstract class Shorthand extends HttpEndpoint<Req, Res> {
        method() {
            return method;
        }
        path() {
            return path;
        }
        successCode() {
            return successCode;
        }
        request(input: object): Promise<Req> {
            return validateClass<Req>(requestClass, input);
        }
    }
    return Shorthand;
}

// export abstract class AuthorizedEndpoint<Req, Res> extends Endpoint<Req, Res> {
//   async handle(ctx: Context, request: Req): Promise<Res>{
//   }
//   async handleAuthorized(ctx: Context, request: Req): Promise<Res>{
//
//   }
// }
