import { ConvexHttpClient } from "convex/browser"
import { api } from "../_generated/api"
import * as readline from "node:readline"

const client = new ConvexHttpClient(process.env.CONVEX_URL || "http://127.0.0.1:3210")

// Helper to create a promise-based prompt
const promptUser = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      const proceed = answer.toLowerCase().startsWith("y")
      resolve(proceed)
    })
  })
}

export default async function globalSetup() {
  let shouldClearAndSeed = true // Default to true for non-interactive runs

  try{
    console.warn("\n⚠️  WARNING: Running integration tests will DELETE ALL DATA in your Convex database!")
    console.warn("Tests require specific data for assertions to work correctly.\n")
    
    const proceed = await promptUser("Do you want to proceed with deleting data? (y/N): ")
    console.log('')
    shouldClearAndSeed = proceed
  } catch (error) {
    console.error("Your inputs can't be read")
    throw error
  }
  
  try {
    if (shouldClearAndSeed) {
      await client.mutation(api.admin.clearAllData, {})
      await client.mutation(api.admin.seedTestData, {})
      console.log("Test data created (database cleared and seeded).")
    } else {
      console.log("Skipping data deletion and seeding—tests will run on existing database state.")
      console.warn("Note: Assertions may fail if the current data doesn't match expected test conditions.")
    }
  } catch (error) {
    console.error("Failed to set up test data:", error)
    throw error
  }

  // Return teardown function (always clear after tests to avoid leaving junk data)
  return async () => {
    try {
      if (shouldClearAndSeed) {
        await client.mutation(api.admin.clearAllData, {})
        console.log("Test data cleared.")
      }
    } catch (error) {
      console.error("Failed to clean up test data:", error)
      throw error
    }
  }
}
