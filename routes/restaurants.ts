import express from "express"

const router = express.Router()

// GET /restaurants 
router.get("/", async (req, res) => {
  return res.status(200).json({
    message: "hello world"
  })
})


export default router 