import type { NextFunction, Request, Response } from "express";

export interface CustomError extends Error {
    statusCode?: number;
    details?: any;
}

export const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url}:`, {
        statusCode,
        message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });

    res.status(statusCode).json({
        message,
        error: err.message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
