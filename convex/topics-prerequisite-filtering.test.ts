import { expect, test } from "vitest"

test("topics: prerequisite filtering logic - no prerequisites", () => {
  // Test the core filtering logic directly
  const topics = [
    { _id: "topic1", prerequisiteIds: [] }, // No prerequisites
    { _id: "topic2", prerequisiteIds: ["prereq1"] },
    { _id: "topic3", prerequisiteIds: ["prereq1", "prereq2"] }
  ]
  
  const studentEvaluations = new Map() // No evaluations
  
  // Apply filtering logic
  const eligibleTopics = topics.filter(topic => {
    if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true // Topics without prerequisites are always eligible
    }
    
    return topic.prerequisiteIds.every(prereqId => {
      const isMet = studentEvaluations.get(prereqId)
      return isMet === true // Must be explicitly true
    })
  })
  
  // Should only see topic1 (no prerequisites)
  expect(eligibleTopics.length).toBe(1)
  expect(eligibleTopics.map(t => t._id)).toEqual(["topic1"])
})

test("topics: prerequisite filtering logic - partial evaluations", () => {
  const topics = [
    { _id: "topic1", prerequisiteIds: ["prereq1", "prereq2"] },
    { _id: "topic2", prerequisiteIds: ["prereq1"] },
    { _id: "topic3", prerequisiteIds: [] }, // No prerequisites
    { _id: "topic4", prerequisiteIds: ["prereq3"] }
  ]
  
  const studentEvaluations = new Map([
    ["prereq1", true],
    ["prereq2", false],
    ["prereq3", true]
  ])
  
  // Apply filtering logic
  const eligibleTopics = topics.filter(topic => {
    if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true // Topics without prerequisites are always eligible
    }
    
    return topic.prerequisiteIds.every(prereqId => {
      const isMet = studentEvaluations.get(prereqId)
      return isMet === true // Must be explicitly true
    })
  })
  
  // Should include topic2 (prereq1 met), topic3 (no prerequisites), and topic4 (prereq3 met)
  // Should exclude topic1 (prereq2 not met)
  expect(eligibleTopics.length).toBe(3)
  expect(eligibleTopics.map(t => t._id)).toEqual(["topic2", "topic3", "topic4"])
})

test("topics: prerequisite filtering logic - all evaluations met", () => {
  const topics = [
    { _id: "topic1", prerequisiteIds: ["prereq1", "prereq2"] },
    { _id: "topic2", prerequisiteIds: ["prereq1"] },
    { _id: "topic3", prerequisiteIds: [] }
  ]
  
  const studentEvaluations = new Map([
    ["prereq1", true],
    ["prereq2", true]
  ])
  
  // Apply filtering logic
  const eligibleTopics = topics.filter(topic => {
    if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true // Topics without prerequisites are always eligible
    }
    
    return topic.prerequisiteIds.every(prereqId => {
      const isMet = studentEvaluations.get(prereqId)
      return isMet === true // Must be explicitly true
    })
  })
  
  // Should see all topics
  expect(eligibleTopics.length).toBe(3)
  expect(eligibleTopics.map(t => t._id)).toEqual(["topic1", "topic2", "topic3"])
})

test("topics: prerequisite filtering logic - false vs undefined", () => {
  const topics = [
    { _id: "topic1", prerequisiteIds: ["prereq1"] },
    { _id: "topic2", prerequisiteIds: ["prereq2"] }
  ]
  
  // Student explicitly marked prereq1 as NOT met, but hasn't evaluated prereq2
  const studentEvaluations = new Map([
    ["prereq1", false]
    // prereq2 is undefined (not evaluated)
  ])
  
  // Apply filtering logic
  const eligibleTopics = topics.filter(topic => {
    if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true
    }
    
    return topic.prerequisiteIds.every(prereqId => {
      const isMet = studentEvaluations.get(prereqId)
      return isMet === true // Must be explicitly true
    })
  })
  
  // Should exclude both topics
  // topic1: prereq1 is explicitly false
  // topic2: prereq2 is undefined (not evaluated)
  expect(eligibleTopics.length).toBe(0)
})

test("topics: prerequisite filtering edge cases", () => {
  // Test edge cases for robustness
  
  // Topic with null/undefined prerequisiteIds
  const topics = [
    { _id: "topic1", prerequisiteIds: null },
    { _id: "topic2", prerequisiteIds: undefined },
    { _id: "topic3", prerequisiteIds: [] },
    { _id: "topic4", prerequisiteIds: ["prereq1"] }
  ]
  
  const studentEvaluations = new Map([["prereq1", true]])
  
  // Apply filtering logic
  const eligibleTopics = topics.filter(topic => {
    if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
      return true // Topics without prerequisites are always eligible
    }
    
    return topic.prerequisiteIds.every(prereqId => {
      const isMet = studentEvaluations.get(prereqId)
      return isMet === true // Must be explicitly true
    })
  })
  
  // Should include topics 1, 2, 3 (no prerequisites) and topic 4 (prereq met)
  expect(eligibleTopics.length).toBe(4)
  expect(eligibleTopics.map(t => t._id).sort()).toEqual(["topic1", "topic2", "topic3", "topic4"])
})