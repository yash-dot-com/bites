// creating keys for access key:value pairs from redis 

// format for keys: (for separating namespaces, allows to avoid conflict if we are using multiple redis services or microservice architecture )
// bites:restaurant:restaurantId - bites project, restaurant object and its ID 

// helper function add prefixes and help with key generation 
export function getKeyName(...args: string[]) {
  return `bites:${args.join(":")}`
}

// getKeyName("restaurant",1234) => bites:restaurant:1234