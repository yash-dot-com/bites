import { z } from "zod";

// for creating new restaurant 
export const RestaurantSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  cuisines: z.array(z.string().min(1)).min(1)
}) 

// restaurant details schema
export const RestaurantDetails = z.object({
  links: z.array(z.object({
    name: z.string().min(1),
    url: z.url().min(1),
  })),
  contact: z.object({
    phone: z.string().min(1),
    email: z.email()
  })
})

// note 
// z.string().url() works in zod3
// z.url() from zod4
// similar for email()

// export types for restaurant schema and restaurant details schema 
// we infered traditional typescript types from already existing zod schema, instead of writing it manually again.
export type Restaurant = z.infer<typeof RestaurantSchema>
export type RestaurantDetails = z.infer<typeof RestaurantDetails>
