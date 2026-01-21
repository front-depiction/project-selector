/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"

test("users: storeUser creates new user on first call", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Mock auth identity - returns a new test context with identity
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "user@example.com",
    name: "Test User"
  })

  const userId = await authenticatedT.mutation(api.users.storeUser, {})

  expect(userId).toBeDefined()

  const user = await authenticatedT.query(api.users.getMe, {})
  expect(user).toBeDefined()
  expect(user?._id).toBe(userId)
  expect(user?.email).toBe("user@example.com")
  expect(user?.name).toBe("Test User")
  expect(user?.lastLoginAt).toBeDefined()

  vi.useRealTimers()
})

test("users: storeUser updates existing user on subsequent calls", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Set identity - returns a new test context
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "user@example.com",
    name: "Test User"
  })

  const userId1 = await authenticatedT.mutation(api.users.storeUser, {})
  const initialLoginTime = (await authenticatedT.query(api.users.getMe, {}))?.lastLoginAt

  // Wait a bit and call again
  await new Promise(resolve => setTimeout(resolve, 100))
  
  const userId2 = await authenticatedT.mutation(api.users.storeUser, {})

  expect(userId1).toBe(userId2) // Same user ID

  const user = await authenticatedT.query(api.users.getMe, {})
  expect(user?.lastLoginAt).toBeGreaterThan(initialLoginTime!) // Updated login time

  vi.useRealTimers()
})

test("users: storeUser throws error when not authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // No identity set
  await expect(
    t.mutation(api.users.storeUser, {})
  ).rejects.toThrow("Not authenticated")

  vi.useRealTimers()
})

test("users: getMe returns null when not authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const user = await t.query(api.users.getMe, {})

  expect(user).toBeNull()

  vi.useRealTimers()
})

test("users: getMe returns current user when authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Set identity - returns a new test context
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "user@example.com",
    name: "Test User"
  })

  await authenticatedT.mutation(api.users.storeUser, {})

  const user = await authenticatedT.query(api.users.getMe, {})

  expect(user).toBeDefined()
  expect(user?.email).toBe("user@example.com")
  expect(user?.name).toBe("Test User")

  vi.useRealTimers()
})

test("users: getAllUsers returns empty array when not authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const users = await t.query(api.users.getAllUsers, {})

  expect(users).toEqual([])

  vi.useRealTimers()
})

test("users: getAllUsers returns all users when authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Create first user
  const asUser1 = t.withIdentity({
    subject: "auth0|user1",
    email: "user1@example.com",
    name: "User One"
  })
  await asUser1.mutation(api.users.storeUser, {})

  // Create second user with different identity
  const asUser2 = t.withIdentity({
    subject: "auth0|user2",
    email: "user2@example.com",
    name: "User Two"
  })
  await asUser2.mutation(api.users.storeUser, {})

  // Query as second user
  const users = await asUser2.query(api.users.getAllUsers, {})

  expect(users.length).toBe(2)
  const emails = users.map(u => u.email).sort()
  expect(emails).toContain("user1@example.com")
  expect(emails).toContain("user2@example.com")

  vi.useRealTimers()
})

test("users: getUserByEmail returns null when not authenticated", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  const user = await t.query(api.users.getUserByEmail, {})

  expect(user).toBeNull()

  vi.useRealTimers()
})

test("users: getUserByEmail returns user by email", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Set identity - returns a new test context
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "user@example.com",
    name: "Test User"
  })

  await authenticatedT.mutation(api.users.storeUser, {})

  const user = await authenticatedT.query(api.users.getUserByEmail, {})

  expect(user).toBeDefined()
  expect(user?.email).toBe("user@example.com")

  vi.useRealTimers()
})

test("users: getUserByEmail is case insensitive", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Set identity and create user
  const authenticatedT1 = t.withIdentity({
    subject: "auth0|123456",
    email: "User@Example.com",
    name: "Test User"
  })

  await authenticatedT1.mutation(api.users.storeUser, {})

  // Query with different case (same identity, different email case)
  const authenticatedT2 = t.withIdentity({
    subject: "auth0|123456",
    email: "user@example.com", // lowercase
    name: "Test User"
  })

  const user = await authenticatedT2.query(api.users.getUserByEmail, {})

  expect(user).toBeDefined()
  expect(user?.email.toLowerCase()).toBe("user@example.com")

  vi.useRealTimers()
})

test("users: storeUser handles missing email gracefully", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Set identity - returns a new test context
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: undefined,
    name: "Test User"
  })

  const userId = await authenticatedT.mutation(api.users.storeUser, {})

  expect(userId).toBeDefined()

  const user = await authenticatedT.query(api.users.getMe, {})
  expect(user?.email).toBe("")

  vi.useRealTimers()
})

test("users: integration - complete user lifecycle", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, import.meta.glob("./**/*.*s"))

  // Initial state - no user (no identity set)
  expect(await t.query(api.users.getMe, {})).toBeNull()

  // Create user - set identity first (returns new context)
  const authenticatedT = t.withIdentity({
    subject: "auth0|123456",
    email: "newuser@example.com",
    name: "New User"
  })

  const userId = await authenticatedT.mutation(api.users.storeUser, {})

  // Verify user exists
  let user = await authenticatedT.query(api.users.getMe, {})
  expect(user?._id).toBe(userId)
  expect(user?.email).toBe("newuser@example.com")

  // Update user (simulate login again)
  await authenticatedT.mutation(api.users.storeUser, {})

  // Verify lastLoginAt was updated
  const updatedUser = await authenticatedT.query(api.users.getMe, {})
  expect(updatedUser?.lastLoginAt).toBeGreaterThan(user?.lastLoginAt!)

  vi.useRealTimers()
})
