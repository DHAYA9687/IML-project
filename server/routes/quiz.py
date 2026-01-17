from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import re
import requests
from bson import ObjectId
from routes.get_user import get_current_user
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print("Gemini API Key:", GEMINI_API_KEY)

quiz_router = APIRouter(prefix="/quiz", tags=["Quiz"])


def call_gemini(prompt: str):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

    headers = {"Content-Type": "application/json"}

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.text}")

    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


class QuizConfig(BaseModel):
    age: int
    grade: str
    learningLevel: str
    specialNeedType: str
    interests: str
    language: str


class QuizGenerateRequest(BaseModel):
    prompt: str
    config: QuizConfig


class QuizQuestion(BaseModel):
    id: int
    question: str
    skillType: str
    difficulty: str
    options: List[str]
    correctAnswer: str
    timeLimit: int
    behaviorIndicator: str


class QuizAnswer(BaseModel):
    questionId: int
    answer: str
    timeSpent: int


class QuizSubmitRequest(BaseModel):
    userId: str
    answers: List[QuizAnswer]
    questions: List[QuizQuestion]


class TeacherCommentRequest(BaseModel):
    submissionId: str
    comments: str


class TeacherBulkSubmitRequest(BaseModel):
    submissionIds: List[str]


@quiz_router.post("/generate")
async def generate_quiz(
    request: Request,
    quiz_request: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate adaptive quiz questions using Gemini AI based on student profile
    """
    try:
        # Generate quiz using Gemini API
        response_text = call_gemini(quiz_request.prompt)

        # Try to find JSON array in the response
        json_match = re.search(r"\[.*\]", response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            questions = json.loads(json_str)
        else:
            # If no JSON found, try parsing the entire response
            questions = json.loads(response_text)

        # Validate and ensure proper structure
        validated_questions = []
        for i, q in enumerate(questions):
            validated_questions.append(
                {
                    "id": i + 1,
                    "question": q.get("question", ""),
                    "skillType": q.get("skillType", "Cognitive"),
                    "difficulty": q.get("difficulty", "Easy"),
                    "options": q.get("options", []),
                    "correctAnswer": q.get("correctAnswer", ""),
                    "timeLimit": q.get("timeLimit", 30),
                    "behaviorIndicator": q.get("behaviorIndicator", ""),
                }
            )

        # Store quiz generation in database
        quiz_data = {
            "userId": current_user["id"],
            "config": quiz_request.config.dict(),
            "questions": validated_questions,
            "generatedAt": datetime.utcnow(),
            "status": "generated",
        }

        result = request.app.database["quizzes"].insert_one(quiz_data)

        return JSONResponse(
            content={
                "success": True,
                "quizId": str(result.inserted_id),
                "questions": validated_questions,
            },
            status_code=200,
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate quiz: {str(e)}"
        )


@quiz_router.post("/submit")
async def submit_quiz_for_review(
    request: Request,
    quiz_submission: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Student submits quiz answers for teacher review (without AI analysis yet)
    """
    try:
        # Calculate score and analyze performance
        total_questions = len(quiz_submission.questions)
        correct_answers = 0
        skill_performance = {
            "Cognitive": {"correct": 0, "total": 0},
            "Emotional": {"correct": 0, "total": 0},
            "Behavioural": {"correct": 0, "total": 0},
        }

        detailed_results = []

        for answer in quiz_submission.answers:
            question = next(
                (q for q in quiz_submission.questions if q.id == answer.questionId),
                None,
            )

            if question:
                is_correct = answer.answer == question.correctAnswer
                
                # Normalize skill type to handle both British and American spelling
                skill_type = question.skillType
                if skill_type == "Behavioral":
                    skill_type = "Behavioural"

                if is_correct:
                    correct_answers += 1
                    skill_performance[skill_type]["correct"] += 1

                skill_performance[skill_type]["total"] += 1

                detailed_results.append(
                    {
                        "questionId": question.id,
                        "question": question.question,
                        "skillType": skill_type,
                        "userAnswer": answer.answer,
                        "correctAnswer": question.correctAnswer,
                        "isCorrect": is_correct,
                        "timeSpent": answer.timeSpent,
                    }
                )

        score_percentage = round((correct_answers / total_questions) * 100, 2)

        # Analyze strengths and weaknesses
        strengths = []
        weaknesses = []

        for skill, performance in skill_performance.items():
            if performance["total"] > 0:
                skill_percentage = (performance["correct"] / performance["total"]) * 100
                if skill_percentage >= 70:
                    strengths.append(skill)
                elif skill_percentage < 50:
                    weaknesses.append(skill)

        # Store submission in database as PENDING review
        submission_data = {
            "userId": current_user["id"],
            "userName": current_user.get("name", "Unknown"),
            "userEmail": current_user.get("email", ""),
            "submittedAt": datetime.utcnow(),
            "score": score_percentage,
            "correctAnswers": correct_answers,
            "totalQuestions": total_questions,
            "skillPerformance": skill_performance,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "detailedResults": detailed_results,
            "status": "pending_review",  # pending_review, reviewed, completed
            "teacherComments": "",
            "recommendations": [],
            "explanation": "",
        }

        result = request.app.database["quiz_submissions"].insert_one(submission_data)

        # Increment user's quiz attempts counter (convert string ID to ObjectId)
        from bson import ObjectId as BsonObjectId
        try:
            user_obj_id = BsonObjectId(current_user["id"])
        except:
            user_obj_id = current_user["id"]  # If already ObjectId or other format
        
        request.app.database["users"].update_one(
            {"_id": user_obj_id}, {"$inc": {"quizAttempts": 1}}
        )

        return JSONResponse(
            content={
                "success": True,
                "submissionId": str(result.inserted_id),
                "score": score_percentage,
                "correctAnswers": correct_answers,
                "totalQuestions": total_questions,
                "skillPerformance": skill_performance,
                "strengths": strengths,
                "weaknesses": weaknesses,
                "status": "pending_review",
                "message": "Quiz submitted for teacher review",
            },
            status_code=200,
        )

    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")


@quiz_router.get("/all-submissions")
async def get_all_submissions(
    request: Request, current_user: dict = Depends(get_current_user)
):
    """
    Get all quiz submissions (for teachers)
    """
    try:
        # Check if user is a teacher
        if current_user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Access denied. Teachers only.")

        submissions = list(
            request.app.database["quiz_submissions"].find({}).sort("submittedAt", -1)
        )

        # Convert ObjectId to string and datetime fields to ISO format
        for submission in submissions:
            submission["_id"] = str(submission["_id"])
            if "submittedAt" in submission and submission["submittedAt"]:
                submission["submittedAt"] = submission["submittedAt"].isoformat()
            if "reviewedAt" in submission and submission["reviewedAt"]:
                submission["reviewedAt"] = submission["reviewedAt"].isoformat()
            if "completedAt" in submission and submission["completedAt"]:
                submission["completedAt"] = submission["completedAt"].isoformat()

        return JSONResponse(
            content={"success": True, "submissions": submissions}, status_code=200
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch submissions: {str(e)}"
        )


@quiz_router.post("/teacher-comment")
async def add_teacher_comment(
    request: Request,
    comment_request: TeacherCommentRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Teacher adds comments to a student's quiz submission
    """
    try:
        # Check if user is a teacher
        if current_user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Access denied. Teachers only.")

        # Update the submission with teacher comments
        result = request.app.database["quiz_submissions"].update_one(
            {"_id": ObjectId(comment_request.submissionId)},
            {
                "$set": {
                    "teacherComments": comment_request.comments,
                    "reviewedBy": current_user["name"],
                    "reviewedAt": datetime.utcnow(),
                    "status": "reviewed",
                }
            },
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Submission not found")

        return JSONResponse(
            content={"success": True, "message": "Comment added successfully"},
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add comment: {str(e)}")


@quiz_router.post("/teacher-submit/{submission_id}")
async def teacher_submit_single(
    request: Request,
    submission_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Teacher submits a single quiz for AI analysis and final processing
    """
    try:
        # Check if user is a teacher
        if current_user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Access denied. Teachers only.")

        # Get the submission
        submission = request.app.database["quiz_submissions"].find_one(
            {"_id": ObjectId(submission_id)}
        )

        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")

        # Generate AI recommendations
        score_percentage = submission["score"]
        correct_answers = submission["correctAnswers"]
        total_questions = submission["totalQuestions"]
        skill_performance = submission["skillPerformance"]

        recommendation_prompt = f"""
        Based on the following quiz results, provide personalized learning recommendations:
        
        Score: {score_percentage}%
        Correct Answers: {correct_answers}/{total_questions}
        
        Skill Performance:
        - Cognitive: {skill_performance['Cognitive']['correct']}/{skill_performance['Cognitive']['total']}
        - Emotional: {skill_performance['Emotional']['correct']}/{skill_performance['Emotional']['total']}
        - Behavioural: {skill_performance['Behavioural']['correct']}/{skill_performance['Behavioural']['total']}
        
        Teacher Comments: {submission.get('teacherComments', 'None')}
        
        Provide:
        1. 3-5 specific, actionable recommendations for improvement
        2. A brief explanation of the student's performance pattern
        
        Format as JSON:
        {{
            "recommendations": ["recommendation1", "recommendation2", ...],
            "explanation": "explanation text"
        }}
        """

        ai_text = call_gemini(recommendation_prompt)

        # Parse AI recommendations
        try:
            json_match = re.search(r"\{.*\}", ai_text, re.DOTALL)
            if json_match:
                ai_analysis = json.loads(json_match.group(0))
            else:
                ai_analysis = {
                    "recommendations": ["Practice regularly", "Focus on weaker areas"],
                    "explanation": "Continue practicing to improve your skills.",
                }
        except:
            ai_analysis = {
                "recommendations": ["Practice regularly", "Focus on weaker areas"],
                "explanation": "Continue practicing to improve your skills.",
            }

        # Update submission with AI analysis and mark as completed
        request.app.database["quiz_submissions"].update_one(
            {"_id": ObjectId(submission_id)},
            {
                "$set": {
                    "recommendations": ai_analysis.get("recommendations", []),
                    "explanation": ai_analysis.get("explanation", ""),
                    "status": "completed",
                    "completedAt": datetime.utcnow(),
                    "completedBy": current_user["name"],
                }
            },
        )

        return JSONResponse(
            content={
                "success": True,
                "message": "Quiz submitted successfully with AI recommendations",
                "recommendations": ai_analysis.get("recommendations", []),
                "explanation": ai_analysis.get("explanation", ""),
            },
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit quiz: {str(e)}")


@quiz_router.post("/teacher-submit-bulk")
async def teacher_submit_bulk(
    request: Request,
    bulk_request: TeacherBulkSubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Teacher submits multiple quizzes for AI analysis and final processing
    """
    try:
        # Check if user is a teacher
        if current_user.get("role") != "teacher":
            raise HTTPException(status_code=403, detail="Access denied. Teachers only.")

        processed_count = 0
        failed_count = 0

        for submission_id in bulk_request.submissionIds:
            try:
                # Get the submission
                submission = request.app.database["quiz_submissions"].find_one(
                    {"_id": ObjectId(submission_id)}
                )

                if not submission:
                    failed_count += 1
                    continue

                # Generate AI recommendations
                score_percentage = submission["score"]
                correct_answers = submission["correctAnswers"]
                total_questions = submission["totalQuestions"]
                skill_performance = submission["skillPerformance"]

                recommendation_prompt = f"""
                Based on the following quiz results, provide personalized learning recommendations:
                
                Score: {score_percentage}%
                Correct Answers: {correct_answers}/{total_questions}
                
                Skill Performance:
                - Cognitive: {skill_performance['Cognitive']['correct']}/{skill_performance['Cognitive']['total']}
                - Emotional: {skill_performance['Emotional']['correct']}/{skill_performance['Emotional']['total']}
                - Behavioural: {skill_performance['Behavioural']['correct']}/{skill_performance['Behavioural']['total']}
                
                Teacher Comments: {submission.get('teacherComments', 'None')}
                
                Provide:
                1. 3-5 specific, actionable recommendations for improvement
                2. A brief explanation of the student's performance pattern
                
                Format as JSON:
                {{
                    "recommendations": ["recommendation1", "recommendation2", ...],
                    "explanation": "explanation text"
                }}
                """

                ai_text = call_gemini(recommendation_prompt)

                # Parse AI recommendations
                try:
                    json_match = re.search(r"\{.*\}", ai_text, re.DOTALL)
                    if json_match:
                        ai_analysis = json.loads(json_match.group(0))
                    else:
                        ai_analysis = {
                            "recommendations": [
                                "Practice regularly",
                                "Focus on weaker areas",
                            ],
                            "explanation": "Continue practicing to improve your skills.",
                        }
                except:
                    ai_analysis = {
                        "recommendations": [
                            "Practice regularly",
                            "Focus on weaker areas",
                        ],
                        "explanation": "Continue practicing to improve your skills.",
                    }

                # Update submission
                request.app.database["quiz_submissions"].update_one(
                    {"_id": ObjectId(submission_id)},
                    {
                        "$set": {
                            "recommendations": ai_analysis.get("recommendations", []),
                            "explanation": ai_analysis.get("explanation", ""),
                            "status": "completed",
                            "completedAt": datetime.utcnow(),
                            "completedBy": current_user["name"],
                        }
                    },
                )

                processed_count += 1

            except Exception as e:
                print(f"Error processing submission {submission_id}: {str(e)}")
                failed_count += 1
                continue

        return JSONResponse(
            content={
                "success": True,
                "message": f"Processed {processed_count} submissions successfully",
                "processed": processed_count,
                "failed": failed_count,
            },
            status_code=200,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to bulk submit: {str(e)}")


# @quiz_router.get("/results/{user_id}")
# async def get_quiz_results(
#     request: Request, user_id: str, current_user: dict = Depends(get_current_user)
# ):
#     """
#     Get all quiz results for a specific user
#     """
#     try:
#         # Ensure user can only access their own results or teacher can access all
#         if current_user["id"] != user_id and "teacher" not in current_user.get(
#             "role", []
#         ):
#             raise HTTPException(status_code=403, detail="Access denied")

#         results = list(
#             request.app.database["quiz_submissions"]
#             .find({"userId": user_id})
#             .sort("submittedAt", -1)
#         )

#         # Convert ObjectId to string
#         for result in results:
#             result["_id"] = str(result["_id"])
#             result["submittedAt"] = result["submittedAt"].isoformat()

#         return JSONResponse(
#             content={"success": True, "results": results}, status_code=200
#         )

#     except HTTPException:
#         raise
#     except Exception as e:
#         raise HTTPException(
#             status_code=500, detail=f"Failed to fetch quiz results: {str(e)}"
#         )


@quiz_router.get("/history")
async def get_user_quiz_history(
    request: Request, current_user: dict = Depends(get_current_user)
):
    """
    Get quiz history for the current user (only completed quizzes)
    """
    try:
        results = list(
            request.app.database["quiz_submissions"]
            .find({"userId": current_user["id"]})
            .sort("submittedAt", -1)
            .limit(10)
        )

        # Convert ObjectId to string and datetime fields to ISO format
        for result in results:
            result["_id"] = str(result["_id"])
            if "submittedAt" in result and result["submittedAt"]:
                result["submittedAt"] = result["submittedAt"].isoformat()
            if "reviewedAt" in result and result["reviewedAt"]:
                result["reviewedAt"] = result["reviewedAt"].isoformat()
            if "completedAt" in result and result["completedAt"]:
                result["completedAt"] = result["completedAt"].isoformat()

        return JSONResponse(
            content={"success": True, "results": results}, status_code=200
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch quiz history: {str(e)}"
        )
