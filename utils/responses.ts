import type { Response } from "express";

// success response structure 
export function successResponse(res: Response, data: any, message: string = "success") {
  // since this is a success response, status 200 
  return res.status(200).json({sucess: true, message, data})
}

// error response structure 
export function errorResponse(res: Response, statusCode: number, error: string) {
  return res.status(statusCode).json({success: false, error})
}   