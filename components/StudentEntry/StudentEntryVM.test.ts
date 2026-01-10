import { describe, it, expect, beforeEach, vi } from "vitest"
import { signal } from "@preact/signals-react"
import * as Option from "effect/Option"
import { createStudentEntryVM } from "./StudentEntryVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * This tests the StudentEntryVM which manages access code entry:
 * - Input validation (alphanumeric only)
 * - Completion detection (length check)
 * - Character slot states
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
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.value$.value).toBe("")
    })

    it("should update value when setValue is called", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC123")

      expect(vm.value$.value).toBe("ABC123")
    })

    it("should filter out special characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("AB!@C#12")

      expect(vm.value$.value).toBe("ABC12")
    })

    it("should convert lowercase to uppercase", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("abc123")

      expect(vm.value$.value).toBe("ABC123")
    })

    it("should limit input to 6 characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABCD12345")

      expect(vm.value$.value).toBe("ABCD12")
      expect(vm.value$.value.length).toBe(6)
    })
  })

  describe("isComplete$ computed", () => {
    it("should be false when value is empty", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be false when value has less than 6 characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be true when value has exactly 6 characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC123")

      expect(vm.isComplete$.value).toBe(true)
    })

    it("should update reactively when value changes", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.isComplete$.value).toBe(false)

      vm.setValue("ABC")
      expect(vm.isComplete$.value).toBe(false)

      vm.setValue("ABC123")
      expect(vm.isComplete$.value).toBe(true)
    })
  })

  describe("charSlots$ computed", () => {
    it("should return 6 character slots", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.charSlots$.value

      expect(slots).toHaveLength(6)
    })

    it("should have correct indices", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.charSlots$.value

      slots.forEach((slot, i) => {
        expect(slot.index).toBe(i)
      })
    })

    it("should have unique keys", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.charSlots$.value
      const keys = slots.map((s) => s.key)
      const uniqueKeys = new Set(keys)

      expect(uniqueKeys.size).toBe(6)
    })

    it("should have predictable key format", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      const slots = vm.charSlots$.value

      slots.forEach((slot, i) => {
        expect(slot.key).toBe(`char-${i}`)
      })
    })
  })

  describe("errorMessage$ signal", () => {
    it("should start with no error", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })

    it("should show error when input exceeds 6 characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABCD1234")

      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Access code must be exactly 6 characters"))
    })

    it("should clear error when input is valid", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABCD1234") // Error
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)

      vm.setValue("ABC12") // Valid (incomplete but not over limit)
      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })

    it("should show error when handleCharInput receives special characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("!@#")

      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Only letters and numbers are allowed"))
    })

    it("should clear error after handleBackspace", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABCD1234") // Error
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)

      vm.handleBackspace()
      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })
  })

  describe("handleCharInput action", () => {
    it("should accept alphanumeric input", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("ABC")

      expect(vm.value$.value).toBe("ABC")
      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })

    it("should reject special character input", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("!@#")

      expect(vm.value$.value).toBe("")
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Only letters and numbers are allowed"))
    })

    it("should reject mixed input with special characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("AB!@#CD")

      expect(vm.value$.value).toBe("")
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Only letters and numbers are allowed"))
    })

    it("should allow empty input", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC")
      vm.handleCharInput("")

      expect(vm.value$.value).toBe("")
      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })

    it("should auto-complete when 6 characters entered", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("ABC123")

      expect(vm.value$.value).toBe("ABC123")
      expect(onCompleteMock).toHaveBeenCalledWith("ABC123")
      expect(localStorageMock.getItem("studentId")).toBe("ABC123")
    })
  })

  describe("handleBackspace action", () => {
    it("should remove last character", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")
      vm.handleBackspace()

      expect(vm.value$.value).toBe("ABC1")
    })

    it("should do nothing when value is empty", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleBackspace()

      expect(vm.value$.value).toBe("")
    })

    it("should clear error message", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABCD1234") // Triggers error
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)

      vm.handleBackspace()

      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })

    it("should work multiple times", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("ABC1")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("ABC")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("AB")
    })

    it("should handle backspace until empty", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("AB")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("A")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("")
    })
  })

  describe("handleComplete action", () => {
    it("should save to localStorage when complete", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC123")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBe("ABC123")
    })

    it("should call onComplete callback with access code", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      // setValue with 6 characters triggers auto-complete (1st call)
      vm.setValue("ABC123")
      expect(onCompleteMock).toHaveBeenCalledTimes(1)

      // Calling handleComplete explicitly triggers it again (2nd call)
      vm.handleComplete()

      expect(onCompleteMock).toHaveBeenCalledWith("ABC123")
      expect(onCompleteMock).toHaveBeenCalledTimes(2)
    })

    it("should not complete when length is less than 6", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")
      vm.handleComplete()

      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Access code must be exactly 6 characters"))
      expect(onCompleteMock).not.toHaveBeenCalled()
      expect(localStorageMock.getItem("studentId")).toBeNull()
    })

    it("should not complete when value is empty", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleComplete()

      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Access code must be exactly 6 characters"))
      expect(onCompleteMock).not.toHaveBeenCalled()
    })

    it("should clear error message when successful", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")
      vm.handleComplete()
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)

      vm.setValue("ABC123")
      vm.handleComplete()

      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete input flow", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      // Start typing
      vm.handleCharInput("A")
      expect(vm.value$.value).toBe("A")
      expect(vm.isComplete$.value).toBe(false)

      vm.handleCharInput("AB")
      expect(vm.value$.value).toBe("AB")
      expect(vm.isComplete$.value).toBe(false)

      vm.handleCharInput("ABC")
      expect(vm.value$.value).toBe("ABC")
      expect(vm.isComplete$.value).toBe(false)

      // Complete entry
      vm.handleCharInput("ABC123")
      expect(vm.value$.value).toBe("ABC123")
      expect(vm.isComplete$.value).toBe(true)
      expect(onCompleteMock).toHaveBeenCalledWith("ABC123")
    })

    it("should handle input, error, and correction", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      // Type too many characters
      vm.setValue("ABCD12345")
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Access code must be exactly 6 characters"))
      expect(vm.value$.value).toBe("ABCD12")

      // Value is correct, complete it
      vm.handleComplete()
      expect(Option.isNone(vm.errorMessage$.value)).toBe(true)
      expect(onCompleteMock).toHaveBeenCalledWith("ABCD12")
    })

    it("should handle backspace during typing", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")
      vm.handleBackspace()
      expect(vm.value$.value).toBe("ABC1")

      vm.setValue("ABC123")
      expect(vm.value$.value).toBe("ABC123")

      vm.handleBackspace()
      expect(vm.value$.value).toBe("ABC12")
    })

    it("should auto-complete on 6th character entry", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC12")
      expect(onCompleteMock).not.toHaveBeenCalled()

      vm.setValue("ABC123")
      expect(onCompleteMock).toHaveBeenCalledWith("ABC123")
      expect(vm.isComplete$.value).toBe(true)
    })

    it("should reject special characters during input", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleCharInput("ABC")
      expect(vm.value$.value).toBe("ABC")

      vm.handleCharInput("!@#")
      expect(Option.isSome(vm.errorMessage$.value)).toBe(true)
      expect(vm.errorMessage$.value).toEqual(Option.some("Only letters and numbers are allowed"))
      expect(vm.value$.value).toBe("ABC") // Value unchanged
    })

    it("should handle rapid input changes", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("A")
      vm.setValue("AB")
      vm.setValue("ABC")
      vm.setValue("ABC1")
      vm.setValue("ABC12")

      expect(vm.value$.value).toBe("ABC12")
      expect(vm.isComplete$.value).toBe(false)
      expect(onCompleteMock).not.toHaveBeenCalled()

      vm.setValue("ABC123")

      expect(vm.value$.value).toBe("ABC123")
      expect(vm.isComplete$.value).toBe(true)
      expect(onCompleteMock).toHaveBeenCalledWith("ABC123")
    })

    it("should handle complete, clear, and re-enter flow", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      // First entry
      vm.setValue("ABC123")
      expect(onCompleteMock).toHaveBeenCalledTimes(1)

      // Clear
      vm.setValue("")
      expect(vm.value$.value).toBe("")
      expect(vm.isComplete$.value).toBe(false)

      // Re-enter
      vm.setValue("XYZ789")
      expect(onCompleteMock).toHaveBeenCalledTimes(2)
      expect(onCompleteMock).toHaveBeenLastCalledWith("XYZ789")
    })

    it("should validate character slots remain constant", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      const slots1 = vm.charSlots$.value
      vm.setValue("ABC")
      const slots2 = vm.charSlots$.value

      expect(slots1).toHaveLength(6)
      expect(slots2).toHaveLength(6)

      // Keys should be the same
      slots1.forEach((slot, i) => {
        expect(slot.key).toBe(slots2[i].key)
        expect(slot.index).toBe(slots2[i].index)
      })
    })
  })

  describe("edge cases", () => {
    it("should handle setValue with special characters", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("!@#$%^&*")

      expect(vm.value$.value).toBe("")
    })

    it("should handle setValue with spaces", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("A B C 1 2 3")

      expect(vm.value$.value).toBe("ABC123")
    })

    it("should handle lowercase to uppercase conversion", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("abc123")

      expect(vm.value$.value).toBe("ABC123")
    })

    it("should handle multiple sequential backspaces", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC123")

      for (let i = 0; i < 10; i++) {
        vm.handleBackspace()
      }

      expect(vm.value$.value).toBe("")
    })

    it("should not save incomplete code to localStorage", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.setValue("ABC")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBeNull()
    })

    it("should overwrite previous localStorage value", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      localStorageMock.setItem("studentId", "OLD123")

      vm.setValue("ABC123")
      vm.handleComplete()

      expect(localStorageMock.getItem("studentId")).toBe("ABC123")
    })
  })

  describe("legacy aliases", () => {
    it("digitSlots$ should alias charSlots$", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      expect(vm.digitSlots$).toBe(vm.charSlots$)
      expect(vm.digitSlots$.value).toEqual(vm.charSlots$.value)
    })

    it("handleDigitInput should alias handleCharInput", () => {
      const vm = createStudentEntryVM({ onComplete: onCompleteMock })

      vm.handleDigitInput("ABC")
      expect(vm.value$.value).toBe("ABC")

      vm.setValue("")
      vm.handleCharInput("XYZ")
      expect(vm.value$.value).toBe("XYZ")
    })
  })
})
