import express from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantSchema } from "../schemas/restaurant.js"
import type { Restaurant } from "../schemas/restaurant.js"
import { initializeRedisClient } from "../utils/redisClient.js"
import { restaurantKeyById } from "../utils/redisKeys.js"
import { nanoid } from "nanoid"
import { successResponse } from "../utils/responses.js"
import type { Request, Response, NextFunction } from "express"
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js"

const router = express.Router()

// GET /health 
router.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: {
      health: "OK"
    }
  })
})

// POST /restaurants 
// NOTE we are yet to handle duplicate entries, will handle with a check condition
router.post("/", validate(RestaurantSchema), async (req, res, next) => {
  const data = req.body as Restaurant
  try {
    const client = await initializeRedisClient();
    const id = nanoid()
    const restaurantKey = restaurantKeyById(id)
    // storing restaurantId : {id, name, location} cuisines is nested array inside object while cannot be hashed !
    const hashData = { id, name: data.name, location: data.location }
    // write restaurantKey:hashData in hashed format to redis, and returns a hashkey : number
    // we paralelly write new entry in our primary database as well in production
    const addResult = await client.hSet(restaurantKey, hashData)
    console.log(`added ${addResult} fields`)

    return successResponse(res, hashData, "added new restaurant")
  } catch (error) {
    // call the error handling middleware
    // tbh this is done automatically by express 5
    next(error)
  }
})

// GET restaurant 
// need to add a condition to check if the key really exists in the redis db
// otherwise redis doesn't throw any error, just returns empty object (creating a check restaurant id middleware to reduce duplication)
// adding types for restaurantId to the generic Request type
router.get("/:restaurantId", checkRestaurantExists ,async (req: Request<{ restaurantId: string }>, res: Response, next: NextFunction) => {
  const { restaurantId } = req.params
  // for express 5 I don't need to do try catch
  try {
    const client = await initializeRedisClient()
    const restaurantKey = restaurantKeyById(restaurantId)
    // we added viewCount property to our data object and set it to 1 
    // viewCount will be the newly incremented number 
    const [viewCount, restaurantData] = await Promise.all([client.hIncrBy(restaurantKey, "viewCount", 1),client.hGetAll(restaurantKey)])
    console.log(restaurantData)
    return successResponse(res,restaurantData)
  } catch (error) {
    next(error)
  }
})

export default router 