"use client"

import { useCallback, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "./auth-provider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Brain, Users, Filter, MessageSquare, Send, CheckCircle, Clock, Eye, TrendingUp, TrendingDown, Loader2 } from "lucide-react"

interface QuizSubmission {
  _id: string
  userId: string
  userName: string
  userEmail: string
  score: number
  correctAnswers: number
  totalQuestions: number
  submittedAt: string
  status: "pending_review" | "reviewed" | "completed"
  teacherComments?: string
  reviewedBy?: string
  reviewedAt?: string
  completedBy?: string
  completedAt?: string
  skillPerformance: {
    Cognitive: { correct: number; total: number }
    Emotional: { correct: number; total: number }
    Behavioural: { correct: number; total: number }
  }
  strengths: string[]
  weaknesses: string[]
  recommendations?: string[]
  explanation?: string
}

export function TeacherDashboard() {
  const { user, loading, logout, showSuccessToast, showErrorToast } = useAuth()
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [comments, setComments] = useState<{ [key: string]: string }>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [commentingIds, setCommentingIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<"all" | "pending_review" | "reviewed" | "completed">("all")
  const [searchTerm, setSearchTerm] = useState("")

  const backendURL = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (user?.role === "teacher") {
      fetchSubmissions()
    }
  }, [user])

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true)
    try {
      const res = await fetch(`${backendURL}/quiz/all-submissions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.submissions || [])
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err)
      showErrorToast("Failed to load submissions")
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const handleAddComment = async (submissionId: string) => {
    const comment = comments[submissionId]
    if (!comment?.trim()) {
      showErrorToast("Please enter a comment")
      return
    }

    setCommentingIds(new Set(commentingIds).add(submissionId))
    try {
      const res = await fetch(`${backendURL}/quiz/teacher-comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          submissionId,
          comments: comment,
        }),
      })

      if (res.ok) {
        showSuccessToast("Comment added successfully")
        setComments({ ...comments, [submissionId]: "" })
        fetchSubmissions()
      } else {
        showErrorToast("Failed to add comment")
      }
    } catch (err) {
      console.error(err)
      showErrorToast("Failed to add comment")
    } finally {
      setCommentingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(submissionId)
        return newSet
      })
    }
  }

  const handleSubmitSingle = async (submissionId: string) => {
    setProcessingIds(new Set(processingIds).add(submissionId))
    try {
      const res = await fetch(`${backendURL}/quiz/teacher-submit/${submissionId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      })

      if (res.ok) {
        showSuccessToast("Quiz submitted successfully with AI recommendations")
        fetchSubmissions()
      } else {
        showErrorToast("Failed to submit quiz")
      }
    } catch (err) {
      console.error(err)
      showErrorToast("Failed to submit quiz")
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(submissionId)
        return newSet
      })
    }
  }

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0) {
      showErrorToast("Please select submissions to submit")
      return
    }

    // Filter to only send pending submissions
    const pendingIds = Array.from(selectedIds).filter(id => {
      const submission = submissions.find(s => s._id === id)
      return submission?.status === "pending_review"
    })

    if (pendingIds.length === 0) {
      showErrorToast("No pending submissions selected")
      return
    }

    setProcessingIds(new Set(pendingIds))

    try {
      const res = await fetch(`${backendURL}/quiz/teacher-submit-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          submissionIds: pendingIds,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        showSuccessToast(`Successfully processed ${data.processed} submissions`)
        setSelectedIds(new Set())
        fetchSubmissions()
      } else {
        showErrorToast("Failed to bulk submit")
      }
    } catch (err) {
      console.error(err)
      showErrorToast("Failed to bulk submit")
    } finally {
      setProcessingIds(new Set())
    }
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const toggleSelectAll = () => {
    const pendingSubmissions = filteredSubmissions.filter(s => s.status === "pending_review")
    if (selectedIds.size === pendingSubmissions.length && pendingSubmissions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingSubmissions.map((s) => s._id)))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "teacher") {
    return <h1>Access Denied. Teachers only.</h1>
  }

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStatus = filterStatus === "all" || sub.status === filterStatus
    const matchesSearch =
      sub.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const pendingCount = submissions.filter((s) => s.status === "pending_review").length
  const reviewedCount = submissions.filter((s) => s.status === "reviewed").length
  const completedCount = submissions.filter((s) => s.status === "completed").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case "reviewed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><MessageSquare className="h-3 w-3 mr-1" />Reviewed</Badge>
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All student quizzes</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus("pending_review")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus("reviewed")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{reviewedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">With comments</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setFilterStatus("completed")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Finalized</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Quiz Submissions
                </CardTitle>
                <CardDescription>Review, comment, and approve student quiz submissions</CardDescription>
              </div>
              {selectedIds.size > 0 && (
                <Button onClick={handleBulkSubmit} disabled={processingIds.size > 0}>
                  {processingIds.size > 0 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Selected ({selectedIds.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by student name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Tabs value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending_review">Pending</TabsTrigger>
                  <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Table */}
        <Card>
          <CardContent className="p-0">
            {loadingSubmissions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
                <p className="text-muted-foreground">There are no quiz submissions matching your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow key={submission._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(submission._id)}
                            onCheckedChange={() => toggleSelection(submission._id)}
                            disabled={submission.status !== "pending_review"}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{submission.userName}</div>
                            <div className="text-xs text-muted-foreground">{submission.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{submission.score}%</span>
                            {submission.score >= 70 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.correctAnswers}/{submission.totalQuestions} correct
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>Cog: {submission.skillPerformance.Cognitive.correct}/{submission.skillPerformance.Cognitive.total}</div>
                            <div>Emo: {submission.skillPerformance.Emotional.correct}/{submission.skillPerformance.Emotional.total}</div>
                            <div>Beh: {submission.skillPerformance.Behavioural.correct}/{submission.skillPerformance.Behavioural.total}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(submission.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">{new Date(submission.submittedAt).toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          {submission.status !== "completed" ? (
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Add comment..."
                                value={comments[submission._id] || submission.teacherComments || ""}
                                onChange={(e) => setComments({ ...comments, [submission._id]: e.target.value })}
                                className="w-40"
                              />
                              <Button 
                                size="sm" 
                                onClick={() => handleAddComment(submission._id)}
                                disabled={commentingIds.has(submission._id)}
                                title="Add comment and mark as reviewed"
                              >
                                {commentingIds.has(submission._id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="text-sm max-w-xs truncate">{submission.teacherComments || "—"}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSubmission(submission)
                                setShowDetailDialog(true)
                              }}
                              title="View submission details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {submission.status !== "completed" && (
                              <Button
                                size="sm"
                                onClick={() => handleSubmitSingle(submission._id)}
                                disabled={processingIds.has(submission._id) || submission.status === "pending_review"}
                                title="Generate AI recommendations and complete review"
                              >
                                {processingIds.has(submission._id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedSubmission && (
            <>
              <DialogHeader>
                <DialogTitle>Quiz Submission Details</DialogTitle>
                <DialogDescription>
                  {selectedSubmission.userName} - Submitted on {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedSubmission.score}%</div>
                      <p className="text-xs text-muted-foreground">
                        {selectedSubmission.correctAnswers}/{selectedSubmission.totalQuestions} correct
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {getStatusBadge(selectedSubmission.status)}
                      {selectedSubmission.reviewedBy && (
                        <p className="text-xs text-muted-foreground mt-2">Reviewed by {selectedSubmission.reviewedBy}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Skill Performance</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Brain className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                          <div className="text-sm font-semibold">Cognitive</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedSubmission.skillPerformance.Cognitive.correct}/{selectedSubmission.skillPerformance.Cognitive.total}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Brain className="h-6 w-6 mx-auto mb-2 text-pink-500" />
                          <div className="text-sm font-semibold">Emotional</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedSubmission.skillPerformance.Emotional.correct}/{selectedSubmission.skillPerformance.Emotional.total}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-center">
                          <Brain className="h-6 w-6 mx-auto mb-2 text-green-500" />
                          <div className="text-sm font-semibold">Behavioural</div>
                          <div className="text-xs text-muted-foreground">
                            {selectedSubmission.skillPerformance.Behavioural.correct}/{selectedSubmission.skillPerformance.Behavioural.total}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Strengths
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmission.strengths.map((strength, idx) => (
                        <Badge key={idx} className="bg-green-100 text-green-800">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-orange-600" />
                      Weaknesses
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSubmission.weaknesses.map((weakness, idx) => (
                        <Badge key={idx} className="bg-orange-100 text-orange-800">
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedSubmission.teacherComments && (
                  <div>
                    <h4 className="font-semibold mb-2">Teacher Comments</h4>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm">{selectedSubmission.teacherComments}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedSubmission.recommendations && selectedSubmission.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">AI Recommendations</h4>
                    <Card>
                      <CardContent className="pt-4">
                        <ul className="space-y-2">
                          {selectedSubmission.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedSubmission.explanation && (
                  <div>
                    <h4 className="font-semibold mb-2">Explanation</h4>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">{selectedSubmission.explanation}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
