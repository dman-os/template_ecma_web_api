import {
    MinLength,
    IsEmail,
} from "class-validator";
import { Expose,  } from "class-transformer";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";

import { Context, EndpointError, EndpointShorthand } from "../endpoint";
import { User,  } from "../entities";

export class CreateUserRequest {
    @Expose()
    @IsEmail()
    email: string;

//  @Expose()
//  @IsPhoneNumber("ET")
//  phoneNumber: string;

    @Expose()
    @MinLength(8)
    password: string;
}

export enum CreateUserError {
    EmailOccupied = "EmailOccupied",
}

export type CreateUserResponse = User;

export class CreateUserEndpoint extends EndpointShorthand<
    CreateUserRequest,
    CreateUserResponse
>({
    method: "post",
    path: "/users",
    successCode: 201,
    requestClass: CreateUserRequest,
}) {
    async handle(
        ctx: Context,
        request: CreateUserRequest,
    ): Promise<CreateUserResponse> {
        try {
            const { password, ...data } = request;
            const user = await ctx.prisma.user.create({
                data: {
                    ...data,
                    Credentials: {
                        create: {
                            passHash: await argon2.hash(password),
                        },
                    },
                },
            });
            return {
                ...user,
            };
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code == "P2002" &&
                err.meta
            ) {
                if (err.meta.target == "email") {
                    throw new EndpointError(400, CreateUserError.EmailOccupied);
                }
            }
            throw err;
        }
    }
}
