# StudentQuestionPresentationView Usage Guide

## Overview

The `StudentQuestionPresentationView` is a full-screen, one-question-at-a-time presentation component for displaying questionnaire questions to students. It follows the View Model (VM) pattern for clean separation of UI and business logic.

## Files Created

1. **StudentQuestionPresentationViewVM.ts** - View Model with all business logic
2. **StudentQuestionPresentationView.tsx** - Pure UI component (zero logic)

## Basic Usage

```tsx
import { StudentQuestionPresentationView } from "@/components/StudentQuestionnaire"
import type { Id } from "@/convex/_generated/dataModel"

function StudentQuestionnairePage() {
  const studentId = "1234567" // From localStorage or route
  const selectionPeriodId = "..." as Id<"selectionPeriods"> // From query

  const handleComplete = () => {
    console.log("Questionnaire completed!")
    // Navigate to next step, show confirmation, etc.
  }

  return (
    <StudentQuestionPresentationView
      studentId={studentId}
      selectionPeriodId={selectionPeriodId}
      onComplete={handleComplete}
    />
  )
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `studentId` | `string` | Yes | The student's ID |
| `selectionPeriodId` | `Id<"selectionPeriods">` | Yes | The selection period ID |
| `onComplete` | `() => void` | No | Callback when questionnaire is submitted |

## View Model Interface

The VM exposes the following reactive signals and actions:

### Signals (Reactive State)

- `currentIndex$: ReadonlySignal<number>` - Current question index
- `currentQuestion$: ReadonlySignal<{ questionId, text, kind } | null>` - Current question
- `currentAnswer$: ReadonlySignal<boolean | number | undefined>` - Current answer
- `progress$: ReadonlySignal<number>` - Progress percentage (0-100)
- `totalQuestions$: ReadonlySignal<number>` - Total number of questions
- `isFirst$: ReadonlySignal<boolean>` - Is this the first question?
- `isLast$: ReadonlySignal<boolean>` - Is this the last question?
- `isComplete$: ReadonlySignal<boolean>` - Are all questions answered?
- `isSubmitting$: ReadonlySignal<boolean>` - Is currently submitting?

### Actions (Side Effects)

- `setAnswer(value: number | boolean): void` - Update answer for current question
- `next(): void` - Navigate to next question
- `previous(): void` - Navigate to previous question
- `submit(): Promise<void>` - Submit all answers (async)

## Features

### Full-Screen Layout
- Inspired by StudentEntry.tsx pattern
- `min-h-screen` with centered content
- `max-w-3xl` container for optimal reading
- Responsive padding and spacing

### Large Typography
- Question text: `text-2xl sm:text-3xl md:text-4xl font-extrabold`
- Number display for scale: `text-6xl sm:text-7xl md:text-8xl`
- Large buttons: `h-16 w-32 text-xl` (navigation), `h-24 w-40 text-3xl` (boolean)

### Progress Tracking
- Visual progress bar at top
- "Question X of Y" text
- Percent completion calculated automatically

### Answer Input Types

#### Boolean Questions
- Two large Yes/No buttons
- Selected state with ring effect and scale animation
- `ring-4 ring-primary ring-offset-4 scale-105`

#### Scale Questions (0-10)
- Grid of 11 buttons (0 through 10)
- Large number display showing current value
- Labels: "0 - Not at all" and "10 - Extremely"
- Selected button has ring and scale effect

### Navigation
- Previous/Next buttons at bottom
- Previous disabled on first question
- Submit button appears on last question
- Submit disabled until all questions answered

### Data Management
- Loads questions via `api.selectionQuestions.getQuestionsForPeriod`
- Loads existing answers via `api.studentAnswers.getAnswers`
- Saves all answers via `api.studentAnswers.saveAnswers`
- Answers tracked internally before submission
- Auto-initializes from existing answers if present

## Architecture Notes

### View Model Pattern
- Follows the pattern from `viemodel.txt`
- Uses `@preact/signals-react` for reactivity
- All signals end with `$` suffix
- View has ZERO logic - only VM interactions
- Uses `useSignals()` for automatic reactivity

### Comparison with QuestionnaireStep

The existing `QuestionnaireStep.tsx` is:
- Card-based layout (not full-screen)
- Manages state with React hooks directly
- Suitable for embedded questionnaires

The new `StudentQuestionPresentationView` is:
- Full-screen immersive experience
- VM pattern for better testability
- Suitable for standalone questionnaire flow
- More "presentation mode" focused

Both are valid - choose based on your use case:
- Use **QuestionnaireStep** when embedding in a larger page
- Use **StudentQuestionPresentationView** for dedicated questionnaire flow

## Convex Integration

### Queries Used
```typescript
api.selectionQuestions.getQuestionsForPeriod
// Returns: Array<{ questionId, question: { question, kind }, order, ... }>

