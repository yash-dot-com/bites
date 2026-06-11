// middleware to handle any unexpected errors and return a response even if some error occurs

import type { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responses.js";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // for any error we will console it
  console.error(err)
  // return error response using errorResponse utility function
  errorResponse(res, 500, err)
}

// use in app 