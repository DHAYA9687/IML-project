from datetime import datetime, timedelta
import os
from fastapi.responses import JSONResponse
import jwt
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr
from typing import Optional
from fastapi.security import OAuth2PasswordBearer
import bcrypt

from fastapi import APIRouter, Depends, HTTPException, Request
import uuid

from routes.get_user import get_current_user

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])


class UserBase(BaseModel):
    name: str
    email: EmailStr
    rollNo: Optional[str] = None
    department: str = None
    age: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    department: str
    password: str


class UserOut(UserBase):
    id: str
    role: str


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


@auth_router.post("/signup", response_model=UserOut)
async def signup(request: Request, user: UserCreate):
    db = request.app.database
    users_collection = db["users"]

    # Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = str(uuid.uuid4())
    new_user = {
        "name": user.name,
        "email": user.email,
        "password": get_password_hash(user.password),
        "department": user.department,
        "role": "student",
        "rollNo": user.rollNo,
        "age": user.age,
        "quizAttempts": 0,
    }
    users_collection.insert_one(new_user)

    return UserOut(
        id=user_id,
        name=user.name,
        email=user.email,
        role="student",
        rollNo=user.rollNo,
        department=user.department,
        age=user.age,
    )


@auth_router.post("/login", response_model=dict) # not UserOut since we add token
async def login(request: Request, user: UserLogin):
    db = request.app.database
    users_collection = db["users"]

    db_user = users_collection.find_one({"email": user.email})
    if (
        not db_user
        or not verify_password(user.password, db_user["password"])
        or not db_user["department"] == user.department
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Prepare user data + token
    user_data = {
        "id": str(db_user["_id"]),
        "name": db_user["name"],
        "email": db_user["email"],
        "role": db_user.get("role", "student"),
        "department": db_user["department"],
        "rollNo": db_user.get("rollNo"),
        "age": db_user.get("age"),
        "quizAttempts": db_user.get("quizAttempts", 0),
    }

    token = create_access_token({**user_data})

    return {
        "user": user_data,
        "access_token": token,
    }



@auth_router.get("/me")
def read_users_me(request: Request, current_user: dict = Depends(get_current_user)):
    """
    Get current user info with fresh data from database
    """
    db = request.app.database
    users_collection = db["users"]

    # Fetch fresh user data from database to get updated quizAttempts
    db_user = users_collection.find_one({"email": current_user["email"]})

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_data = {
        "id": str(db_user["_id"]),
        "name": db_user["name"],
        "email": db_user["email"],
        "role": db_user.get("role", "student"),
        "department": db_user["department"],
        "rollNo": db_user.get("rollNo"),
        "age": db_user.get("age"),
        "quizAttempts": db_user.get("quizAttempts", 0),
    }

    return {"user": user_data}


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
