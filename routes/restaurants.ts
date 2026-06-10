import express from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantSchema } from "../schemas/restaurant.js"
import type { Restaurant } from "../schemas/restaurant.js"
import { initializeRedisClient } from "../utils/redisClient.js"

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
router.post("/", validate(RestaurantSchema), async (req, res) => {
  const data = req.body as Restaurant
  const client = await initializeRedisClient();
  
  console.log(data)
  return res.status(200).json({
    success: true,
    message: "restaurant created successfully",
    data,
  })
})

export default router 