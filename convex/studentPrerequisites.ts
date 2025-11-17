import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import * as StudentPrerequisite from "./schemas/StudentPrerequisite"

/**
 * Get all prerequisites with student's current evaluations.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getPrerequisitesWithStudentEvaluations = query({
  args: {
    studentId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all prerequisites
    const prerequisites = await ctx.db.query("prerequisites").collect()
    
    // Get student's existing evaluations
    const studentEvaluations = await ctx.db
      .query("studentPrerequisites")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect()
    
    // Create a map for quick lookup
    const evaluationMap = new Map(
      studentEvaluations.map(evaluation => [evaluation.prerequisiteId, evaluation])
    )
    
    // Combine prerequisites with student evaluations
    return prerequisites.map(prereq => ({
      ...prereq,
      studentEvaluation: evaluationMap.get(prereq._id) || null
    }))
  }
})

/**
 * Get a student's evaluation for a specific prerequisite.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const getStudentPrerequisiteEvaluation = query({
  args: {
    studentId: v.string(),
    prerequisiteId: v.id("prerequisites")
  },
  handler: async (ctx, args) => {
    const evaluation = await ctx.db
      .query("studentPrerequisites")
      .withIndex("by_student_prerequisite", q => 
        q.eq("studentId", args.studentId).eq("prerequisiteId", args.prerequisiteId)
      )
      .first()
    
    return evaluation
  }
})

/**
 * Save or update a student's prerequisite evaluation.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const saveStudentPrerequisiteEvaluation = mutation({
  args: {
    studentId: v.string(),
    prerequisiteId: v.id("prerequisites"),
    isMet: v.boolean()
  },
  handler: async (ctx, args) => {
    // Check if evaluation already exists
    const existing = await ctx.db
      .query("studentPrerequisites")
      .withIndex("by_student_prerequisite", q => 
        q.eq("studentId", args.studentId).eq("prerequisiteId", args.prerequisiteId)
      )
      .first()
    
    if (existing) {
      // Update existing evaluation
      return await ctx.db.patch(existing._id, {
        isMet: args.isMet,
        lastUpdated: Date.now()
      })
    } else {
      // Create new evaluation
      return await ctx.db.insert("studentPrerequisites", 
        StudentPrerequisite.make({
          studentId: args.studentId,
          prerequisiteId: args.prerequisiteId,
          isMet: args.isMet
        })
      )
    }
  }
})

/**
 * Save multiple student prerequisite evaluations at once.
 * 
 * @category Mutations
 * @since 0.1.0
 */
export const saveStudentPrerequisiteEvaluations = mutation({
  args: {
    studentId: v.string(),
    evaluations: v.array(v.object({
      prerequisiteId: v.id("prerequisites"),
      isMet: v.boolean()
    }))
  },
  handler: async (ctx, args) => {
    const results = []
    
    for (const evaluation of args.evaluations) {
      // Check if evaluation already exists
      const existing = await ctx.db
        .query("studentPrerequisites")
        .withIndex("by_student_prerequisite", q => 
          q.eq("studentId", args.studentId).eq("prerequisiteId", evaluation.prerequisiteId)
        )
        .first()
      
      if (existing) {
        // Update existing evaluation
        const result = await ctx.db.patch(existing._id, {
          isMet: evaluation.isMet,
          lastUpdated: Date.now()
        })
        results.push(result)
      } else {
        // Create new evaluation
        const result = await ctx.db.insert("studentPrerequisites", 
          StudentPrerequisite.make({
            studentId: args.studentId,
            prerequisiteId: evaluation.prerequisiteId,
            isMet: evaluation.isMet
          })
        )
        results.push(result)
      }
    }
    
    return results
  }
})

/**
 * Check if a student has completed all prerequisite evaluations.
 * 
 * @category Queries
 * @since 0.1.0
 */
export const hasCompletedPrerequisiteEvaluations = query({
  args: {
    studentId: v.string()
  },
  handler: async (ctx, args) => {
    // Get total count of prerequisites
    const totalPrerequisites = await ctx.db.query("prerequisites").collect()
    
    // Get count of student's evaluations
    const studentEvaluations = await ctx.db
      .query("studentPrerequisites")
      .withIndex("by_student", q => q.eq("studentId", args.studentId))
      .collect()
    
    return {
      total: totalPrerequisites.length,
      completed: studentEvaluations.length,
      isComplete: totalPrerequisites.length === studentEvaluations.length
    }
  }
})