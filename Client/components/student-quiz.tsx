"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "./auth-provider"
import { Brain, Heart, Target, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface QuizQuestion {
  id: number
  question: string
  skillType: "Cognitive" | "Emotional" | "Behavioural"
  difficulty: "Easy" | "Medium" | "Hard"
  options: string[]
  correctAnswer: string
  timeLimit: number
  behaviorIndicator: string
}

interface QuizConfig {
  age: number
  grade: string
  learningLevel: "beginner" | "intermediate" | "advanced"
  specialNeedType: "ADHD" | "Dyslexia" | "Autism" | "None"
  interests: string
  language: "English" | "Tamil" | "Mixed"
}

export function StudentQuiz() {
  const { user, showSuccessToast, showErrorToast } = useAuth()
  const [quizStarted, setQuizStarted] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [answerSubmitted, setAnswerSubmitted] = useState(false)
  const [answers, setAnswers] = useState<{ questionId: number; answer: string; timeSpent: number }[]>([])
  const [timeSpent, setTimeSpent] = useState(0)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    age: user?.age || 10,
    grade: "5",
    learningLevel: "beginner",
    specialNeedType: "None",
    interests: "",
    language: "English"
  })

  const backendURL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (quizStarted && !quizCompleted && questions.length > 0) {
      timer = setInterval(() => {
        setTimeSpent(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [quizStarted, quizCompleted, questions])

  const generateQuiz = async () => {
    setIsGenerating(true)
    setGenerationError(false)
    
    // Auto-set learning level based on quiz attempts
    const attempts = user?.quizAttempts || 0
    let learningLevel: "beginner" | "intermediate" | "advanced" = "beginner"
    if (attempts === 0 || attempts === 1) learningLevel = "beginner"
    else if (attempts === 2) learningLevel = "intermediate"
    else if (attempts >= 3) learningLevel = "advanced"
    
    const configWithLevel = { ...quizConfig, learningLevel }
    
    try {
      const prompt = `You are an expert educational psychologist and special education content designer.
          Create an adaptive quiz to assess a student's cognitive, emotional, and behavioural skills. 
          The quiz must be suitable for students with special educational needs and should be engaging, simple, and non-stressful.

          Student Details:
          - Age: ${configWithLevel.age}
          - Grade: ${configWithLevel.grade}
          - Learning Level: ${configWithLevel.learningLevel}
          - Special Need Type: ${configWithLevel.specialNeedType}
          - Interests: ${configWithLevel.interests}
          - Preferred Language: ${configWithLevel.language}

          Quiz Design Requirements:

          1. Cognitive Skill Assessment:
            - Include questions to test memory recall, problem-solving, attention span, logical reasoning
            - Use short and clear instructions
            - Record response time and accuracy

          2. Emotional Skill Assessment:
            - Include scenario-based questions to evaluate emotional awareness, stress handling, frustration tolerance, mood recognition
            - Use options like emojis or simple choices

          3. Behavioural Skill Assessment:
            - Include task-based questions to assess focus consistency, impulse control, task completion ability, reaction style

          Quiz Format:
          - Total Questions: 15
          - Difficulty: Adaptive based on performance
          - Question Types: Multiple-choice
          - Provide clear, simple wording and supportive tone

          Return ONLY a valid JSON array with this exact structure:
          [
            {
              "id": 1,
              "question": "question text",
              "skillType": "Cognitive",
              "difficulty": "Easy",
              "options": ["option1", "option2", "option3", "option4"],
              "correctAnswer": "option1",
              "timeLimit": 30,
              "behaviorIndicator": "Tests memory recall"
            }
          ]`

      const res = await fetch(`${backendURL}/quiz/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({ prompt, config: configWithLevel }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to generate quiz" }))
        throw new Error(errorData.detail || "Failed to generate quiz")
      }

      const data = await res.json()
      setQuestions(data.questions)
      console.log("Quiz questions loaded:", data.questions.length)
      showSuccessToast("Quiz generated successfully!")
    } catch (err: any) {
      console.error("Quiz generation error:", err)
      setGenerationError(true)
      showErrorToast(err.message || "Failed to generate quiz. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartQuiz = () => {
    console.log("Start Quiz clicked")
    setShowConfigDialog(true)
  }

  const handleConfigSubmit = async () => {
    console.log("Config submit clicked", quizConfig)
    
    if (!quizConfig.interests.trim()) {
      showErrorToast("Please enter your interests")
      return
    }
    
    // Close dialog and start quiz
    setShowConfigDialog(false)
    setQuizStarted(true)
    
    // Generate quiz
    await generateQuiz()
  }

  const handleAnswerSelect = (option: string) => {
    if (answerSubmitted) return
    
    setSelectedAnswer(option)
    setAnswerSubmitted(true)

    // Save the answer
    const newAnswer = {
      questionId: questions[currentQuestion].id,
      answer: option,
      timeSpent
    }

    setAnswers([...answers, newAnswer])
  }

  const handleNextQuestion = () => {
    setSelectedAnswer("")
    setAnswerSubmitted(false)
    setTimeSpent(0)
    setCurrentQuestion(currentQuestion + 1)
  }

  const handleSubmitQuiz = async () => {
    setQuizCompleted(true)
    
    try {
      const res = await fetch(`${backendURL}/quiz/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({ 
          userId: user?.id,
          answers: answers,
          questions 
        }),
      })

      if (res.ok) {
        showSuccessToast("Quiz submitted successfully!")
      }else{
        const errorData = await res.json().catch(() => ({ detail: "Failed to submit quiz" }))
        throw new Error(errorData.detail || "Failed to submit quiz")
      }
    } catch (err) {
      showErrorToast("Failed to submit quiz")
      console.error(err)
    }
  }

  const calculateScore = () => {
    let correct = 0
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId)
      if (question && answer.answer === question.correctAnswer) {
        correct++
      }
    })
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
  }

  const getSkillIcon = (skillType: string) => {
    switch (skillType) {
      case "Cognitive": return <Brain className="h-5 w-5 text-blue-500" />
      case "Emotional": return <Heart className="h-5 w-5 text-pink-500" />
      case "Behavioural": return <Target className="h-5 w-5 text-green-500" />
      default: return null
    }
  }

  const quizAttempts = user?.quizAttempts || 0
  const isQuizDisabled = quizAttempts >= 3
  
  if (!quizStarted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Adaptive Skills Assessment Quiz</CardTitle>
            <CardDescription>
              Take this personalized quiz to assess your cognitive, emotional, and behavioural skills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-semibold">Cognitive Skills</h3>
                      <p className="text-sm text-muted-foreground">Memory & Problem-solving</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-pink-500" />
                    <div>
                      <h3 className="font-semibold">Emotional Skills</h3>
                      <p className="text-sm text-muted-foreground">Awareness & Control</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Target className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-semibold">Behavioural Skills</h3>
                      <p className="text-sm text-muted-foreground">Focus & Task Completion</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-semibold">Quiz Information:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Total questions: 10-15 adaptive questions</li>
                <li>Designed for your learning level and interests</li>
                <li>Clear instructions with supportive tone</li>
                <li>Take your time - no pressure!</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Quiz Attempts: {quizAttempts} / 3</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {quizAttempts === 0 && "Beginner Level"}
                {quizAttempts === 1 && "Beginner Level"}
                {quizAttempts === 2 && "Intermediate Level"}
                {quizAttempts >= 3 && "Advanced Level"}
              </span>
            </div>

            {isQuizDisabled && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Maximum Attempts Reached</h4>
                  <p className="text-sm text-orange-800">
                    You have completed all 3 quiz attempts. Please check your dashboard for results and recommendations.
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleStartQuiz} 
              className="w-full disabled:bg-gray-400 disabled:text-gray-100 disabled:cursor-not-allowed disabled:opacity-60" 
              size="lg"
              type="button"
              disabled={isGenerating || isQuizDisabled}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Personalized Quiz...
                </>
              ) : isQuizDisabled ? (
                "Quiz Limit Reached"
              ) : (
                "Start Quiz"
              )}
            </Button>

            {/* Quiz Configuration Dialog */}
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Quiz Configuration</DialogTitle>
                  <DialogDescription>
                    Tell us a bit about yourself to personalize your quiz experience
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="5"
                      max="100"
                      value={quizConfig.age}
                      onChange={(e) => setQuizConfig({ ...quizConfig, age: parseInt(e.target.value) || 10 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      placeholder="e.g., 5, 6, 7"
                      value={quizConfig.grade}
                      onChange={(e) => setQuizConfig({ ...quizConfig, grade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialNeed">Special Need (Optional)</Label>
                    <Select
                      value={quizConfig.specialNeedType}
                      onValueChange={(value: any) => setQuizConfig({ ...quizConfig, specialNeedType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="ADHD">ADHD</SelectItem>
                        <SelectItem value="Dyslexia">Dyslexia</SelectItem>
                        <SelectItem value="Autism">Autism</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="interests">Your Interests *</Label>
                    <Input
                      id="interests"
                      placeholder="e.g., animals, sports, music, science"
                      value={quizConfig.interests}
                      onChange={(e) => setQuizConfig({ ...quizConfig, interests: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Preferred Language</Label>
                    <Select
                      value={quizConfig.language}
                      onValueChange={(value: any) => setQuizConfig({ ...quizConfig, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Tamil">Tamil</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-800">
                      <strong>Learning Level:</strong> {quizAttempts === 0 || quizAttempts === 1 ? "Beginner" : quizAttempts === 2 ? "Intermediate" : "Advanced"} (Auto-set based on attempts)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowConfigDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleConfigSubmit}>
                    Start Quiz
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (generationError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-red-900">Oops! Something went wrong</h3>
              <p className="text-muted-foreground">
                We're sorry, we can't generate any quizzes right now.
              </p>
              <p className="text-sm text-muted-foreground">
                This might be due to a temporary issue with our AI service. Please try again later.
              </p>
            </div>
            <Button 
              onClick={() => {
                setGenerationError(false)
                setQuizStarted(false)
                setQuestions([])
              }} 
              className="w-full max-w-xs"
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (quizCompleted) {
    const score = calculateScore()
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl">Quiz Completed! 🎉</CardTitle>
            <CardDescription>Great job completing the assessment!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <div className="text-6xl font-bold text-primary">{score.percentage}%</div>
              <p className="text-lg text-muted-foreground">
                You got {score.correct} out of {score.total} questions correct
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Brain className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <h4 className="font-semibold">Cognitive</h4>
                  <p className="text-sm text-muted-foreground">Skills assessed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Heart className="h-8 w-8 text-pink-500 mx-auto mb-2" />
                  <h4 className="font-semibold">Emotional</h4>
                  <p className="text-sm text-muted-foreground">Skills assessed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <h4 className="font-semibold">Behavioural</h4>
                  <p className="text-sm text-muted-foreground">Skills assessed</p>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-center">
                Your quiz has been submitted for teacher review. Once your teacher reviews and approves it, you'll see the detailed results and AI-powered recommendations in your dashboard.
              </p>
            </div>

            <Button 
              onClick={() => {
                setQuizStarted(false)
                setQuizCompleted(false)
                setCurrentQuestion(0)
                setAnswers([])
                setQuestions([])
                window.location.reload()
              }} 
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg">Generating your personalized quiz...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getSkillIcon(question.skillType)}
              <span className="text-sm font-medium">{question.skillType} Skill</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{timeSpent}s</span>
            </div>
          </div>
          <Progress value={progress} className="mb-4" />
          <div className="flex justify-between text-sm text-muted-foreground mb-4">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span className="px-2 py-1 bg-muted rounded-md text-xs font-medium">
              {question.difficulty}
            </span>
          </div>
          <CardTitle className="text-xl">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === option
              const isCorrect = option === question.correctAnswer
              const showFeedback = answerSubmitted && isSelected
              
              let bgClass = "bg-white hover:bg-accent"
              let borderClass = "border-2 border-gray-200"
              let textClass = ""
              
              if (showFeedback) {
                if (isCorrect) {
                  bgClass = "bg-green-100"
                  borderClass = "border-2 border-green-500"
                  textClass = "text-green-900 font-medium"
                } else {
                  bgClass = "bg-red-100"
                  borderClass = "border-2 border-red-500"
                  textClass = "text-red-900 font-medium"
                }
              } else if (isSelected && !answerSubmitted) {
                borderClass = "border-2 border-primary"
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={answerSubmitted}
                  className={`w-full text-left p-4 rounded-lg transition-all duration-300 ${bgClass} ${borderClass} ${textClass} ${
                    answerSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showFeedback && (
                      <span className="ml-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {answerSubmitted && (
            <div className="flex justify-end pt-4">
              {currentQuestion < questions.length - 1 ? (
                <Button onClick={handleNextQuestion} size="lg">
                  Next Question
                </Button>
              ) : (
                <Button onClick={handleSubmitQuiz} size="lg" className="bg-green-600 hover:bg-green-700">
                  Submit Quiz
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
