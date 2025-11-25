export interface User {
  id: string
  name: string
  email: string
  role: "student" | "teacher"
  rollNo?: string
  class?: string
  age?: number
}

export interface QuizResult {
  id: string
  studentId: string
  quizName: string
  score: number
  date: string
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  explanation: string
}

// Mock data
export const mockUsers: User[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@college.edu",
    role: "student",
    rollNo: "CS001",
    class: "10A",
    age: 16,
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@college.edu",
    role: "student",
    rollNo: "CS002",
    class: "10A",
    age: 15,
  },
  {
    id: "3",
    name: "Dr. Sarah Wilson",
    email: "sarah@college.edu",
    role: "teacher",
    age: 35,
  },
]

export const mockQuizResults: QuizResult[] = [
  {
    id: "1",
    studentId: "1",
    quizName: "Quiz 1",
    score: 85,
    date: "2024-01-15",
    strengths: ["Problem solving", "Algebraic thinking"],
    weaknesses: ["Geometry concepts", "Word problems"],
    suggestions: ["Practice more geometry problems", "Focus on reading comprehension for word problems"],
    explanation:
      "Based on response patterns, the student shows strong analytical skills but struggles with spatial reasoning and text interpretation.",
  },
  {
    id: "2",
    studentId: "1",
    quizName: "Quiz 1",
    score: 92,
    date: "2024-01-20",
    strengths: ["Scientific method", "Data analysis"],
    weaknesses: ["Chemistry formulas"],
    suggestions: ["Review periodic table and chemical equations"],
    explanation:
      "Excellent understanding of scientific processes, but needs more practice with memorization-based content.",
  },
  {
    id: "3",
    studentId: "2",
    quizName: "Quiz 1",
    score: 78,
    date: "2024-01-15",
    strengths: ["Basic arithmetic", "Following procedures"],
    weaknesses: ["Complex problem solving", "Time management"],
    suggestions: ["Practice timed exercises", "Break down complex problems into steps"],
    explanation:
      "Student demonstrates solid foundational skills but needs support with higher-order thinking and test-taking strategies.",
  },
]

export function authenticateUser(email: string, password: string): User | null {
  // Mock authentication - in real app, this would validate against a database
  const user = mockUsers.find((u) => u.email === email)
  return user || null
}

export function getQuizResultsForStudent(studentId: string): QuizResult[] {
  return mockQuizResults.filter((result) => result.studentId === result.studentId)
}

export function getAllQuizResults(): QuizResult[] {
  return mockQuizResults
}
