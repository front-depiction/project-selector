/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi, describe } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

describe("User Management", () => {
  test("getOrCreateUser: creates new user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const userId = await t.withIdentity({ subject: "clerk_test_user_123" }, async () => {
      return await t.mutation(api.users.getOrCreateUser, {
        clerkUserId: "clerk_test_user_123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
      })
    })
    
    expect(userId).toBeDefined()
    
    // Verify user was created
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_test_user_123" 
    })
    
    expect(user).toBeDefined()
    expect(user?.email).toBe("test@example.com")
    expect(user?.firstName).toBe("Test")
    expect(user?.lastName).toBe("User")
    expect(user?.role).toBe("student")
    expect(user?.clerkUserId).toBe("clerk_test_user_123")
    expect(user?.studentId).toBeUndefined()
    
    vi.useRealTimers()
  })

  test("getOrCreateUser: updates existing user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    await t.withIdentity({ subject: "clerk_test_user_456" }, async () => {
      // Create initial user
      await t.mutation(api.users.getOrCreateUser, {
        clerkUserId: "clerk_test_user_456",
        email: "old@example.com",
        firstName: "Old",
        lastName: "Name",
      })
      
      // Update user with new info
      await t.mutation(api.users.getOrCreateUser, {
        clerkUserId: "clerk_test_user_456",
        email: "new@example.com",
        firstName: "New",
        lastName: "Name",
      })
    })
    
    // Verify update
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_test_user_456" 
    })
    
    expect(user).toBeDefined()
    expect(user?.email).toBe("new@example.com")
    expect(user?.firstName).toBe("New")
    expect(user?.lastName).toBe("Name")
    
    vi.useRealTimers()
  })

  test("getOrCreateUser: requires authentication", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Try without authentication
    await expect(
      t.mutation(api.users.getOrCreateUser, {
        clerkUserId: "clerk_test_user_789",
        email: "test@example.com",
      })
    ).rejects.toThrow("Not authenticated")
    
    vi.useRealTimers()
  })

  test("syncUserFromWebhook: creates new user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const userId = await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_webhook_user_1",
      email: "webhook@example.com",
      firstName: "Webhook",
      lastName: "User",
    })
    
    expect(userId).toBeDefined()
    
    // Verify user was created
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_webhook_user_1" 
    })
    
    expect(user).toBeDefined()
    expect(user?.email).toBe("webhook@example.com")
    expect(user?.firstName).toBe("Webhook")
    expect(user?.lastName).toBe("User")
    expect(user?.role).toBe("student")
    
    vi.useRealTimers()
  })

  test("syncUserFromWebhook: updates existing user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create initial user
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_webhook_user_2",
      email: "old@example.com",
      firstName: "Old",
    })
    
    // Update via webhook
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_webhook_user_2",
      email: "updated@example.com",
      firstName: "Updated",
      lastName: "NewLast",
    })
    
    // Verify update
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_webhook_user_2" 
    })
    
    expect(user?.email).toBe("updated@example.com")
    expect(user?.firstName).toBe("Updated")
    expect(user?.lastName).toBe("NewLast")
    
    vi.useRealTimers()
  })

  test("updateStudentId: links student ID to user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create user first
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_student_1",
      email: "student@example.com",
    })
    
    // Update student ID
    await t.mutation(api.users.updateStudentId, {
      clerkUserId: "clerk_student_1",
      studentId: "STU001",
    })
    
    // Verify student ID was set
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_student_1" 
    })
    
    expect(user?.studentId).toBe("STU001")
    
    vi.useRealTimers()
  })

  test("updateStudentId: prevents duplicate student IDs", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create two users
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_student_2",
      email: "student2@example.com",
    })
    
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_student_3",
      email: "student3@example.com",
    })
    
    // Assign student ID to first user
    await t.mutation(api.users.updateStudentId, {
      clerkUserId: "clerk_student_2",
      studentId: "STU002",
    })
    
    // Try to assign same student ID to second user - should fail
    await expect(
      t.mutation(api.users.updateStudentId, {
        clerkUserId: "clerk_student_3",
        studentId: "STU002",
      })
    ).rejects.toThrow("Student ID already taken")
    
    vi.useRealTimers()
  })

  test("updateStudentId: throws error for non-existent user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    await expect(
      t.mutation(api.users.updateStudentId, {
        clerkUserId: "clerk_nonexistent",
        studentId: "STU999",
      })
    ).rejects.toThrow("User not found")
    
    vi.useRealTimers()
  })

  test("getUserByClerkId: returns user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create user
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_query_test_1",
      email: "query@example.com",
      firstName: "Query",
    })
    
    // Query by Clerk ID
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_query_test_1" 
    })
    
    expect(user).toBeDefined()
    expect(user?.email).toBe("query@example.com")
    expect(user?.firstName).toBe("Query")
    
    vi.useRealTimers()
  })

  test("getUserByClerkId: returns null for non-existent user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const user = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_nonexistent" 
    })
    
    expect(user).toBeNull()
    
    vi.useRealTimers()
  })

  test("getUserByStudentId: returns user by student ID", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create user with student ID
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_student_query_1",
      email: "student@example.com",
    })
    
    await t.mutation(api.users.updateStudentId, {
      clerkUserId: "clerk_student_query_1",
      studentId: "STU100",
    })
    
    // Query by student ID
    const user = await t.query(api.users.getUserByStudentId, { 
      studentId: "STU100" 
    })
    
    expect(user).toBeDefined()
    expect(user?.studentId).toBe("STU100")
    expect(user?.email).toBe("student@example.com")
    
    vi.useRealTimers()
  })

  test("getUserByStudentId: returns null for non-existent student ID", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    const user = await t.query(api.users.getUserByStudentId, { 
      studentId: "NONEXISTENT" 
    })
    
    expect(user).toBeNull()
    
    vi.useRealTimers()
  })

  test("getCurrentUser: returns authenticated user", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Create user
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_current_user",
      email: "current@example.com",
    })
    
    // Set identity and get current user
    const user = await t.withIdentity({ subject: "clerk_current_user" }, async () => {
      return await t.query(api.users.getCurrentUser, {})
    })
    
    expect(user).toBeDefined()
    expect(user?.clerkUserId).toBe("clerk_current_user")
    expect(user?.email).toBe("current@example.com")
    
    vi.useRealTimers()
  })

  test("user workflow: complete user journey", async () => {
    vi.useFakeTimers()
    const t = convexTest(schema, import.meta.glob("./**/*.*s"))
    
    // Step 1: User signs up (webhook creates user)
    await t.mutation(api.users.syncUserFromWebhook, {
      clerkUserId: "clerk_journey_user",
      email: "journey@example.com",
      firstName: "Journey",
      lastName: "Test",
    })
    
    // Step 2: User authenticates and gets or creates user record
    const userId = await t.withIdentity({ subject: "clerk_journey_user" }, async () => {
      return await t.mutation(api.users.getOrCreateUser, {
        clerkUserId: "clerk_journey_user",
        email: "journey@example.com",
        firstName: "Journey",
        lastName: "Test",
      })
    })
    
    expect(userId).toBeDefined()
    
    // Step 3: User enters student ID
    await t.mutation(api.users.updateStudentId, {
      clerkUserId: "clerk_journey_user",
      studentId: "STU200",
    })
    
    // Step 4: Verify complete user record
    const finalUser = await t.query(api.users.getUserByClerkId, { 
      clerkUserId: "clerk_journey_user" 
    })
    
    expect(finalUser?.clerkUserId).toBe("clerk_journey_user")
    expect(finalUser?.email).toBe("journey@example.com")
    expect(finalUser?.firstName).toBe("Journey")
    expect(finalUser?.lastName).toBe("Test")
    expect(finalUser?.studentId).toBe("STU200")
    expect(finalUser?.role).toBe("student")
    
    // Step 5: Query by student ID
    const userByStudentId = await t.query(api.users.getUserByStudentId, { 
      studentId: "STU200" 
    })
    
    expect(userByStudentId?._id).toEqual(finalUser?._id)
    
    vi.useRealTimers()
  })
})

