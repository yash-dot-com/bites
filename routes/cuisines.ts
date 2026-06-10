import express from "express"
import { initializeRedisClient } from "../utils/redisClient.js"
import { successResponse } from "../utils/responses.js"
import { cuisineKey, cuisinesKey, restaurantKeyById } from "../utils/redisKeys.js"

const router = express.Router()

// Get list of all unique cuisines from all available restaurants 
router.get("/", async (req, res, next) => {
  const client = await initializeRedisClient()
  const cuisines = await client.sMembers(cuisinesKey)
  return successResponse(res,cuisines)
})

// Get all restaurant names for a specific cuisines
router.get("/:cuisine", async (req, res, next) => {
  const { cuisine } = req.params
  try {
    const client = await initializeRedisClient()
    const restaurantIds = await client.sMembers(cuisineKey(cuisine))
    // now get name of all restaurants using their Id
    const restaurants = await Promise.all(restaurantIds.map((id) => client.hGet(restaurantKeyById(id), "name")))
    return successResponse(res, restaurants)
    
  } catch (error) {
    next(error)
  }
})

export default router 