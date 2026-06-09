import express from "express"
import dotenv from "dotenv"
import cuisinesRouter from "./routes/cuisines.js"
import restaurantsRouter from "./routes/restaurants.js"
import { errorHandler } from "./middlewares/errorHandler.js"

dotenv.config({
  path: ".env"
})

const PORT = process.env.PORT || 3000

const app = express()
app.use(express.json())
app.use("/cuisines", cuisinesRouter)
app.use("/restaurants", restaurantsRouter)


// error handler at last so all routes can have access to it.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`)
}).on(`error`, (error) => {
  throw new Error(error.message)
})

