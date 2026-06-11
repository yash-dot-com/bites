// creating keys for access key:value pairs from redis 

// format for keys: (for separating namespaces, allows to avoid conflict if we are using multiple redis services or microservice architecture )
// bites:restaurant:restaurantId - bites project, restaurant object and its ID 

// helper function add prefixes and help with key generation 
// getKeyName("restaurant",1234) => bites:restaurant:1234
export function getKeyName(...args: string[]) {
  return `bites:${args.join(":")}`
}

// helper function to create key with restaurant id
export const restaurantKeyById = (id: string) => getKeyName("restaurant", id)
// bites:restaurant:restaurantId

// helper function to create key with review id 
export const reviewKeyById = (id: string) => getKeyName("review", id)
// bites:review:restaurantId

export const reviewDetailsKeyById = (id: string) => getKeyName("review_detail", id)
// bites:review_detail:reviewId ? 

// SETS 
// cuisines set for storing all the cuisines (italian, mexican, indian, spanish, chinese) etc 
export const cuisinesKey = getKeyName("cuisines")
// cusine is the set of a specific cuisine and all the restaurants that serves it.
export const cuisineKey = (name: string) => getKeyName("cuisine", name)
// restautantCuisines is the set for each restaurant to store all the avaiable cuisins in it
export const restaurantCuisineKeyById = (id: string) => getKeyName("restaurant_cuisines", id)

// sorted sets
// need to add restaurants with zero rating whenever new one added
export const restaurantByRatingKey = getKeyName("restaurants_by_rating")

export const weatherKeyById = (id: string) => getKeyName("weather",id)