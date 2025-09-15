/**
 * Gets the student ID from localStorage
 * 
 * @category Utils
 * @since 0.1.0
 * @example
 * const studentId = getStudentId()
 * if (studentId) {
 *   console.log(`Student ID: ${studentId}`)
 * }
 */
export const getStudentId = (): string | null => {
  if (typeof window === "undefined") return null
  
  try {
    return localStorage.getItem("studentId")
  } catch (error) {
    console.error("Failed to access localStorage:", error)
    return null
  }
}

/**
 * Sets the student ID in localStorage
 * 
 * @category Utils
 * @since 0.1.0
 * @example
 * setStudentId("STU123456")
 */
export const setStudentId = (studentId: string): void => {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem("studentId", studentId)
  } catch (error) {
    console.error("Failed to set studentId in localStorage:", error)
  }
}

/**
 * Clears the student ID from localStorage
 * 
 * @category Utils
 * @since 0.1.0
 */
export const clearStudentId = (): void => {
  if (typeof window === "undefined") return
  
  try {
    localStorage.removeItem("studentId")
  } catch (error) {
    console.error("Failed to clear studentId from localStorage:", error)
  }
}