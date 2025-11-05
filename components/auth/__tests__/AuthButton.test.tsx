import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AuthButton } from "../AuthButton"

// Mock Clerk
const mockUseUser = vi.fn()

vi.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-in-button">{children}</div>,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-out-button">{children}</div>
}))

describe("AuthButton", () => {
  it("should show loading state when not loaded", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false
    })
    
    render(<AuthButton />)
    
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(button.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("should show sign in button when not authenticated", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true
    })
    
    render(<AuthButton />)
    
    expect(screen.getByText("Sign In")).toBeInTheDocument()
    expect(screen.getByTestId("sign-in-button")).toBeInTheDocument()
  })

  it("should show sign out button when authenticated", () => {
    mockUseUser.mockReturnValue({
      user: {
        firstName: "John",
        emailAddresses: [{ emailAddress: "john@example.com" }]
      },
      isLoaded: true
    })
    
    render(<AuthButton />)
    
    expect(screen.getByText("John")).toBeInTheDocument()
    expect(screen.getByText("Sign Out")).toBeInTheDocument()
    expect(screen.getByTestId("sign-out-button")).toBeInTheDocument()
  })

  it("should show email when firstName is not available", () => {
    mockUseUser.mockReturnValue({
      user: {
        firstName: null,
        emailAddresses: [{ emailAddress: "test@example.com" }]
      },
      isLoaded: true
    })
    
    render(<AuthButton />)
    
    expect(screen.getByText("test@example.com")).toBeInTheDocument()
  })

  it("should display user name for authenticated users", () => {
    mockUseUser.mockReturnValue({
      user: {
        firstName: "Jane",
        emailAddresses: [{ emailAddress: "jane@example.com" }]
      },
      isLoaded: true
    })
    
    render(<AuthButton />)
    
    // Should show first name, not email
    expect(screen.getByText("Jane")).toBeInTheDocument()
    expect(screen.queryByText("jane@example.com")).not.toBeInTheDocument()
  })
})

