import express from "express";
import winston from "winston";
import expressWinston from "express-winston";

import { Context, EndpointError, EndpointErrorTypes } from "./endpoint";

import { userServiceEndpoints } from "./user";

import { dbg } from "./utils";

export async function configureExpress(
    app: express.Express,
    ctx: Context,
): Promise<void> {
    const router = express.Router();
    for (const endpoint of [...userServiceEndpoints()]) {
        const successCode = endpoint.successCode();
        router[endpoint.method()](
            endpoint.path(),
            async function endpointHandler(req, res, next) {
                try {
                    const response = await endpoint.handleHttp(ctx, {
                        ...req.params,
                        ...req.body,
                    });
                    res.status(successCode).json(response);
                } catch (err) {
                    if (err instanceof EndpointError) {
                        res.status(err.code).json(err);
                    } else {
                        next(err);
                    }
                }
            },
        );
    }

    const winstonFormat = winston.format.combine(
        winston.format.timestamp(),
        ...(process.env.NODE_ENV == "prod"
            ? [winston.format.json({ space: 2 })]
            : [winston.format.prettyPrint(), winston.format.colorize()]),
        // winston.format.colorize(),
        // winston.format.json(
        //   process.env.NODE != "prod" ?
        //     { space: 2 }
        //     : undefined
        // ),
    );
    app.use(express.json())
        .use(
            expressWinston.logger({
                transports: [new winston.transports.Console()],
                format: winstonFormat,
            }),
        )
        .use(router)
        .use(function fourOhFourHandler(_, res) {
            res.status(404).send("404: Resource Not Found");
        })
        .use(
            expressWinston.errorLogger({
                transports: [new winston.transports.Console()],
                format: winstonFormat,
            }),
        )
        .use(function errorHandler(err, _, res) {
            console.error(err);
            res.status(500).json(
                new EndpointError(500, EndpointErrorTypes.Internal),
            );
        } as express.ErrorRequestHandler);
}