api.studentAnswers.getAnswers
// Returns: Array<{ questionId, kind, booleanValue?, zeroToTenValue?, ... }>
```

### Mutations Used
```typescript
api.studentAnswers.saveAnswers
// Args: { studentId, selectionPeriodId, answers: Array<{ questionId, kind, value }> }
```

## Example: Custom Integration

If you want to use the VM separately (for testing or custom UI):

```tsx
import { useStudentQuestionPresentationVM } from "./StudentQuestionPresentationViewVM"

function MyCustomQuestionView() {
  const vm = useStudentQuestionPresentationVM({
    studentId: "1234567",
    selectionPeriodId: "..." as Id<"selectionPeriods">,
    onComplete: () => console.log("Done!")
  })

  return (
    <div>
      <h1>{vm.currentQuestion$.value?.text}</h1>
      <p>Question {vm.currentIndex$.value + 1} of {vm.totalQuestions$.value}</p>

      {vm.currentQuestion$.value?.kind === "boolean" && (
        <div>
          <button onClick={() => vm.setAnswer(true)}>Yes</button>
          <button onClick={() => vm.setAnswer(false)}>No</button>
        </div>
      )}

      <button onClick={vm.previous} disabled={vm.isFirst$.value}>
        Previous
      </button>
      <button onClick={vm.next} disabled={vm.isLast$.value}>
        Next
      </button>
      {vm.isLast$.value && (
        <button onClick={vm.submit} disabled={!vm.isComplete$.value}>
          Submit
        </button>
      )}
    </div>
  )
}
```

## Testing

The VM can be tested without rendering the UI:

```typescript
import { renderHook } from "@testing-library/react"
import { useStudentQuestionPresentationVM } from "./StudentQuestionPresentationViewVM"

test("navigation works correctly", () => {
  const { result } = renderHook(() => useStudentQuestionPresentationVM({
    studentId: "123",
    selectionPeriodId: "test" as Id<"selectionPeriods">
  }))

  expect(result.current.currentIndex$.value).toBe(0)
  expect(result.current.isFirst$.value).toBe(true)

  result.current.next()
  expect(result.current.currentIndex$.value).toBe(1)
  expect(result.current.isFirst$.value).toBe(false)
})
```

## Styling Classes Used

### Layout
- `min-h-screen flex items-center justify-center px-4` - Full-screen centering
- `max-w-3xl` - Container max width
- `gap-8`, `space-y-8` - Generous spacing

### Typography
- `text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight` - Questions
- `text-6xl sm:text-7xl md:text-8xl font-extrabold` - Scale number display
- `text-xl` - Navigation buttons
- `text-3xl font-bold` - Boolean buttons

### Buttons
- `h-16 w-32 text-xl` - Navigation buttons
- `h-24 w-40 text-3xl` - Boolean answer buttons
- `h-16` - Scale number buttons

### Effects
- `ring-4 ring-primary ring-offset-4 scale-105` - Selected state
- `transition-all` - Smooth transitions

## Tips

1. **Progress Persistence**: The component automatically loads existing answers, so students can refresh and continue where they left off.

2. **Answer Validation**: Submit button is only enabled when all questions are answered.

3. **Error Handling**: Submit errors are logged to console and re-thrown for parent handling.

4. **Responsive Design**: All text and buttons scale appropriately on mobile, tablet, and desktop.

5. **Accessibility**: Uses semantic HTML and proper button states (disabled when appropriate).
