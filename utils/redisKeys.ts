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

