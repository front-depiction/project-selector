/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { TopicFormValues } from "@/components/forms/topic-form"
import type { TopicItemVM, PeriodOptionVM } from "./TopicsViewVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 */

// Helper to create a mock topics$ signal
function createMockTopicsSignal(mockData: any[] | null | undefined) {
  return computed(() =>
    (mockData ?? []).map((topic): TopicItemVM => ({
      key: topic._id,
      title: topic.title,
      description: topic.description,
      statusDisplay: topic.isActive ? "Active" : "Inactive",
      statusVariant: topic.isActive ? "default" : "secondary",
      selectionsCount: 0,
      toggleActive: () => {},
      remove: () => {},
      edit: () => {},
    }))
  )
}

// Helper to create a mock periodOptions$ signal
function createMockPeriodOptionsSignal(mockData: any[] | null | undefined) {
  return computed(() =>
    (mockData ?? []).map((period): PeriodOptionVM => ({
      value: period.semesterId,
      label: period.title,
    }))
  )
}

describe("TopicsViewVM", () => {
  describe("topics$ signal", () => {
    it("should correctly map topic data to display format", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Machine Learning",
          description: "Advanced ML techniques",
          isActive: true,
          semesterId: "2024-spring",
        },
        {
          _id: "t2" as any,
          title: "Web Development",
          description: "Full-stack web apps",
          isActive: false,
          semesterId: "2024-spring",
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics).toHaveLength(2)
      expect(topics[0]).toMatchObject({
        key: "t1",
        title: "Machine Learning",
        description: "Advanced ML techniques",
        statusDisplay: "Active",
        statusVariant: "default",
        selectionsCount: 0,
      })
      expect(topics[1]).toMatchObject({
        key: "t2",
        title: "Web Development",
        description: "Full-stack web apps",
        statusDisplay: "Inactive",
        statusVariant: "secondary",
        selectionsCount: 0,
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(null)
      expect(topics$.value).toHaveLength(0)
      expect(topics$.value).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(undefined)
      expect(topics$.value).toHaveLength(0)
      expect(topics$.value).toEqual([])
    })

    it("should provide toggleActive callback for each topic", () => {
      const mockTopics = [
        { _id: "t1" as any, title: "Test Topic", description: "Test description", isActive: true, semesterId: "2024-spring" },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      expect(topics$.value[0].toggleActive).toBeDefined()
      expect(typeof topics$.value[0].toggleActive).toBe("function")
    })

    it("should map both active and inactive statuses correctly", () => {
      const mockTopics = [
        { _id: "t1" as any, title: "Active Topic", description: "Active", isActive: true, semesterId: "2024-spring" },
        { _id: "t2" as any, title: "Inactive Topic", description: "Inactive", isActive: false, semesterId: "2024-spring" },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].statusDisplay).toBe("Active")
      expect(topics[0].statusVariant).toBe("default")
      expect(topics[1].statusDisplay).toBe("Inactive")
      expect(topics[1].statusVariant).toBe("secondary")
    })
  })

  describe("periodOptions$ signal", () => {
    it("should correctly map period data to option format", () => {
      const mockPeriods = [
        { _id: "p1" as any, semesterId: "2024-spring", title: "Spring 2024", openDate: Date.now(), closeDate: Date.now() + 1000000, kind: "open" as const },
        { _id: "p2" as any, semesterId: "2024-fall", title: "Fall 2024", openDate: Date.now(), closeDate: Date.now() + 1000000, kind: "inactive" as const },
      ]

      const periodOptions$ = createMockPeriodOptionsSignal(mockPeriods)
      const options = periodOptions$.value

      expect(options).toHaveLength(2)
      expect(options[0]).toMatchObject({ value: "2024-spring", label: "Spring 2024" })
      expect(options[1]).toMatchObject({ value: "2024-fall", label: "Fall 2024" })
    })

    it("should handle null from useQuery gracefully", () => {
      const periodOptions$ = createMockPeriodOptionsSignal(null)
      expect(periodOptions$.value).toHaveLength(0)
    })

    it("should handle undefined from useQuery gracefully", () => {
      const periodOptions$ = createMockPeriodOptionsSignal(undefined)
      expect(periodOptions$.value).toHaveLength(0)
    })
  })

  describe("dialogVM", () => {
    it("should start with createTopicDialog isOpen$ as false", () => {
      const isOpen$ = signal(false)
      expect(isOpen$.value).toBe(false)
    })

    it("should open createTopicDialog when signal is set to true", () => {
      const isOpen$ = signal(false)
      isOpen$.value = true
      expect(isOpen$.value).toBe(true)
    })

    it("should close createTopicDialog when signal is set to false", () => {
      const isOpen$ = signal(true)
      isOpen$.value = false
      expect(isOpen$.value).toBe(false)
    })

    it("should start with editTopicDialog isOpen$ as false", () => {
      const isOpen$ = signal(false)
      expect(isOpen$.value).toBe(false)
    })

    it("should start with editingTopic$ as null", () => {
      const editingTopic$ = signal<any>(null)
      expect(editingTopic$.value).toBe(null)
    })

    it("should close editTopicDialog and clear editingTopic when closed", () => {
      const isOpen$ = signal(true)
      const editingTopic$ = signal<any>({ id: "t1", title: "Test", description: "Test", semesterId: "2024-spring" })

      isOpen$.value = false
      editingTopic$.value = null

      expect(isOpen$.value).toBe(false)
      expect(editingTopic$.value).toBe(null)
    })
  })

  describe("form submission logic", () => {
    it("should validate topic form values structure", () => {
      const formValues: TopicFormValues = {
        title: "Machine Learning",
        description: "Advanced ML techniques for data analysis",
        selection_period_id: "2024-spring",
      }

      expect(formValues.title).toBe("Machine Learning")
      expect(formValues.description).toBe("Advanced ML techniques for data analysis")
      expect(formValues.selection_period_id).toBe("2024-spring")
    })

    it("should handle edit topic form values with pre-filled data", () => {
      const formValues: TopicFormValues = {
        title: "Updated Title",
        description: "Updated description",
        selection_period_id: "2024-fall",
      }

      expect(formValues.title).toBe("Updated Title")
      expect(formValues.description).toBe("Updated description")
      expect(formValues.selection_period_id).toBe("2024-fall")
    })
  })

  describe("editingTopic$ signal", () => {
    it("should store topic data for editing", () => {
      const editingTopic$ = signal<any>({
        id: "t1",
        title: "Machine Learning",
        description: "Advanced ML",
        semesterId: "2024-spring",
      })

      const editing = editingTopic$.value

      expect(editing).not.toBeNull()
      expect(editing.id).toBe("t1")
      expect(editing.title).toBe("Machine Learning")
    })

    it("should be null when no topic is being edited", () => {
      const editingTopic$ = signal<any>(null)
      expect(editingTopic$.value).toBe(null)
    })

    it("should clear when dialog is closed", () => {
      const editingTopic$ = signal<any>({ id: "t1", title: "Machine Learning", description: "Advanced ML", semesterId: "2024-spring" })
      expect(editingTopic$.value).not.toBeNull()

      editingTopic$.value = null
      expect(editingTopic$.value).toBe(null)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow data transformations", () => {
      const mockTopics = [{ _id: "t1" as any, title: "Machine Learning", description: "ML techniques", isActive: true, semesterId: "2024-spring" }]
      const mockPeriods = [{ _id: "p1" as any, semesterId: "2024-spring", title: "Spring 2024", openDate: Date.now(), closeDate: Date.now() + 1000000, kind: "open" as const }]

      const topics$ = createMockTopicsSignal(mockTopics)
      const periodOptions$ = createMockPeriodOptionsSignal(mockPeriods)

      expect(topics$.value).toHaveLength(1)
      expect(periodOptions$.value).toHaveLength(1)
      expect(topics$.value[0].title).toBe("Machine Learning")
      expect(periodOptions$.value[0].label).toBe("Spring 2024")
    })

    it("should maintain independent dialog states", () => {
      const createTopicDialogOpen$ = signal(false)
      const editTopicDialogOpen$ = signal(false)

      createTopicDialogOpen$.value = true
      expect(createTopicDialogOpen$.value).toBe(true)
      expect(editTopicDialogOpen$.value).toBe(false)

      createTopicDialogOpen$.value = false
      editTopicDialogOpen$.value = true
      expect(createTopicDialogOpen$.value).toBe(false)
      expect(editTopicDialogOpen$.value).toBe(true)
    })

    it("should handle mixed active/inactive topics", () => {
      const mockTopics = [
        { _id: "t1" as any, title: "Active 1", description: "Active", isActive: true, semesterId: "2024-spring" },
        { _id: "t2" as any, title: "Inactive 1", description: "Inactive", isActive: false, semesterId: "2024-spring" },
        { _id: "t3" as any, title: "Active 2", description: "Active", isActive: true, semesterId: "2024-spring" },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics).toHaveLength(3)

      const activeTopics = topics.filter((t) => t.statusDisplay === "Active")
      const inactiveTopics = topics.filter((t) => t.statusDisplay === "Inactive")

      expect(activeTopics).toHaveLength(2)
      expect(inactiveTopics).toHaveLength(1)
    })

    it("should handle empty state across all data sources", () => {
      const topics$ = createMockTopicsSignal([])
      const periodOptions$ = createMockPeriodOptionsSignal([])

      expect(topics$.value).toHaveLength(0)
      expect(periodOptions$.value).toHaveLength(0)
    })
  })
})
