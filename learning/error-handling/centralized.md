### centralized error handling using special middleware

- middleware follows strict sequence based on their order of registration with app instance.
- next() function moves to the next middleware  
- next(err) skips to nearest error handling middleware 
- express identifies error handling middleware based on function signature 

```js
function normalMiddleware(req,res,next){
  // code
}

function errorHandlingMiddleware(err,req,res,next){
  // code
}
```

### all truthy values passed to the next callback invokes error handling middleware
- next("something") 
- next(new Error("something broke"))
- next(404)
<br>
- falsey values don't invoke specialized error handling middleware
- next(0), next(null), next(false), next() 

### by conventions we should always pass an error object to the next() callback if an error occurs.
- next(err) : gives access to stack trace, message, and we can add custom properties for extra logging etc
- stack trace tells us where the error actually happened. 

### where do we register the error handling middleware ? 
- at the very end before app.listen() 
- app.use(router1) 
- app.use(router2)
- app.use(router3)
- ...
- app.use((err, req,res,next)=>{}) : in this way, this middleware acts as a safety net for any errors thrown by any route handler

### when does this type of centralized error handling works ?
- this only works when we bubble the errors from services and repository functions upto the handler. 
- for example 

```js
// repository layer 
const getUserById = async (id:number) =>{
  try{
    const user = await db.query(...)
  }catch(err){
    // attach context to the error object
    console.log("ERROR:"err.message)
    err.errorType = "failed to get users by id"
    throw err // bubble up the error to service layer
  }
}

// service layer
const fetchUser = async(id:number) =>{
  try{
    return await getUserById(id)
  }catch(err){
    throw err // bubble up the error to the handler layer.
  }
} 

// handler layer 
app.get("/users/:id",async (req,res,next)=>{
  const userId = req.params.id
  if(!userId){
    return AppError("user id required",400)
  }

  // finally catch and resolve the errors here.
  try{
    const user = await fetchUser(id)
    res.json(user)
  }catch(err){
    next(err)
  }
})
```

<br>
### catchAsync pattern 
- catch async pattern is a dedicated function that takes the wraps the route handler
- I saw the code, and it genuinely sucks. 

```js
// before catchAsync 
app.get("/users/:id",async(req,res,next)=>{
  const userId = req.params.id 
  
  try{
    const user = await fetchUser(id)
    res.json(user)
  }catch(err){
    next(err)
  }
})

// after catchAsync 
app.get("/users/:id", catchAsync(async (req,res,next)=>{
  const userId = req.params.id
  const user = await fetchUser(userId)
  res.json(user)
}))
// catchAsync function 

function catchAsync(fn){
  return function(req,res,next){
    fn(req,res,next).catch(next)
  }
}

```

### express 5
- automatically calls the error handling middleware with (err,req,res,next) signature with next(err)
- express 4 needs catchAsync pattern

### handling process level errors 
- uncaughtExceptions :
```js

process.on("uncaughtException", (err)=>{
  console.log("Uncaught exception occured", err)
  process.exit(1) // clean up resources
})
````
- unhandledRejection : 
```js

process.on("unhandledRejection", (err)=>{
  console.log("Unhandled Rejection Occured", err)
  process.exit(1) // clean up resources
})
````

- database connection error handling 
```js

db.connect()
  .then(()=>{
  app.listen(PORT,()=>{
    console.log("server listening on port {PORT}")
  })
  .catch((err)=>{
    console.log("database connection failed")
    process.exit(1)
  })
})

```


### Standardized Responses for all routes 
- while working with a frontend, if each route sends back a different json response, it gets pretty annoying and tedious. 
- to solve this problem we create standard response model 
```json

{
  "success":true,
  "data":[] or {},
  "message":"meaningful message here"
}

or 

{
  "success":false,
  "error" : "something went wrong."
}
```

### catch all middleware to handle 404,
- currently express returns a 404 HTML page when a route that is not available is called 
- but while working with frontend, we need json response right ?
- so we create a catch all / wildcard middleware 
```js
app.use((err,req,res,next)=>{
  next(new AppError(`cannot ${req.method}` ${req.path}, 404))
})

```
- this AppError is caught by the final error handling middleware. 

### final error handling middleware 
```js
app.use((err,req,res,next)=>{
  res.status(res.statusCode || 500)
    .json({
      success: false,
      error: err,
      message: err.message
    })
})
```

