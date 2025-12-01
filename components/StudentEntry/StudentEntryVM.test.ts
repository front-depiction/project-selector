import { describe, it, expect, beforeEach, vi } from "vitest"
import { signal } from "@preact/signals-react"
import { useStudentEntryVM } from "./StudentEntryVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * This tests the StudentEntryVM which manages student ID entry:
 * - Input validation (only digits)
 * - Completion detection (length check)
 * - Digit slot states
 * - Navigation logic
 */

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
})

describe("StudentEntryVM", () => {
  let onCompleteMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorageMock.clear()
    onCompleteMock = vi.fn()
  })

  describe("value$ signal", () => {
    it("should start with empty value", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.value$.value).toBe("")
    })

    it("should update value when setValue is called", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1234567")

      expect(vm.value$.value).toBe("1234567")
    })

    it("should filter out non-digit characters", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12abc34")

      expect(vm.value$.value).toBe("1234")
    })

    it("should handle mixed alphanumeric input", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("a1b2c3d4")

      expect(vm.value$.value).toBe("1234")
    })

    it("should limit input to 7 digits", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345678910")

      expect(vm.value$.value).toBe("1234567")
      expect(vm.value$.value.length).toBe(7)
    })
  })

  describe("isComplete$ computed", () => {
    it("should be false when value is empty", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be false when value has less than 7 digits", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123456")

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be true when value has exactly 7 digits", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1234567")

      expect(vm.isComplete$.value).toBe(true)
    })

    it("should update reactively when value changes", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.isComplete$.value).toBe(false)

      vm.setValue("123")
      expect(vm.isComplete$.value).toBe(false)

      vm.setValue("1234567")
      expect(vm.isComplete$.value).toBe(true)
    })
  })

  describe("digitSlots$ computed", () => {
    it("should return 7 digit slots", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.digitSlots$.value

      expect(slots).toHaveLength(7)
    })

    it("should have correct indices", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.digitSlots$.value

      slots.forEach((slot, i) => {
        expect(slot.index).toBe(i)
      })
    })

    it("should have unique keys", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.digitSlots$.value
      const keys = slots.map((s) => s.key)
      const uniqueKeys = new Set(keys)

      expect(uniqueKeys.size).toBe(7)
    })

    it("should have predictable key format", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.digitSlots$.value

      slots.forEach((slot, i) => {
        expect(slot.key).toBe(`digit-${i}`)
      })
    })
  })

  describe("errorMessage$ signal", () => {
    it("should start with no error", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.errorMessage$.value).toBeNull()
    })

    it("should show error when input exceeds 7 digits", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345678")

      expect(vm.errorMessage$.value).toBe("Student ID must be exactly 7 digits")
    })

    it("should clear error when input is valid", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345678") // Error
      expect(vm.errorMessage$.value).not.toBeNull()

      vm.setValue("123456") // Valid (incomplete but not over limit)
      expect(vm.errorMessage$.value).toBeNull()
    })

    it("should show error when handleDigitInput receives non-digits", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("abc")

      expect(vm.errorMessage$.value).toBe("Only digits (0-9) are allowed")
    })

    it("should clear error after handleBackspace", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345678") // Error
      expect(vm.errorMessage$.value).not.toBeNull()

      vm.handleBackspace()
      expect(vm.errorMessage$.value).toBeNull()
    })
  })

  describe("handleDigitInput action", () => {
    it("should accept digit input", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("123")

      expect(vm.value$.value).toBe("123")
      expect(vm.errorMessage$.value).toBeNull()
    })

    it("should reject non-digit input", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("abc")

      expect(vm.value$.value).toBe("")
      expect(vm.errorMessage$.value).toBe("Only digits (0-9) are allowed")
    })

    it("should reject mixed input with letters", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("123abc")

      expect(vm.value$.value).toBe("")
      expect(vm.errorMessage$.value).toBe("Only digits (0-9) are allowed")
    })

    it("should allow empty input", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123")
      vm.handleDigitInput("")

      expect(vm.value$.value).toBe("")
      expect(vm.errorMessage$.value).toBeNull()
    })

    it("should auto-complete when 7 digits entered", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("1234567")

      expect(vm.value$.value).toBe("1234567")
      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
      expect(localStorageMock.getItem("studentId")).toBe("1234567")
    })
  })

  describe("handleBackspace action", () => {
    it("should remove last digit", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345")
      vm.handleBackspace()

      expect(vm.value$.value).toBe("1234")
    })

    it("should do nothing when value is empty", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleBackspace()

      expect(vm.value$.value).toBe("")
    })

    it("should clear error message", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345678") // Triggers error
      expect(vm.errorMessage$.value).not.toBeNull()

      vm.handleBackspace()

      expect(vm.errorMessage$.value).toBeNull()
    })

    it("should work multiple times", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("1234")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("123")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("12")
    })

    it("should handle backspace until empty", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("1")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("")
    })
  })

  describe("handleComplete action", () => {
    it("should save to localStorage when complete", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1234567")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBe("1234567")
    })

    it("should call onComplete callback with student ID", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      // setValue with 7 digits triggers auto-complete (1st call)
      vm.setValue("1234567")
      expect(onCompleteMock).toHaveBeenCalledTimes(1)

      // Calling handleComplete explicitly triggers it again (2nd call)
      vm.handleComplete()

      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
      expect(onCompleteMock).toHaveBeenCalledTimes(2)
    })

    it("should not complete when length is less than 7", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123456")
      vm.handleComplete()

      expect(vm.errorMessage$.value).toBe("Student ID must be exactly 7 digits")
      expect(onCompleteMock).not.toHaveBeenCalled()
      expect(localStorageMock.getItem("studentId")).toBeNull()
    })

    it("should not complete when value is empty", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleComplete()

      expect(vm.errorMessage$.value).toBe("Student ID must be exactly 7 digits")
      expect(onCompleteMock).not.toHaveBeenCalled()
    })

    it("should clear error message when successful", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123456")
      vm.handleComplete()
      expect(vm.errorMessage$.value).not.toBeNull()

      vm.setValue("1234567")
      vm.handleComplete()

      expect(vm.errorMessage$.value).toBeNull()
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete input flow", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      // Start typing
      vm.handleDigitInput("1")
      expect(vm.value$.value).toBe("1")
      expect(vm.isComplete$.value).toBe(false)

      vm.handleDigitInput("12")
      expect(vm.value$.value).toBe("12")
      expect(vm.isComplete$.value).toBe(false)

      vm.handleDigitInput("123")
      expect(vm.value$.value).toBe("123")
      expect(vm.isComplete$.value).toBe(false)

      // Complete entry
      vm.handleDigitInput("1234567")
      expect(vm.value$.value).toBe("1234567")
      expect(vm.isComplete$.value).toBe(true)
      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
    })

    it("should handle input, error, and correction", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      // Type too many digits
      vm.setValue("123456789")
      expect(vm.errorMessage$.value).toBe("Student ID must be exactly 7 digits")
      expect(vm.value$.value).toBe("1234567")

      // Value is correct, complete it
      vm.handleComplete()
      expect(vm.errorMessage$.value).toBeNull()
      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
    })

    it("should handle backspace during typing", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("12345")
      vm.handleBackspace()
      expect(vm.value$.value).toBe("1234")

      vm.setValue("123456")
      expect(vm.value$.value).toBe("123456")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("12345")
    })

    it("should auto-complete on 7th digit entry", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123456")
      expect(onCompleteMock).not.toHaveBeenCalled()

      vm.setValue("1234567")
      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
      expect(vm.isComplete$.value).toBe(true)
    })

    it("should reject invalid characters during input", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("123")
      expect(vm.value$.value).toBe("123")

      vm.handleDigitInput("abc")
      expect(vm.errorMessage$.value).toBe("Only digits (0-9) are allowed")
      expect(vm.value$.value).toBe("123") // Value unchanged
    })

    it("should handle rapid input changes", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1")
      vm.setValue("12")
      vm.setValue("123")
      vm.setValue("1234")
      vm.setValue("12345")
      vm.setValue("123456")

      expect(vm.value$.value).toBe("123456")
      expect(vm.isComplete$.value).toBe(false)
      expect(onCompleteMock).not.toHaveBeenCalled()

      vm.setValue("1234567")

      expect(vm.value$.value).toBe("1234567")
      expect(vm.isComplete$.value).toBe(true)
      expect(onCompleteMock).toHaveBeenCalledWith("1234567")
    })

    it("should handle complete, clear, and re-enter flow", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      // First entry
      vm.setValue("1234567")
      expect(onCompleteMock).toHaveBeenCalledTimes(1)

      // Clear
      vm.setValue("")
      expect(vm.value$.value).toBe("")
      expect(vm.isComplete$.value).toBe(false)

      // Re-enter
      vm.setValue("9876543")
      expect(onCompleteMock).toHaveBeenCalledTimes(2)
      expect(onCompleteMock).toHaveBeenLastCalledWith("9876543")
    })

    it("should validate digit slots remain constant", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      const slots1 = vm.digitSlots$.value
      vm.setValue("123")
      const slots2 = vm.digitSlots$.value

      expect(slots1).toHaveLength(7)
      expect(slots2).toHaveLength(7)

      // Keys should be the same
      slots1.forEach((slot, i) => {
        expect(slot.key).toBe(slots2[i].key)
        expect(slot.index).toBe(slots2[i].index)
      })
    })
  })

  describe("edge cases", () => {
    it("should handle setValue with special characters", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("!@#$%^&*")

      expect(vm.value$.value).toBe("")
    })

    it("should handle setValue with spaces", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1 2 3 4 5 6 7")

      expect(vm.value$.value).toBe("1234567")
    })

    it("should handle setValue with decimal numbers", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123.456")

      expect(vm.value$.value).toBe("123456")
    })

    it("should handle multiple sequential backspaces", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("1234567")

      for (let i = 0; i < 10; i++) {
        vm.handleBackspace()
      }

      expect(vm.value$.value).toBe("")
    })

    it("should not save incomplete ID to localStorage", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("123")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBeNull()
    })

    it("should overwrite previous localStorage value", () => {
      const vm = useStudentEntryVM({ onComplete: onCompleteMock })

      localStorageMock.setItem("studentId", "0000000")

      vm.setValue("1234567")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBe("1234567")
    })
  })
})
