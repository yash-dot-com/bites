import express from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantSchema } from "../schemas/restaurant.js"
import type { Restaurant } from "../schemas/restaurant.js"

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
  console.log(data)
  return res.status(200).json({
    success: true,
    message: "restaurant created successfully",
    data,
  })
})



export default router 