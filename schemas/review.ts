import { z } from "zod";

// min and max in zod, both are inclusive 
// min = gte : greater than equal 
// max = lte : less than equal 

export const ReviewSchema = z.object({
  review: z.string().min(1),
  rating: z.number().min(1).max(5)
})

export type Review = z.infer<typeof ReviewSchema>

// using this in middleware. 