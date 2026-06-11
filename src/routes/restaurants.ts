import express from "express"
import { validate } from "../middlewares/validate.js"
import { RestaurantSchema } from "../schemas/restaurant.js"
import type { Restaurant } from "../schemas/restaurant.js"
import { initializeRedisClient } from "../utils/redisClient.js"
import { cuisineKey, cuisinesKey, restaurantByRatingKey, restaurantKeyById, reviewDetailsKeyById, reviewKeyById } from "../utils/redisKeys.js"
import { nanoid } from "nanoid"
import { errorResponse, successResponse } from "../utils/responses.js"
import type { Request, Response, NextFunction } from "express"
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js"
import { ReviewSchema, type Review } from "../schemas/review.js"
import { restaurantCuisineKeyById } from "../utils/redisKeys.js"

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

router.get("/", async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query
  const start = (Number(page) - 1) * Number(limit)
  const end = start + Number(limit)

  const client = await initializeRedisClient()
  const restaurantIds = await client.zRange(restaurantByRatingKey, start, end, { REV : true })
  const restaurants = await Promise.all([
    restaurantIds.map((id)=> client.hGetAll(restaurantKeyById(id)))
  ])

  return successResponse(res,restaurants)
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

    // the data returns cuisines array that may have multiple strings inside it.
    // we want to execute set operations for each string inside that array.
    // Promise.all can run multiple async operations in parallel and you wait until all of them finish
    
    await Promise.all([
      ...data.cuisines.map((cuisine) => Promise.all([
        client.sAdd(cuisinesKey, cuisine),
        client.sAdd(cuisineKey(cuisine), id),
        client.sAdd(restaurantCuisineKeyById(id), cuisine),
        client.zAdd(restaurantByRatingKey, {
          score: 0,
          value: id
        })
      ]))
    ])

    client.hSet(restaurantKey, hashData)
    
    return successResponse(res, hashData, "added new restaurant")
  } catch (error) {
    // call the error handling middleware
    // tbh this is done automatically by express 5
    next(error)
  }
})

// get weather at particular restaurant 
// reduced latency from 256ms to 23ms on average
router.get("/:restaurantId/weather", checkRestaurantExists, async (req: Request<{restaurantId: string}>, res, next) => {
  const { restaurantId } = req.params;
  const client = await initializeRedisClient()
  const weatherKey = weatherKeyById(restaurantId)

  // getting from cache if exists 
  const cachedWeather = await client.get(weatherKey)
  if (cachedWeather) {
    console.log("Cache Hit")
    return successResponse(res, JSON.parse(cachedWeather)) 
  }
  
  const restaurantKey = restaurantCuisineKeyById(restaurantId)
  const coords = await client.hGet(restaurantKey, "location")
  if (!coords) {
    return errorResponse(res,404,"Couldn't find restaurant Location")
  }
  
  const [long, lat] = coords.split(",")
  const apiResponse = await fetch(`http://URL/${long}/${lat}`)

  // if fetched from api, store in redis & return the api response.
  if (apiResponse.status === 200) {
    const json = await apiResponse.json()
    await client.set(weatherKey, JSON.stringify(json), {
      EX: 60*60 // caching weather info for 1 hour, because it can obviously change within an hr.
    })
    return successResponse(res,json)
  }

  return errorResponse(res,500,"Couldn't fetch weather info")
})

