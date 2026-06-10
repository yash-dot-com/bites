import type { Request, Response, NextFunction } from "express";
import { initializeRedisClient } from "../utils/redisClient.js";
import { restaurantKeyById } from "../utils/redisKeys.js";
import { errorResponse } from "../utils/responses.js";

export const checkRestaurantExists = async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId } = req.params
  
  // if no ID in request params 
  if (!restaurantId) {
    return errorResponse(res,400, "Restaurant ID not found")
  }

  const client = await initializeRedisClient()
  const restaurantKey = restaurantKeyById(restaurantId)

  // returns 1 if true, 0 if false 
  const exists = await client.exists(restaurantKey)
  if (!exists) {
    return errorResponse(res,404,"Restaurant Not Found")
  }
  next();
}