"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "./auth-provider"
import { StudentQuiz } from "./student-quiz"
import { TrendingUp, TrendingDown, Brain, Calendar, Award, Target, BookOpen, Loader2 } from "lucide-react"

interface QuizResult {
  _id: string
  score: number
  correctAnswers: number
  totalQuestions: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  explanation: string
  submittedAt: string
  skillPerformance: {
    Cognitive: { correct: number; total: number }
    Emotional: { correct: number; total: number }
    Behavioural: { correct: number; total: number }
  }
}

export function StudentDashboard() {
  const { user, loading, logout } = useAuth()
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [loadingResults, setLoadingResults] = useState(true)
  const backendURL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (user?.id) {
      fetchQuizResults()
    }
  }, [user])

  const fetchQuizResults = async () => {
    setLoadingResults(true)
    try {
      const res = await fetch(`${backendURL}/quiz/history`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setQuizResults(data.results || [])
      }
    } catch (err) {
      console.error("Failed to fetch quiz results:", err)
    } finally {
      setLoadingResults(false)
    }
  }

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
  
  if (!user) {
    return <h1>User not found</h1>;
  }

  const averageScore =
    quizResults.length > 0
      ? Math.round(quizResults.reduce((sum, result) => sum + result.score, 0) / quizResults.length)
      : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Welcome back, {user.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {user.class && user.rollNo && `${user.class} • Roll No: ${user.rollNo}`}
                </p>
              </div>
            </div>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6" onValueChange={(value) => {
          if (value === "overview") {
            fetchQuizResults()
          }
        }}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">
              <Award className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <BookOpen className="h-4 w-4 mr-2" />
              Take Quiz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}%</div>
              <Progress value={averageScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizResults.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Keep up the great work!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement Areas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {quizResults.reduce((total, result) => total + result.weaknesses.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Focus areas identified</p>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Results */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Quiz Results</h2>

          {quizResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No quiz results yet</h3>
                <p className="text-muted-foreground text-center">
                  Complete your first quiz to see personalized insights and recommendations.
                </p>
              </CardContent>
            </Card>
          ) : loadingResults ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-600">Loading quiz results...</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {quizResults.map((result) => (
                <Card key={result._id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Adaptive Quiz</CardTitle>
                        <CardDescription>Completed on {new Date(result.submittedAt).toLocaleDateString()}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">{result.score}%</div>
                        <Progress value={result.score} className="w-24 mt-1" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Strengths & Weaknesses */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-green-700">Strengths</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.strengths.map((strength: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingDown className="h-4 w-4 text-orange-600" />
                          <h4 className="font-semibold text-orange-700">Areas for Improvement</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.weaknesses.map((weakness: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800">
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Suggestions */}
                    <div className="bg-accent/10 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">AI Recommendations</h4>
                      </div>
                      <ul className="space-y-2">
                        {result.recommendations.map((recommendation: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <span className="text-sm">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* AI Explanation */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Why these suggestions?</h4>
                      <p className="text-sm text-muted-foreground">{result.explanation}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
          </TabsContent>

          <TabsContent value="quiz">
            <StudentQuiz />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
