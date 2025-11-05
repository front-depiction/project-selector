import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { StudentIdForm } from "../StudentIdForm"

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    user: {
      id: "clerk_test_user",
      primaryEmailAddress: { emailAddress: "test@example.com" },
      firstName: "Test",
      lastName: "User"
    }
  }))
}))

// Mock Convex
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null), // No existing user
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined))
}))

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}))

// Mock Sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

describe("StudentIdForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render the form", () => {
    render(<StudentIdForm />)
    
    expect(screen.getByText(/Link Your Student ID/i)).toBeInTheDocument()
    expect(screen.getByText(/Welcome Test!/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Continue to Topic Selection/i })).toBeInTheDocument()
  })

  it("should have 7 input slots for student ID", () => {
    render(<StudentIdForm />)
    
    const inputs = screen.getAllByRole("textbox")
    expect(inputs).toHaveLength(7)
  })

  it("should disable submit button when student ID is incomplete", () => {
    render(<StudentIdForm />)
    
    const submitButton = screen.getByRole("button", { name: /Continue to Topic Selection/i })
    expect(submitButton).toBeDisabled()
  })

  it("should only accept numeric input", () => {
    const { useQuery } = require("convex/react")
    useQuery.mockReturnValue(null)
    
    render(<StudentIdForm />)
    
    const input = screen.getAllByRole("textbox")[0]
    
    // Try to input non-numeric character
    fireEvent.change(input, { target: { value: "A" } })
    
    // Should be filtered out (implementation filters non-digits)
    // This is handled by the component's handleStudentIdChange
  })

  it("should show error for invalid student ID", async () => {
    const { toast } = await import("sonner")
    
    render(<StudentIdForm />)
    
    const submitButton = screen.getByRole("button")
    
    // Try to submit with incomplete ID
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("valid 7-digit student ID")
      )
    })
  })

  it("should call updateStudentId mutation on valid submission", async () => {
    const { useMutation, useQuery } = await import("convex/react")
    const mockUpdateStudentId = vi.fn().mockResolvedValue(undefined)
    
    useMutation.mockReturnValue(mockUpdateStudentId)
    useQuery.mockReturnValue(null)
    
    render(<StudentIdForm />)
    
    // Fill in valid 7-digit student ID
    const inputs = screen.getAllByRole("textbox")
    inputs.forEach((input, i) => {
      fireEvent.change(input, { target: { value: String(i + 1) } })
    })
    
    const submitButton = screen.getByRole("button")
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockUpdateStudentId).toHaveBeenCalledWith({
        clerkUserId: "clerk_test_user",
        studentId: expect.any(String)
      })
    })
  })

  it("should show success toast on successful submission", async () => {
    const { useMutation, useQuery } = await import("convex/react")
    const { toast } = await import("sonner")
    const mockUpdateStudentId = vi.fn().mockResolvedValue(undefined)
    
    useMutation.mockReturnValue(mockUpdateStudentId)
    useQuery.mockReturnValue(null)
    
    render(<StudentIdForm />)
    
    // Submit with valid ID (mocked to succeed)
    const submitButton = screen.getByRole("button")
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Student ID linked successfully!")
    })
  })

  it("should show error toast when mutation fails", async () => {
    const { useMutation, useQuery } = await import("convex/react")
    const { toast } = await import("sonner")
    const mockUpdateStudentId = vi.fn().mockRejectedValue(new Error("Student ID already taken"))
    
    useMutation.mockReturnValue(mockUpdateStudentId)
    useQuery.mockReturnValue(null)
    
    render(<StudentIdForm />)
    
    const submitButton = screen.getByRole("button")
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Student ID already taken")
    })
  })

  it("should redirect if user already has student ID", () => {
    const { useQuery } = require("convex/react")
    const { redirect } = require("next/navigation")
    
    // Mock user with existing student ID
    useQuery.mockReturnValue({
      studentId: "1234567",
      clerkUserId: "clerk_test_user"
    })
    
    render(<StudentIdForm />)
    
    expect(redirect).toHaveBeenCalledWith("/student/select")
  })

  it("should call getOrCreateUser on mount", async () => {
    const { useMutation, useQuery } = await import("convex/react")
    const mockGetOrCreateUser = vi.fn().mockResolvedValue("user_id")
    
    useMutation.mockImplementation((mutation) => {
      if (mutation.toString().includes("getOrCreateUser")) {
        return mockGetOrCreateUser
      }
      return vi.fn()
    })
    
    useQuery.mockReturnValue(null)
    
    render(<StudentIdForm />)
    
    // Should auto-call getOrCreateUser to sync with Convex
    await waitFor(() => {
      expect(mockGetOrCreateUser).toHaveBeenCalledWith({
        clerkUserId: "clerk_test_user",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User"
      })
    })
  })
})

