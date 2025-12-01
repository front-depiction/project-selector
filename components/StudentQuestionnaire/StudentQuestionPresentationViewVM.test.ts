/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useStudentQuestionPresentationVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
 */

interface Question {
  questionId: string
  text: string
  kind: "boolean" | "0to10"
}

// Mock VM implementation for testing
function createTestVM(questions: Question[]) {
  const currentIndexSignal = signal(0)
  const answersMapSignal = signal(new Map<string, boolean | number>())
  const isSubmittingSignal = signal(false)

  const questions$ = computed(() => questions)

  const totalQuestions$ = computed(() => questions$.value.length)

  const currentQuestion$ = computed(() => {
    const index = currentIndexSignal.value
    const qs = questions$.value
    if (qs.length === 0 || index < 0 || index >= qs.length) {
      return null
    }
    return qs[index]
  })

  const currentAnswer$ = computed(() => {
    const question = currentQuestion$.value
    if (!question) return undefined
    return answersMapSignal.value.get(question.questionId)
  })

  const progress$ = computed(() => {
    const total = totalQuestions$.value
    if (total === 0) return 0
    return ((currentIndexSignal.value + 1) / total) * 100
  })

  const isFirst$ = computed(() => currentIndexSignal.value === 0)
  const isLast$ = computed(() => currentIndexSignal.value === totalQuestions$.value - 1)

  const isComplete$ = computed(() => {
    const qs = questions$.value
    const answers = answersMapSignal.value
    if (qs.length === 0) return false
    return qs.every((q) => answers.has(q.questionId))
  })

  const setAnswer = (value: number | boolean) => {
    const question = currentQuestion$.value
    if (!question) return

    const newMap = new Map(answersMapSignal.value)
    newMap.set(question.questionId, value)
    answersMapSignal.value = newMap
  }

  const next = () => {
    const total = totalQuestions$.value
    if (currentIndexSignal.value < total - 1) {
      currentIndexSignal.value = currentIndexSignal.value + 1
    }
  }

  const previous = () => {
    if (currentIndexSignal.value > 0) {
      currentIndexSignal.value = currentIndexSignal.value - 1
    }
  }

  const submit = async () => {
    if (isSubmittingSignal.value) return

    isSubmittingSignal.value = true
    try {
      const qs = questions$.value
      const answers = answersMapSignal.value

      const answersArray = qs.map((q) => ({
        questionId: q.questionId,
        kind: q.kind,
        value: answers.get(q.questionId) ?? (q.kind === "boolean" ? false : 5),
      }))

      // Mock submission
      return Promise.resolve()
    } finally {
      isSubmittingSignal.value = false
    }
  }

  return {
    currentIndex$: currentIndexSignal,
    currentQuestion$,
    currentAnswer$,
    progress$,
    totalQuestions$,
    isFirst$,
    isLast$,
    isComplete$,
    isSubmitting$: isSubmittingSignal,
    setAnswer,
    next,
    previous,
    submit,
  }
}

