import type { Request, Response, NextFunction } from "express";
import { z, type ZodSchema } from "zod";

// for prettifying the error, prints only the messages in user readable form.
// const pretty = (error) => z.prettifyError(error)
// pretty(result.error)

// zod has changed, for nested error object, we need to return result.error.issues
export const validate =
  <T>(schema: ZodSchema<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ success: false, errors: result.error.issues});
    }
    req.body = result.data
    next();
  };