"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "./auth-provider"
import { Brain, Heart, Target, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
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
  const [quizConfig, setQuizConfig] = useState<QuizConfig>({
    age: 10,
    grade: "5",
    learningLevel: "beginner",
    specialNeedType: "None",
    interests: "animals",
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
    try {
      const prompt = `You are an expert educational psychologist and special education content designer.

Create an adaptive quiz to assess a student's cognitive, emotional, and behavioural skills. 
The quiz must be suitable for students with special educational needs and should be engaging, simple, and non-stressful.

Student Details:
- Age: ${quizConfig.age}
- Grade: ${quizConfig.grade}
- Learning Level: ${quizConfig.learningLevel}
- Special Need Type: ${quizConfig.specialNeedType}
- Interests: ${quizConfig.interests}
- Preferred Language: ${quizConfig.language}

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
- Total Questions: 12
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
        body: JSON.stringify({ prompt, config: quizConfig }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Failed to generate quiz" }))
        throw new Error(errorData.detail || "Failed to generate quiz")
      }

      const data = await res.json()
      setQuestions(data.questions)
      showSuccessToast("Quiz generated successfully!")
    } catch (err: any) {
      setGenerationError(true)
      showErrorToast(err.message || "Failed to generate quiz. Please try again.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleStartQuiz = async () => {
    if (questions.length === 0) {
      setQuizStarted(true)
      await generateQuiz()
    } else {
      setQuizStarted(true)
      setTimeSpent(0)
    }
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

    // Wait 1 second to show feedback, then move to next question
    setTimeout(() => {
      setAnswers([...answers, newAnswer])
      setSelectedAnswer("")
      setAnswerSubmitted(false)
      setTimeSpent(0)

      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1)
      } else {
        // Submit quiz with the final answer
        handleSubmitQuiz([...answers, newAnswer])
      }
    }, 1000)
  }

  const handleSubmitQuiz = async (allAnswers?: { questionId: number; answer: string; timeSpent: number }[]) => {
    setQuizCompleted(true)
    
    const answersToSubmit = allAnswers || answers
    
    try {
      const res = await fetch(`${backendURL}/quiz/submit`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        },
        body: JSON.stringify({ 
          userId: user?.id,
          answers: answersToSubmit,
          questions 
        }),
      })

      if (res.ok) {
        showSuccessToast("Quiz submitted successfully!")
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

            <Button 
              onClick={handleStartQuiz} 
              className="w-full" 
              size="lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Your Personalized Quiz...
                </>
              ) : (
                "Start Quiz"
              )}
            </Button>
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
                Your teacher will review your results and provide personalized feedback and recommendations.
              </p>
            </div>

            <Button 
              onClick={() => {
                setQuizStarted(false)
                setQuizCompleted(false)
                setCurrentQuestion(0)
                setAnswers([])
                setQuestions([])
              }} 
              className="w-full"
            >
              Take Another Quiz
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
        </CardContent>
      </Card>
    </div>
  )
}