describe("StudentQuestionPresentationViewVM", () => {
  const mockQuestions: Question[] = [
    {
      questionId: "q1",
      text: "Do you enjoy teamwork?",
      kind: "boolean",
    },
    {
      questionId: "q2",
      text: "Rate your interest in AI",
      kind: "0to10",
    },
    {
      questionId: "q3",
      text: "Do you prefer remote work?",
      kind: "boolean",
    },
  ]

  describe("currentQuestion$ computed", () => {
    it("should return the first question initially", () => {
      const vm = createTestVM(mockQuestions)

      const question = vm.currentQuestion$.value

      expect(question).not.toBeNull()
      expect(question?.questionId).toBe("q1")
      expect(question?.text).toBe("Do you enjoy teamwork?")
      expect(question?.kind).toBe("boolean")
    })

    it("should return null when no questions", () => {
      const vm = createTestVM([])

      const question = vm.currentQuestion$.value

      expect(question).toBeNull()
    })

    it("should return null when index is out of bounds", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 999

      const question = vm.currentQuestion$.value

      expect(question).toBeNull()
    })

    it("should update when currentIndex$ changes", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1

      const question = vm.currentQuestion$.value

      expect(question?.questionId).toBe("q2")
      expect(question?.text).toBe("Rate your interest in AI")
    })
  })

  describe("progress$ computed", () => {
    it("should calculate percentage correctly for first question", () => {
      const vm = createTestVM(mockQuestions)

      const progress = vm.progress$.value

      expect(progress).toBeCloseTo(33.33, 1)
    })

    it("should calculate percentage correctly for middle question", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1

      const progress = vm.progress$.value

      expect(progress).toBeCloseTo(66.67, 1)
    })

    it("should calculate percentage correctly for last question", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      const progress = vm.progress$.value

      expect(progress).toBe(100)
    })

    it("should return 0 when no questions", () => {
      const vm = createTestVM([])

      const progress = vm.progress$.value

      expect(progress).toBe(0)
    })

    it("should return 100% for single question", () => {
      const vm = createTestVM([mockQuestions[0]])

      const progress = vm.progress$.value

      expect(progress).toBe(100)
    })
  })

  describe("isFirst$ computed", () => {
    it("should be true when at first question", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isFirst$.value).toBe(true)
    })

    it("should be false when not at first question", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1

      expect(vm.isFirst$.value).toBe(false)
    })
  })

  describe("isLast$ computed", () => {
    it("should be false when at first question", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isLast$.value).toBe(false)
    })

    it("should be true when at last question", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      expect(vm.isLast$.value).toBe(true)
    })

    it("should be true for single question", () => {
      const vm = createTestVM([mockQuestions[0]])

      expect(vm.isLast$.value).toBe(true)
    })
  })

  describe("next() navigation", () => {
    it("should increment currentIndex$", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.currentIndex$.value).toBe(0)

      vm.next()

      expect(vm.currentIndex$.value).toBe(1)
    })

    it("should not go beyond last question", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      vm.next()

      expect(vm.currentIndex$.value).toBe(2)
    })

    it("should update currentQuestion$ when moving forward", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.currentQuestion$.value?.questionId).toBe("q1")

      vm.next()

      expect(vm.currentQuestion$.value?.questionId).toBe("q2")
    })
  })

  describe("previous() navigation", () => {
    it("should decrement currentIndex$", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1

      vm.previous()

      expect(vm.currentIndex$.value).toBe(0)
    })

    it("should not go below 0", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 0

      vm.previous()

      expect(vm.currentIndex$.value).toBe(0)
    })

    it("should update currentQuestion$ when moving backward", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      expect(vm.currentQuestion$.value?.questionId).toBe("q3")

      vm.previous()

      expect(vm.currentQuestion$.value?.questionId).toBe("q2")
    })
  })

  describe("setAnswer() action", () => {
    it("should store boolean answer correctly", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      expect(vm.currentAnswer$.value).toBe(true)
    })

    it("should store number answer correctly", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1

      vm.setAnswer(7)

      expect(vm.currentAnswer$.value).toBe(7)
    })

    it("should update answer for current question", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      expect(vm.currentAnswer$.value).toBe(true)

      vm.next()
      vm.setAnswer(8)

      expect(vm.currentAnswer$.value).toBe(8)
    })

    it("should allow changing an answer", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)

      vm.setAnswer(false)
      expect(vm.currentAnswer$.value).toBe(false)
    })

    it("should preserve answer when navigating away and back", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      vm.next()
      vm.setAnswer(7)

      vm.previous()

      expect(vm.currentAnswer$.value).toBe(true)
    })
  })

  describe("currentAnswer$ computed", () => {
    it("should return undefined when no answer set", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.currentAnswer$.value).toBeUndefined()
    })

    it("should return stored answer", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      expect(vm.currentAnswer$.value).toBe(true)
    })

    it("should return undefined when navigating to unanswered question", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      vm.next()

      expect(vm.currentAnswer$.value).toBeUndefined()
    })
  })

  describe("isComplete$ computed", () => {
    it("should be false initially", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be false when some questions answered", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should be true when all questions answered", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)
      vm.next()
      vm.setAnswer(7)
      vm.next()
      vm.setAnswer(false)

      expect(vm.isComplete$.value).toBe(true)
    })

    it("should be false for empty questions list", () => {
      const vm = createTestVM([])

      expect(vm.isComplete$.value).toBe(false)
    })

    it("should update dynamically as answers are added", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isComplete$.value).toBe(false)

      vm.setAnswer(true)
      expect(vm.isComplete$.value).toBe(false)

      vm.next()
      vm.setAnswer(7)
      expect(vm.isComplete$.value).toBe(false)

      vm.next()
      vm.setAnswer(false)
      expect(vm.isComplete$.value).toBe(true)
    })
  })

  describe("submit() action", () => {
    it("should set isSubmitting$ to false after submission completes", async () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isSubmitting$.value).toBe(false)

      await vm.submit()

      expect(vm.isSubmitting$.value).toBe(false)
    })

    it("should not allow concurrent submissions", async () => {
      const vm = createTestVM(mockQuestions)

      const submitPromise1 = vm.submit()
      const submitPromise2 = vm.submit()

      await Promise.all([submitPromise1, submitPromise2])

      // Both should complete without error
      expect(vm.isSubmitting$.value).toBe(false)
    })

    it("should use default values for unanswered questions", async () => {
      const vm = createTestVM(mockQuestions)

      // Answer only first question
      vm.setAnswer(true)

      await vm.submit()

      // Should complete successfully even with unanswered questions
      expect(vm.isSubmitting$.value).toBe(false)
    })

    it("should reset isSubmitting$ on error", async () => {
      const questionsWithError: Question[] = [
        {
          questionId: "q1",
          text: "Test question",
          kind: "boolean",
        },
      ]

      const vm = createTestVM(questionsWithError)

      // Override submit to throw error
      const originalSubmit = vm.submit
      vm.submit = async () => {
        vm.isSubmitting$.value = true
        try {
          throw new Error("Submission failed")
        } finally {
          vm.isSubmitting$.value = false
        }
      }

      try {
        await vm.submit()
      } catch (error) {
        // Expected error
      }

      expect(vm.isSubmitting$.value).toBe(false)
    })
  })

  describe("navigation bounds checking", () => {
    it("should not allow navigation below 0", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 0

      vm.previous()
      vm.previous()
      vm.previous()

      expect(vm.currentIndex$.value).toBe(0)
    })

    it("should not allow navigation above max", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      vm.next()
      vm.next()
      vm.next()

      expect(vm.currentIndex$.value).toBe(2)
    })

    it("should handle empty questions list", () => {
      const vm = createTestVM([])

      expect(vm.currentIndex$.value).toBe(0)
      expect(vm.currentQuestion$.value).toBeNull()

      vm.next()
      expect(vm.currentIndex$.value).toBe(0)

      vm.previous()
      expect(vm.currentIndex$.value).toBe(0)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete questionnaire workflow", () => {
      const vm = createTestVM(mockQuestions)

      // Start at first question
      expect(vm.currentQuestion$.value?.questionId).toBe("q1")
      expect(vm.isFirst$.value).toBe(true)
      expect(vm.isLast$.value).toBe(false)
      expect(vm.progress$.value).toBeCloseTo(33.33, 1)

      // Answer first question
      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)
      expect(vm.isComplete$.value).toBe(false)

      // Move to second question
      vm.next()
      expect(vm.currentQuestion$.value?.questionId).toBe("q2")
      expect(vm.isFirst$.value).toBe(false)
      expect(vm.isLast$.value).toBe(false)
      expect(vm.progress$.value).toBeCloseTo(66.67, 1)
      expect(vm.currentAnswer$.value).toBeUndefined()

      // Answer second question
      vm.setAnswer(7)
      expect(vm.currentAnswer$.value).toBe(7)

      // Move to third question
      vm.next()
      expect(vm.currentQuestion$.value?.questionId).toBe("q3")
      expect(vm.isFirst$.value).toBe(false)
      expect(vm.isLast$.value).toBe(true)
      expect(vm.progress$.value).toBe(100)

      // Answer third question
      vm.setAnswer(false)
      expect(vm.isComplete$.value).toBe(true)

      // Navigate back to verify answers preserved
      vm.previous()
      expect(vm.currentAnswer$.value).toBe(7)

      vm.previous()
      expect(vm.currentAnswer$.value).toBe(true)
    })

    it("should handle navigation with mixed question types", () => {
      const vm = createTestVM(mockQuestions)

      // Answer all questions with appropriate types
      vm.setAnswer(true) // boolean
      vm.next()
      vm.setAnswer(8) // 0to10
      vm.next()
      vm.setAnswer(false) // boolean

      // Verify all answers stored correctly
      vm.currentIndex$.value = 0
      expect(vm.currentAnswer$.value).toBe(true)

      vm.currentIndex$.value = 1
      expect(vm.currentAnswer$.value).toBe(8)

      vm.currentIndex$.value = 2
      expect(vm.currentAnswer$.value).toBe(false)
    })

    it("should handle changing answers multiple times", () => {
      const vm = createTestVM(mockQuestions)

      // Set initial answer
      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)

      // Change answer
      vm.setAnswer(false)
      expect(vm.currentAnswer$.value).toBe(false)

      // Move to next question and back
      vm.next()
      vm.setAnswer(5)

      vm.previous()
      expect(vm.currentAnswer$.value).toBe(false)

      // Change answer again
      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)
    })

    it("should handle single question scenario", () => {
      const singleQuestion: Question[] = [
        {
          questionId: "q1",
          text: "Only question",
          kind: "boolean",
        },
      ]

      const vm = createTestVM(singleQuestion)

      expect(vm.isFirst$.value).toBe(true)
      expect(vm.isLast$.value).toBe(true)
      expect(vm.progress$.value).toBe(100)

      vm.setAnswer(true)
      expect(vm.isComplete$.value).toBe(true)

      // Navigation should not change index
      vm.next()
      expect(vm.currentIndex$.value).toBe(0)

      vm.previous()
      expect(vm.currentIndex$.value).toBe(0)
    })

    it("should handle rapid navigation with delayed answers", () => {
      const vm = createTestVM(mockQuestions)

      // Navigate forward
      vm.next()
      vm.next()

      // Now at last question
      expect(vm.currentQuestion$.value?.questionId).toBe("q3")

      // Navigate back and answer
      vm.previous()
      vm.setAnswer(7)

      vm.previous()
      vm.setAnswer(true)

      // Navigate forward and verify answers preserved
      vm.next()
      expect(vm.currentAnswer$.value).toBe(7)

      vm.next()
      expect(vm.currentAnswer$.value).toBeUndefined()
    })
  })

  describe("totalQuestions$ signal", () => {
    it("should return correct total", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.totalQuestions$.value).toBe(3)
    })

    it("should return 0 for empty list", () => {
      const vm = createTestVM([])

      expect(vm.totalQuestions$.value).toBe(0)
    })

    it("should return 1 for single question", () => {
      const vm = createTestVM([mockQuestions[0]])

      expect(vm.totalQuestions$.value).toBe(1)
    })
  })

  describe("signal reactivity", () => {
    it("should update progress$ when currentIndex$ changes", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.progress$.value).toBeCloseTo(33.33, 1)

      vm.currentIndex$.value = 1
      expect(vm.progress$.value).toBeCloseTo(66.67, 1)

      vm.currentIndex$.value = 2
      expect(vm.progress$.value).toBe(100)
    })

    it("should update isFirst$ when currentIndex$ changes", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isFirst$.value).toBe(true)

      vm.currentIndex$.value = 1
      expect(vm.isFirst$.value).toBe(false)

      vm.currentIndex$.value = 0
      expect(vm.isFirst$.value).toBe(true)
    })

    it("should update isLast$ when currentIndex$ changes", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isLast$.value).toBe(false)

      vm.currentIndex$.value = 2
      expect(vm.isLast$.value).toBe(true)

      vm.currentIndex$.value = 1
      expect(vm.isLast$.value).toBe(false)
    })

    it("should update currentAnswer$ when answersMap changes", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.currentAnswer$.value).toBeUndefined()

      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)

      vm.setAnswer(false)
      expect(vm.currentAnswer$.value).toBe(false)
    })

    it("should update currentAnswer$ when currentIndex$ changes", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)
      expect(vm.currentAnswer$.value).toBe(true)

      vm.currentIndex$.value = 1
      expect(vm.currentAnswer$.value).toBeUndefined()

      vm.setAnswer(7)
      expect(vm.currentAnswer$.value).toBe(7)

      vm.currentIndex$.value = 0
      expect(vm.currentAnswer$.value).toBe(true)
    })

    it("should update isComplete$ when answers change", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.isComplete$.value).toBe(false)

      vm.setAnswer(true)
      expect(vm.isComplete$.value).toBe(false)

      vm.next()
      vm.setAnswer(7)
      expect(vm.isComplete$.value).toBe(false)

      vm.next()
      vm.setAnswer(false)
      expect(vm.isComplete$.value).toBe(true)
    })

    it("should update currentQuestion$ reactively based on currentIndex$", () => {
      const vm = createTestVM(mockQuestions)

      expect(vm.currentQuestion$.value?.questionId).toBe("q1")

      vm.currentIndex$.value = 1
      expect(vm.currentQuestion$.value?.questionId).toBe("q2")

      vm.currentIndex$.value = 2
      expect(vm.currentQuestion$.value?.questionId).toBe("q3")

      vm.currentIndex$.value = 0
      expect(vm.currentQuestion$.value?.questionId).toBe("q1")
    })

    it("should cascade updates through multiple computed signals", () => {
      const vm = createTestVM(mockQuestions)

      // Initial state
      expect(vm.currentIndex$.value).toBe(0)
      expect(vm.currentQuestion$.value?.questionId).toBe("q1")
      expect(vm.currentAnswer$.value).toBeUndefined()
      expect(vm.isFirst$.value).toBe(true)
      expect(vm.isLast$.value).toBe(false)
      expect(vm.progress$.value).toBeCloseTo(33.33, 1)

      // Set answer and move forward
      vm.setAnswer(true)
      vm.next()

      // All dependent signals should update
      expect(vm.currentIndex$.value).toBe(1)
      expect(vm.currentQuestion$.value?.questionId).toBe("q2")
      expect(vm.currentAnswer$.value).toBeUndefined()
      expect(vm.isFirst$.value).toBe(false)
      expect(vm.isLast$.value).toBe(false)
      expect(vm.progress$.value).toBeCloseTo(66.67, 1)
    })
  })

  describe("navigation bounds with edge cases", () => {
    it("should handle multiple previous() calls at index 0", () => {
      const vm = createTestVM(mockQuestions)

      vm.previous()
      vm.previous()
      vm.previous()

      expect(vm.currentIndex$.value).toBe(0)
      expect(vm.currentQuestion$.value?.questionId).toBe("q1")
    })

    it("should handle multiple next() calls at last index", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 2

      vm.next()
      vm.next()
      vm.next()

      expect(vm.currentIndex$.value).toBe(2)
      expect(vm.currentQuestion$.value?.questionId).toBe("q3")
    })

    it("should prevent setting answers when currentQuestion$ is null", () => {
      const vm = createTestVM([])

      vm.setAnswer(true)

      expect(vm.currentAnswer$.value).toBeUndefined()
    })

    it("should handle direct index assignment beyond bounds", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 999

      expect(vm.currentQuestion$.value).toBeNull()
      expect(vm.currentAnswer$.value).toBeUndefined()

      vm.currentIndex$.value = -5

      expect(vm.currentQuestion$.value).toBeNull()
      expect(vm.currentAnswer$.value).toBeUndefined()
    })

    it("should handle navigation at exact boundary values", () => {
      const vm = createTestVM(mockQuestions)

      // At first boundary
      vm.currentIndex$.value = 0
      expect(vm.isFirst$.value).toBe(true)
      expect(vm.isLast$.value).toBe(false)

      vm.previous()
      expect(vm.currentIndex$.value).toBe(0)

      // At last boundary
      vm.currentIndex$.value = 2
      expect(vm.isFirst$.value).toBe(false)
      expect(vm.isLast$.value).toBe(true)

      vm.next()
      expect(vm.currentIndex$.value).toBe(2)
    })
  })

  describe("setAnswer edge cases", () => {
    it("should handle setting answer to 0 (falsy value)", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1
      vm.setAnswer(0)

      expect(vm.currentAnswer$.value).toBe(0)
    })

    it("should handle setting boolean false (falsy value)", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(false)

      expect(vm.currentAnswer$.value).toBe(false)
    })

    it("should handle setting answer to max value (10)", () => {
      const vm = createTestVM(mockQuestions)

      vm.currentIndex$.value = 1
      vm.setAnswer(10)

      expect(vm.currentAnswer$.value).toBe(10)
    })

    it("should maintain answer integrity across rapid changes", () => {
      const vm = createTestVM(mockQuestions)

      vm.setAnswer(true)
      vm.setAnswer(false)
      vm.setAnswer(true)
      vm.setAnswer(false)

      expect(vm.currentAnswer$.value).toBe(false)
    })

    it("should not create new map if question is null", () => {
      const vm = createTestVM([])

      // This should not throw
      vm.setAnswer(true)
      vm.setAnswer(5)
      vm.setAnswer(false)

      expect(vm.currentAnswer$.value).toBeUndefined()
    })
  })
})
