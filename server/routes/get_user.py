from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt
import os
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        user_id = payload.get("id")
        name = payload.get("name")
        email: str = payload.get("email")
        rollNo: str = payload.get("rollNo")
        department: str = payload.get("department")
        age: int = payload.get("age")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "rollNo": rollNo,
            "department": department,
            "age": age,
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
