import { IsPositive } from "class-validator";
import { Expose, Type } from "class-transformer";
import { Prisma } from "@prisma/client";

import { Context, EndpointShorthand } from "../endpoint";

export class DeleteUserRequest {
  @Expose()
  @Type(() => Number)
  @IsPositive()
  id: number;
}

export type DeleteUserResponse = void;

export class DeleteUserEndpoint extends EndpointShorthand<
  DeleteUserRequest,
  DeleteUserResponse
>({
  method: "delete",
  path: "/users/:id",
  successCode: 204,
  requestClass: DeleteUserRequest,
}) {
  async handle(
    ctx: Context,
    request: DeleteUserRequest,
  ): Promise<DeleteUserResponse> {
    let { id } = request;
    try {
      await ctx.prisma.$transaction([
        ctx.prisma.user.update({
          where: { id },
          data: {
            Credentials: {
              delete: true
            }
          },
        }),
        ctx.prisma.user.delete({
          where: {
            id
          },
        })
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code == "P2025") {
          return;
        }
      }
      throw err;
    }
  }
}
