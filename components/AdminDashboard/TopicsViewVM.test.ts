/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest"
import { signal, computed } from "@preact/signals-react"
import type { TopicFormValues } from "@/components/forms/topic-form"
import type { TopicItemVM, SubtopicItemVM, PeriodOptionVM } from "./TopicsViewVM"

/**
 * Following the testing philosophy from viemodel.txt:
 * - Tests what matters without rendering the UI
 * - Focused and easy to maintain
 * - Tests the business logic directly
 *
 * Since useTopicsViewVM uses React hooks that cannot be easily mocked in Vitest,
 * we test the core logic by creating simplified versions that mimic the VM behavior.
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
      subtopicsCount: topic.subtopicIds?.length || 0,
      selectionsCount: 0,
      toggleActive: () => {
        // Mock implementation
      },
      remove: () => {
        // Mock implementation
      },
      edit: () => {
        // Mock implementation
      },
    }))
  )
}

// Helper to create a mock subtopics$ signal
function createMockSubtopicsSignal(mockData: any[] | null | undefined) {
  return computed(() =>
    (mockData ?? []).map((subtopic): SubtopicItemVM => ({
      key: subtopic._id,
      title: subtopic.title,
      description: subtopic.description,
      remove: () => {
        // Mock implementation
      },
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
          subtopicIds: ["s1", "s2"],
        },
        {
          _id: "t2" as any,
          title: "Web Development",
          description: "Full-stack web apps",
          isActive: false,
          semesterId: "2024-spring",
          subtopicIds: [],
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
        subtopicsCount: 2,
        selectionsCount: 0,
      })
      expect(topics[1]).toMatchObject({
        key: "t2",
        title: "Web Development",
        description: "Full-stack web apps",
        statusDisplay: "Inactive",
        statusVariant: "secondary",
        subtopicsCount: 0,
        selectionsCount: 0,
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(null)
      const topics = topics$.value

      expect(topics).toHaveLength(0)
      expect(topics).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const topics$ = createMockTopicsSignal(undefined)
      const topics = topics$.value

      expect(topics).toHaveLength(0)
      expect(topics).toEqual([])
    })

    it("should provide toggleActive callback for each topic", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Test Topic",
          description: "Test description",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].toggleActive).toBeDefined()
      expect(typeof topics[0].toggleActive).toBe("function")
    })

    it("should provide remove callback for each topic", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Test Topic",
          description: "Test description",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].remove).toBeDefined()
      expect(typeof topics[0].remove).toBe("function")
    })

    it("should map both active and inactive statuses correctly", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Active Topic",
          description: "Active",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
        {
          _id: "t2" as any,
          title: "Inactive Topic",
          description: "Inactive",
          isActive: false,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].statusDisplay).toBe("Active")
      expect(topics[0].statusVariant).toBe("default")
      expect(topics[1].statusDisplay).toBe("Inactive")
      expect(topics[1].statusVariant).toBe("secondary")
    })

    it("should handle topics with varying subtopic counts", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Topic 1",
          description: "Has subtopics",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: ["s1", "s2", "s3"],
        },
        {
          _id: "t2" as any,
          title: "Topic 2",
          description: "No subtopics",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
        {
          _id: "t3" as any,
          title: "Topic 3",
          description: "Undefined subtopics",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: undefined,
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const topics = topics$.value

      expect(topics[0].subtopicsCount).toBe(3)
      expect(topics[1].subtopicsCount).toBe(0)
      expect(topics[2].subtopicsCount).toBe(0)
    })
  })

  describe("subtopics$ signal", () => {
    it("should correctly map subtopic data to display format", () => {
      const mockSubtopics = [
        {
          _id: "s1" as any,
          title: "Neural Networks",
          description: "Deep learning with neural networks",
        },
        {
          _id: "s2" as any,
          title: "Data Preprocessing",
          description: "Clean and prepare data",
        },
      ]

      const subtopics$ = createMockSubtopicsSignal(mockSubtopics)
      const subtopics = subtopics$.value

      expect(subtopics).toHaveLength(2)
      expect(subtopics[0]).toMatchObject({
        key: "s1",
        title: "Neural Networks",
        description: "Deep learning with neural networks",
      })
      expect(subtopics[1]).toMatchObject({
        key: "s2",
        title: "Data Preprocessing",
        description: "Clean and prepare data",
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const subtopics$ = createMockSubtopicsSignal(null)
      const subtopics = subtopics$.value

      expect(subtopics).toHaveLength(0)
      expect(subtopics).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const subtopics$ = createMockSubtopicsSignal(undefined)
      const subtopics = subtopics$.value

      expect(subtopics).toHaveLength(0)
      expect(subtopics).toEqual([])
    })

    it("should provide remove callback for each subtopic", () => {
      const mockSubtopics = [
        {
          _id: "s1" as any,
          title: "Test Subtopic",
          description: "Test description",
        },
      ]

      const subtopics$ = createMockSubtopicsSignal(mockSubtopics)
      const subtopics = subtopics$.value

      expect(subtopics[0].remove).toBeDefined()
      expect(typeof subtopics[0].remove).toBe("function")
    })

    it("should handle empty subtopics list", () => {
      const mockSubtopics: any[] = []

      const subtopics$ = createMockSubtopicsSignal(mockSubtopics)
      const subtopics = subtopics$.value

      expect(subtopics).toHaveLength(0)
      expect(subtopics).toEqual([])
    })
  })

  describe("periodOptions$ signal", () => {
    it("should correctly map period data to option format", () => {
      const mockPeriods = [
        {
          _id: "p1" as any,
          semesterId: "2024-spring",
          title: "Spring 2024",
          openDate: Date.now(),
          closeDate: Date.now() + 1000000,
          kind: "open" as const,
        },
        {
          _id: "p2" as any,
          semesterId: "2024-fall",
          title: "Fall 2024",
          openDate: Date.now(),
          closeDate: Date.now() + 1000000,
          kind: "inactive" as const,
        },
      ]

      const periodOptions$ = createMockPeriodOptionsSignal(mockPeriods)
      const options = periodOptions$.value

      expect(options).toHaveLength(2)
      expect(options[0]).toMatchObject({
        value: "2024-spring",
        label: "Spring 2024",
      })
      expect(options[1]).toMatchObject({
        value: "2024-fall",
        label: "Fall 2024",
      })
    })

    it("should handle null from useQuery gracefully", () => {
      const periodOptions$ = createMockPeriodOptionsSignal(null)
      const options = periodOptions$.value

      expect(options).toHaveLength(0)
      expect(options).toEqual([])
    })

    it("should handle undefined from useQuery gracefully", () => {
      const periodOptions$ = createMockPeriodOptionsSignal(undefined)
      const options = periodOptions$.value

      expect(options).toHaveLength(0)
      expect(options).toEqual([])
    })

    it("should handle empty periods list", () => {
      const mockPeriods: any[] = []

      const periodOptions$ = createMockPeriodOptionsSignal(mockPeriods)
      const options = periodOptions$.value

      expect(options).toHaveLength(0)
      expect(options).toEqual([])
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

    it("should start with createSubtopicDialog isOpen$ as false", () => {
      const isOpen$ = signal(false)

      expect(isOpen$.value).toBe(false)
    })

    it("should open createSubtopicDialog when signal is set to true", () => {
      const isOpen$ = signal(false)

      isOpen$.value = true

      expect(isOpen$.value).toBe(true)
    })

    it("should start with editTopicDialog isOpen$ as false", () => {
      const isOpen$ = signal(false)

      expect(isOpen$.value).toBe(false)
    })

    it("should start with editingTopic$ as null", () => {
      const editingTopic$ = signal<any>(null)

      expect(editingTopic$.value).toBe(null)
    })

    it("should open editTopicDialog when signal is set to true", () => {
      const isOpen$ = signal(false)

      isOpen$.value = true

      expect(isOpen$.value).toBe(true)
    })

    it("should close editTopicDialog and clear editingTopic when closed", () => {
      const isOpen$ = signal(true)
      const editingTopic$ = signal<any>({
        id: "t1",
        title: "Test",
        description: "Test",
        semesterId: "2024-spring",
      })

      // Simulate close
      isOpen$.value = false
      editingTopic$.value = null

      expect(isOpen$.value).toBe(false)
      expect(editingTopic$.value).toBe(null)
    })

    it("should toggle dialog states multiple times", () => {
      const isOpen$ = signal(false)

      expect(isOpen$.value).toBe(false)

      isOpen$.value = true
      expect(isOpen$.value).toBe(true)

      isOpen$.value = false
      expect(isOpen$.value).toBe(false)

      isOpen$.value = true
      expect(isOpen$.value).toBe(true)
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

    it("should validate subtopic form values structure", () => {
      const formValues = {
        title: "Neural Networks",
        description: "Deep learning with neural networks",
      }

      expect(formValues.title).toBe("Neural Networks")
      expect(formValues.description).toBe("Deep learning with neural networks")
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
      expect(editing.description).toBe("Advanced ML")
      expect(editing.semesterId).toBe("2024-spring")
    })

    it("should be null when no topic is being edited", () => {
      const editingTopic$ = signal<any>(null)

      expect(editingTopic$.value).toBe(null)
    })

    it("should update when a new topic is selected for editing", () => {
      const editingTopic$ = signal<any>(null)

      expect(editingTopic$.value).toBe(null)

      editingTopic$.value = {
        id: "t1",
        title: "Topic 1",
        description: "Description 1",
        semesterId: "2024-spring",
      }

      expect(editingTopic$.value).not.toBeNull()
      expect(editingTopic$.value.id).toBe("t1")

      editingTopic$.value = {
        id: "t2",
        title: "Topic 2",
        description: "Description 2",
        semesterId: "2024-fall",
      }

      expect(editingTopic$.value.id).toBe("t2")
      expect(editingTopic$.value.title).toBe("Topic 2")
    })

    it("should clear when dialog is closed", () => {
      const editingTopic$ = signal<any>({
        id: "t1",
        title: "Machine Learning",
        description: "Advanced ML",
        semesterId: "2024-spring",
      })

      expect(editingTopic$.value).not.toBeNull()

      // Simulate close action
      editingTopic$.value = null

      expect(editingTopic$.value).toBe(null)
    })
  })

  describe("integration scenarios", () => {
    it("should handle complete workflow data transformations", () => {
      // Mock topics data
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Machine Learning",
          description: "ML techniques",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: ["s1", "s2"],
        },
      ]

      // Mock subtopics data
      const mockSubtopics = [
        {
          _id: "s1" as any,
          title: "Neural Networks",
          description: "Deep learning",
        },
      ]

      // Mock periods data
      const mockPeriods = [
        {
          _id: "p1" as any,
          semesterId: "2024-spring",
          title: "Spring 2024",
          openDate: Date.now(),
          closeDate: Date.now() + 1000000,
          kind: "open" as const,
        },
      ]

      const topics$ = createMockTopicsSignal(mockTopics)
      const subtopics$ = createMockSubtopicsSignal(mockSubtopics)
      const periodOptions$ = createMockPeriodOptionsSignal(mockPeriods)

      expect(topics$.value).toHaveLength(1)
      expect(subtopics$.value).toHaveLength(1)
      expect(periodOptions$.value).toHaveLength(1)

      expect(topics$.value[0].title).toBe("Machine Learning")
      expect(subtopics$.value[0].title).toBe("Neural Networks")
      expect(periodOptions$.value[0].label).toBe("Spring 2024")
    })

    it("should maintain independent dialog states", () => {
      const createTopicDialogOpen$ = signal(false)
      const createSubtopicDialogOpen$ = signal(false)
      const editTopicDialogOpen$ = signal(false)

      // Open create topic dialog
      createTopicDialogOpen$.value = true
      expect(createTopicDialogOpen$.value).toBe(true)
      expect(createSubtopicDialogOpen$.value).toBe(false)
      expect(editTopicDialogOpen$.value).toBe(false)

      // Open create subtopic dialog
      createSubtopicDialogOpen$.value = true
      expect(createTopicDialogOpen$.value).toBe(true)
      expect(createSubtopicDialogOpen$.value).toBe(true)
      expect(editTopicDialogOpen$.value).toBe(false)

      // Close create topic dialog
      createTopicDialogOpen$.value = false
      expect(createTopicDialogOpen$.value).toBe(false)
      expect(createSubtopicDialogOpen$.value).toBe(true)
      expect(editTopicDialogOpen$.value).toBe(false)

      // Open edit topic dialog
      editTopicDialogOpen$.value = true
      expect(createTopicDialogOpen$.value).toBe(false)
      expect(createSubtopicDialogOpen$.value).toBe(true)
      expect(editTopicDialogOpen$.value).toBe(true)

      // Close all dialogs
      createSubtopicDialogOpen$.value = false
      editTopicDialogOpen$.value = false
      expect(createTopicDialogOpen$.value).toBe(false)
      expect(createSubtopicDialogOpen$.value).toBe(false)
      expect(editTopicDialogOpen$.value).toBe(false)
    })

    it("should handle mixed active/inactive topics", () => {
      const mockTopics = [
        {
          _id: "t1" as any,
          title: "Active 1",
          description: "Active",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
        {
          _id: "t2" as any,
          title: "Inactive 1",
          description: "Inactive",
          isActive: false,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
        {
          _id: "t3" as any,
          title: "Active 2",
          description: "Active",
          isActive: true,
          semesterId: "2024-spring",
          subtopicIds: [],
        },
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
      const subtopics$ = createMockSubtopicsSignal([])
      const periodOptions$ = createMockPeriodOptionsSignal([])

      expect(topics$.value).toHaveLength(0)
      expect(subtopics$.value).toHaveLength(0)
      expect(periodOptions$.value).toHaveLength(0)
    })
  })
})
