"use client"

import { useCallback, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AuthProvider, useAuth } from "./auth-provider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getAllQuizResults, mockUsers, type User } from "@/lib/auth"
import { StudentDashboard } from "@/components/student-dashboard"
import { Brain, Users, Filter, Edit, RefreshCw, Eye, TrendingUp, TrendingDown } from "lucide-react"

// interface TeacherDashboardProps {
//   user: User
//   onLogout: () => void
// }

export function TeacherDashboard() {
  const [viewMode, setViewMode] = useState<"teacher" | "student">("teacher")
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null)
  const [filterClass, setFilterClass] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { user, loading, logout } = useAuth();

  const allResults = getAllQuizResults()
  const students = mockUsers.filter((u) => u.role === "student")

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  // Get student performance data
  const studentPerformance = students.map((student) => {
    const studentResults = allResults.filter((result) => result.studentId === student.id)
    const averageScore =
      studentResults.length > 0
        ? Math.round(studentResults.reduce((sum, result) => sum + result.score, 0) / studentResults.length)
        : 0
    const lastQuiz = studentResults.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    return {
      student,
      averageScore,
      quizCount: studentResults.length,
      lastQuiz,
      allSuggestions: studentResults.flatMap((r) => r.suggestions),
    }
  })

  // Filter students
  const filteredStudents = studentPerformance.filter((item) => {
    const matchesClass = filterClass === "all" || item.student.class === filterClass
    const matchesSearch =
      item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.rollNo?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesClass && matchesSearch
  })

  const uniqueClasses = [...new Set(students.map((s) => s.class).filter(Boolean))]
  const totalStudents = students.length
  const averageClassScore = Math.round(
    studentPerformance.reduce((sum, item) => sum + item.averageScore, 0) / studentPerformance.length,
  )

  if (viewMode === "student" && selectedStudent) {
    return (
      <div>
        <div className="bg-card border-b p-4">
          <div className="container mx-auto flex items-center justify-between">
            <Button onClick={() => setViewMode("teacher")} variant="outline" className="mb-0">
              ← Back to Teacher Dashboard
            </Button>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
        <StudentDashboard />
      </div>
    )
  }
  if (!user) {
    return <h1>User not found</h1>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">Across {uniqueClasses.length} classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Class Average</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageClassScore}%</div>
              <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allResults.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed assessments</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Student Management
            </CardTitle>
            <CardDescription>View and manage all student performance data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {uniqueClasses.map((className) => (
                    <SelectItem key={className} value={className!}>
                      Class {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Performance Overview</CardTitle>
            <CardDescription>Detailed view of all students and their quiz results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Quizzes</TableHead>
                    <TableHead>Last Quiz</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((item) => (
                    <TableRow key={item.student.id}>
                      <TableCell className="font-medium">{item.student.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.student.class}</Badge>
                      </TableCell>
                      <TableCell>{item.student.rollNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.averageScore}%</span>
                          {item.averageScore >= 80 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-orange-600" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.quizCount}</TableCell>
                      <TableCell>
                        {item.lastQuiz ? (
                          <div>
                            <div className="font-medium">{item.lastQuiz.score}%</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(item.lastQuiz.date).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No quizzes</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStudent(item.student)
                              setViewMode("student")
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