// POST review
// while creating review, must check that restaurant exists and review schema is valid using our middlewares 
router.post("/:restaurantId/reviews", checkRestaurantExists, validate(ReviewSchema), async (req: Request<{ restaurantId: string }>, res, next) => {
  // all middlewares have early returns, so data here will be safe and validated.
  const { restaurantId } = req.params
  const data = req.body as Review
  try {
    const client = await initializeRedisClient()
    const reviewId = nanoid()
    const reviewKey = reviewKeyById(restaurantId)
    const reviewDetailsKey = reviewDetailsKeyById(reviewId)
    const reviewData = { id: reviewId, restaurantId, ...data, timestamp: Date.now() }
 
    // we have created 2 things here, list and  hash 
    // list bites:review:reviewId : only stores ( index:reviewId ) to fetch recent reviews 
    // hash bites:review_details:reviewId  : stores complete review ( reviewId: reviewDetails )
    // list : fast lookup recent reviewId, then fetch review details from hash using reviewId.
    const [reviewCount,setResult,totalStars] = await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
      // increasing total no of stars by adding rating from review (1-5)
      client.hIncrByFloat(restaurantKeyById(restaurantId),"totalStars",data.rating)
    ])

    const averageRating = Number((totalStars / reviewCount)).toFixed(1)
    await Promise.all([
      client.zAdd(restaurantByRatingKey, {
        score: averageRating,
        value: restaurantId
      }),
      client.hSet(restaurantKey,"avgStars", averageRating)
    ])
    return successResponse(res,reviewData, "review added successfully")
    
  } catch (error) {
    next(error)
  }
})

// GET all reviews in paginated view 
// fetch recent reviewId, map them with reviewDetails and return back nice reviewId:reviewDetails
router.get("/:restaurantId/reviews", checkRestaurantExists, async (req: Request<{ restaurantId: string }>, res: Response, next: NextFunction) => {
  const { restaurantId } = req.params
  // starts with page 1, 10 items per page
  // for getting page=2 we need to put that url call in the button in frontend  
  const { page = 1, limit = 10 } = req.query 
  const start = (Number(page) - 1) * Number(limit)
  const end = start + Number(limit) - 1 // because indexing started from zero

  try {
    const client = await initializeRedisClient()
    const reviewKey = reviewKeyById(restaurantId)
    // fetches a list 
    const reviewIds = await client.lRange(reviewKey, start, end)
    // converting each reviewId in the list to its own promise to fetch data from review_details set
    const reviews = await Promise.all(reviewIds.map(id => client.hGetAll(reviewDetailsKeyById(id))))

    return successResponse(res, reviews)
    
  } catch (error) {
    next(error)
  }
})

// DELETE /:restaurantId/reviews/:reviewId 
router.delete("/:restaurantId/reviews/:reviewId", checkRestaurantExists, async (req: Request<{ restaurantId: string, reviewId: string }>, res, next) => {
  const { restaurantId, reviewId } = req.params
  const client = await initializeRedisClient()
  const reviewKey = reviewKeyById(restaurantId)
  const reviewDetailsKey = reviewDetailsKeyById(reviewId)
  // first delete from hash
  const [removeResult, deleteResult] = await Promise.all([
    client.lRem(reviewKey, 0, reviewId),
    client.del(reviewDetailsKey),
   ])

  if (removeResult === 0 && deleteResult === 0) {
    return errorResponse(res,404,"review not found")
  }

  // sending back reviewId as data 
  return successResponse(res,reviewId,"review deleted successfully")
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

    // cuisines information 
    // we added viewCount property to our data object and set it to 1 
    // viewCount will be the newly incremented number 
    const [viewCount, restaurantData, cuisines] = await Promise.all([
      client.hIncrBy(restaurantKey, "viewCount", 1),
      client.hGetAll(restaurantKey),
      client.sMembers(restaurantCuisineKeyById(restaurantId))
    ])
    
    console.log(restaurantData)
    return successResponse(res, { ...restaurantData, cuisines })
    
  } catch (error) {
    next(error)
  }
})

// DELETE /restaurant/:id   
// implemented alone
router.delete("/:restaurantId", checkRestaurantExists, async (req, res, next) => {
  const { restaurantId } = req.params
  const client = await initializeRedisClient()
  // create key from restaurantId (restaurant:restaurantId)
  const restaurantKey = restaurantKeyById(restaurantId)
  // delete from redis using key, return 1 if success, 0 if key did not exist
  const result = await client.del(restaurantKey)
  if (!result) {
    return errorResponse(res,404,"restaurant doesn't exists")
  }
  console.log(`restaurant : ${restaurantKey} deleted successfully`)
  return successResponse(res,"restaurant deleted successfully")
})

export default router 
