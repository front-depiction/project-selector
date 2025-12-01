# Signals Reactivity Pattern - Usage Guide

## Overview

This project uses `@preact/signals-react` for state management following the View Model pattern. This guide explains how to properly use signals to avoid reactivity issues with form inputs.

## The Problem

Using `useSignals()` incorrectly can cause shadcn input components to break - typing in inputs does nothing because the signal system interferes with React's normal state updates.

## The Solution: Signal Boundary Pattern

### Rule 1: Call `useSignals()` ONLY where you read signals

**Components that read `.value` MUST call `useSignals()`:**

```tsx
export const MyView: React.FC = () => {
  // ✅ CORRECT - This component reads .value, so it needs useSignals()
  useSignals()
  const vm = useMyVM()

  return (
    <div>
      <h1>{vm.title$.value}</h1>
      <p>{vm.count$.value}</p>
    </div>
  )
}
```

**Components that DON'T read `.value` should NOT call `useSignals()`:**

```tsx
export const MyFormComponent: React.FC<{ onSubmit: (data: FormData) => void }> = ({ onSubmit }) => {
  // ✅ CORRECT - This is a form component using react-hook-form
  // It doesn't read signals, so NO useSignals() here
  const form = useForm<FormData>({ ... })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Input {...field} /> {/* ✅ Works correctly */}
      </form>
    </Form>
  )
}
```

### Rule 2: Extract primitive values at the boundary

When passing signal data TO child components (especially forms), extract primitive values:

```tsx
export const MyView: React.FC = () => {
  useSignals()
  const vm = useMyVM()

  return (
    <Dialog open={vm.dialogOpen$.value}>
      <MyForm
        // ✅ CORRECT - Spread to create a plain array
        options={[...vm.options$.value]}
        // ✅ CORRECT - Extract primitive value
        initialValue={vm.currentValue$.value}
        onSubmit={vm.handleSubmit}
      />
    </Dialog>
  )
}
```

### Rule 3: Form components should use react-hook-form, NOT signals

```tsx
// ❌ WRONG - Don't use signals inside form components
export const MyForm = () => {
  useSignals() // ❌ BAD - causes input issues
  const value$ = useSignal("") // ❌ BAD - use react-hook-form instead

  return <Input value={value$.value} onChange={...} />
}

// ✅ CORRECT - Use react-hook-form
export const MyForm = () => {
  const form = useForm<FormData>({ ... })

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="fieldName"
        render={({ field }) => (
          <Input {...field} /> {/* ✅ Works correctly */}
        )}
      />
    </Form>
  )
}
```

## Architecture Pattern

```
┌─────────────────────────────────────┐
│ View Component (with useSignals)    │
│                                      │
│ - Calls useSignals()                 │
│ - Reads signal values with .value    │
│ - Extracts primitives to pass down   │
└────────────┬────────────────────────┘
             │
             │ Primitive values (strings, numbers, plain arrays)
             ↓
┌─────────────────────────────────────┐
│ Form Component (NO useSignals)      │
│                                      │
│ - Uses react-hook-form               │
│ - Receives primitive props           │
│ - Calls callback functions           │
└─────────────────────────────────────┘
```

## Fixed Components

### Components that now correctly use `useSignals()`:

1. **StudentEntry/StudentEntry.tsx** - Provider component
   - Calls `useSignals()` because it reads signal values
   - Child components receive primitive values through context

2. **AdminDashboard/PeriodsView.tsx**
   - Added missing `useSignals()` call
   - Spreads arrays when passing to SelectionPeriodForm

3. **AdminDashboard/AnalyticsView.tsx**
   - Added missing `useSignals()` call

4. **AdminDashboard/TopicsView.tsx**
   - Already correct - calls `useSignals()` at top

5. **AdminDashboard/QuestionnairesView.tsx**
   - Already correct - calls `useSignals()` at top

6. **AdminDashboard/SettingsView.tsx**
   - Already correct - calls `useSignals()` at top

7. **AdminDashboard/SelectionPeriodQuestionsView.tsx**
   - Already correct - calls `useSignals()` at top

### Form components (correctly have NO useSignals()):

1. **forms/topic-form.tsx** - Uses react-hook-form only
2. **forms/question-form.tsx** - Uses react-hook-form only
3. **forms/template-form.tsx** - Uses react-hook-form only
4. **forms/selection-period-form.tsx** - Uses react-hook-form only
5. **forms/subtopic-form.tsx** - Uses react-hook-form only

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting useSignals() when reading signals

```tsx
export const MyView = () => {
  // ❌ MISSING useSignals()
  const vm = useMyVM()

  return <div>{vm.data$.value}</div> // Won't update reactively!
}
```

### ❌ Mistake 2: Calling useSignals() in form components

```tsx
export const MyForm = () => {
  useSignals() // ❌ BAD - causes input issues
  const form = useForm()

  return <Input {...field} /> // Won't work!
}
```

### ❌ Mistake 3: Passing signal objects directly to forms

```tsx
<MyForm data={vm.data$.value} /> // ❌ Might pass a proxy object
<MyForm data={[...vm.data$.value]} /> // ✅ Plain array
```

## Testing Your Changes

After making changes, verify that:

1. **View components re-render** when signal values change
2. **Form inputs work** - typing updates the value
3. **Form submissions work** - data is passed correctly
4. **No console errors** related to signals or reactivity

## When to Use What

| Use Case | Tool | Example |
|----------|------|---------|
| View-level state | Signals in VM | `const data$ = signal([])` |
| Form input state | react-hook-form | `const form = useForm()` |
| Local UI state | React useState | `const [open, setOpen] = useState(false)` |
| Derived state | Computed signals | `const total$ = computed(() => items$.value.length)` |

## Summary

The key principle: **Keep signals at the VM boundary, pass primitive values to UI components.**

- View components: `useSignals()` + read `.value` + pass primitives down
- Form components: `react-hook-form` + receive primitives as props
- Never mix: Don't use `useSignals()` in components with form inputs
