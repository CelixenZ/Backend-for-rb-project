import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

export function zodValidateMiddleware(schema: ZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      parmas: req.params
    });

    if (!result.success) {
      return res.status(400).json({
        errors: result.error.issues
      });
    }
    
    next();
  }
}