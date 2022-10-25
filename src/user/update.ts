import {
  IsEnum,
  MinLength,
  IsEmail,
  IsPhoneNumber,
  IsNotEmpty,
  ValidateBy,
  IsOptional,
  IsPositive,
} from "class-validator";
import { Expose, Type } from "class-transformer";
import { Prisma } from "@prisma/client";
import argon2 from "argon2";

import { Context, EndpointError, EndpointShorthand } from "../endpoint";
import { User,  } from "../entities";
import { dbg } from "../utils";

export class UpdateUserRequest {
  @Expose()
  @Type(() => Number)
  @IsPositive()
  id: number;

  @Expose()
  @IsOptional()
  @IsEmail()
  email?: string;


  @Expose()
  @IsOptional()
  @MinLength(8)
  password?: string;

  isEmpty(): boolean {
    return !(
      this.email ||
      this.password
    );
  }
}

export enum UpdateUserError {
  UserNotFound = "UserNotFound",
  EmailOccupied = "EmailOccupied",
}

export type UpdateUserResponse = User;

export class UpdateUserEndpoint extends EndpointShorthand<
  UpdateUserRequest,
  UpdateUserResponse
>({
  method: "patch",
  path: "/users/:id",
  successCode: 200,
  requestClass: UpdateUserRequest,
}) {
  async handle(
    ctx: Context,
    request: UpdateUserRequest,
  ): Promise<UpdateUserResponse> {
    try {
      if (request.isEmpty()) {
        const user = await ctx.prisma.user.findUnique({
          where: {
            id: request.id,
          },
        });
        if (user == null)
          throw new EndpointError(404, UpdateUserError.UserNotFound);
        return {
          ...user,
        };
      }

      const { id, password, ...data } = request;
      // const user = await ctx.prisma.user.update({
      //   where: { id },
      //   data: {
      //     ...data,
      //     updatedAt: new Date(),
      //     ...(password
      //       ?
      //       {
      //         credentials: {
      //           update: {
      //             passHash: await argon2.hash(password)
      //           }
      //         }
      //       } : {}),
      //   },
      // });
      const [user] = await ctx.prisma.$transaction([
        ctx.prisma.user.update({
          where: { id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        }),
        ...(password
          ?
          [ctx.prisma.user.update({
            where: { id },
            data: {
              Credentials: {
                update: {
                  passHash: await argon2.hash(password)
                }
              }
            },
          })] : []),
      ]);
      return {
        ...user,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code == "P2025") {
          throw new EndpointError(404, UpdateUserError.UserNotFound);
        } else if (err.code == "P2002") {
          if (err.meta!.target == "email") {
            throw new EndpointError(400, UpdateUserError.EmailOccupied);
          }
        }
      }
      throw err;
    }
  }
}
