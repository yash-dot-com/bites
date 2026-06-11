// redis client code here 
import { createClient, type RedisClientType } from "redis";

// initially no connection therefore null 
let client: RedisClientType | null = null;

// singleton pattern, setup client once for whole lifetime of the server
export async function initializeRedisClient() {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL
    })
    // in case of error
    client.on("error", (err) => {
      console.error(err)
    })

    // in case of successful connection
    client.on("connect", () => {
      console.log("Redis Connected")
    })

    await client.connect()
  }
  // client exists 
  return client;
}