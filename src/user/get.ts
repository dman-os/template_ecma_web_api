import { IsPositive } from "class-validator";
import { Expose, Type } from "class-transformer";
import { Prisma } from "@prisma/client";

import { Context, EndpointError, EndpointShorthand } from "../endpoint";
import { User,  } from "../entities";

export class GetUserRequest {
    @Expose()
    @Type(() => Number)
    @IsPositive()
    id: number;
}

export enum GetUserError {
    UserNotFound = "UserNotFound",
}

export type GetUserResponse = User;

export class GetUserEndpoint extends EndpointShorthand<
    GetUserRequest,
    GetUserResponse
>({
    method: "get",
    path: "/users/:id",
    successCode: 200,
    requestClass: GetUserRequest,
}) {
    async handle(
        ctx: Context,
        request: GetUserRequest,
    ): Promise<GetUserResponse> {
        try {
            const user = await ctx.prisma.user.findUnique({
                where: {
                    id: request.id,
                },
            });
            if (user == null)
                throw new EndpointError(404, GetUserError.UserNotFound);
            return {
                ...user,
            };
        } catch (err) {
            if (err instanceof Prisma.NotFoundError) {
                throw new EndpointError(404, GetUserError.UserNotFound);
            }
            throw err;
        }
    }
}
