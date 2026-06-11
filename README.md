### Bites
- A platform for discovering restaurants based on ratings, cuisines
- implemented pagination for GET restaurants, GET reviews endpoint
- cached & optimized the GET /:restaurantId/weather endpoint, reduced latency from sub250ms to 20ms on average
- implementation validate() middleware to validate incoming data against strict pre-defined zod schemas.
- implemented early checks for endpoint with :restaurantId to check if the restaurants exists
- implemented standardized responses across all endpoints using successResponse() and errorResponse() helper functions
- implemented centralized error handling middleware()
- Built with Express5, Redis, Zod & Node.js. 

### Scope of Improvements
- structured unified logging
- api rate limiting
- dockerized deployment (still need to learn docker)

### Zod 
- zod is used for validating incoming data from users
- working
  - define zod schema 
  - infer object types from defined schema 
  - use parse() or safeParse() function
  - parse() throws errors if body is not  adhering to the defined schema 
  - safeParse() doesn't throw errors, it adds a {success: false} field and returns the issues
  - if passed, safeParse() or parse() simply return the data object
  - note : zod will by default allow extra fields in the body and strip them away when it returns back the validated data.
  - that means if I put location: "bangalore" extra field, success won't be false, just the final parsed object won't have location field in it.

<br>
  
  ```js
  import {z} from "zod"

  const userSchema = z.object({
    name: z.string().min(1),
    age: z.number().min(1).max(100)
  })

  type User = z.infer<typeof userSchema>
  
  const user:  User = {
    name: "yash",
    age: 21
  }
  
  const result = userSchema.safeParse(user)

  if(!result.success){
    console.log("bad request body")
    console.log(result.error.issues)
  }else{
    console.log(result.data)
  }
  
  ```
  
<br>
    
  - get detailed nested object of errors : result.error.issues 
  - safeParse() returns

<br>
    
  ```js
  {
    success:true,
    data: T 
  }

  or 

  {
    success: false,
    error: zodError 
  } 
  ```

  <br>

  - issue arrays lives inside the zodError. so error.issues is what's the meaning full data at.

### Redis 
- cache aside pattern 
- while reading - 1st read cache, if cache misses -> read from primary database.
- while writing - write to both cache with expiry and primary database asynchronously. 
- redis has multiple datastructures, few of them are 
  - redis string : a simple key:value pair 
  - redis list : a linked list of string with O(1) top and last retrieval, can be used as a normal array like datastructure with O(1) retrieval with indices. (0,1,2,3,4...)
  - redis json : to store json objects linked to a key
  - redis hash : to store hased flat objects, instead of storing user.name, user.email separarely, we hash the whole user object against a single key.
  - redis set : unordered collection of unique strings, can be used as indexed database.
  - redis sorted set : collection of unique strings stored in ascending order. can be used for leaderboards, recent ratings, recent data.
  - redis bloom filters : probabilitic data structure like set, used to test whether an element is a member or not, used to implement ultra quick "username is taken" checkes. can be used to avoid duplicacy of data and fast duplicacy checks. 

### Redis Server Setup 
- npm install redis : redis is client-side driver package and needs to connect with local or cloud redis server.
- redis connection string looks like : redis://default:<something>@<something>.io:13487 (taken from official redis cloud platform)
- by default local redis server serves on PORT 6379. 