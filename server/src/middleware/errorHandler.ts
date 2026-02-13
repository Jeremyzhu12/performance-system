import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export class AppError extends Error {
    statusCode: number
    isOperational: boolean

    constructor(message: string, statusCode: number = 500) {
        super(message)
        this.statusCode = statusCode
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor)
    }
}

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error(`错误: ${err.message}`)

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message
        })
    }

    // 未知错误
    logger.error(err.stack)
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    })
}
