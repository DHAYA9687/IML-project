import os
from pymongo import MongoClient
import bcrypt
from dotenv import load_dotenv
import uuid

load_dotenv()

def create_teacher():
    # Connect to MongoDB
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("DEV_DATABASE", "iml_project")
    
    client = MongoClient(mongo_uri)
    db = client[db_name]
    users_collection = db["users"]
    
    print("--- Create Teacher Account ---")
    name = input("Enter Teacher Name: ")
    email = input("Enter Teacher Email: ")
    password = input("Enter Password: ")
    department = input("Enter Department (e.g. CSE): ")
    
    # Check if user exists
    if users_collection.find_one({"email": email}):
        print("Error: User with this email already exists.")
        return

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "_id": str(uuid.uuid4()), # Explicitly setting _id as string if that's what the app expects, or let mongo do it. 
                   # auth.py uses `str(uuid.uuid4())` for `user_id` but `users_collection.insert_one` usually auto-generates ObjectId `_id`.
                   # Let's check auth.py: 
                   # user_id = str(uuid.uuid4())
                   # new_user = { ... }
                   # users_collection.insert_one(new_user) 
                   # Wait, standard mongo insert_one adds `_id` as ObjectId if missing.
                   # `auth.py` returns `UserOut(id=user_id...)`. It does NOT save `user_id` as `_id` into the document unless specified.
                   # Let's check `auth.py` again.
                   # `new_user` dict does NOT have `_id` or `id` field in the code I saw.
                   # But `login` uses `str(db_user["_id"])`.
                   # So `_id` is generic ObjectId.
    }
    
    # Re-checking auth.py logic from Step 124:
    # user_id = str(uuid.uuid4()) <- this allows returning an ID immediately without fetching from DB?
    # users_collection.insert_one(new_user)
    # The `user_id` variable is actually NOT saved to the DB in `signup`! It's just returned to the API. 
    # The DB `_id` is ObjectId.
    # The `login` function casts `str(db_user["_id"])`.
    # So using standard insert is fine.
    
    teacher_user = {
        "name": name,
        "email": email,
        "password": hashed_password,
        "department": department,
        "role": "teacher", # This is the key
        "quizAttempts": 0
    }
    
    result = users_collection.insert_one(teacher_user)
    print(f"Teacher account created successfully! ID: {result.inserted_id}")
    print("You can now login with these credentials.")

if __name__ == "__main__":
    create_teacher()
