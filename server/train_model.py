import numpy as np
import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import random

def generate_synthetic_data(n_samples=1000):
    """
    Generates synthetic student performance data for training.
    
    Features matching ml_service.py:
    - overall_accuracy (0.0 - 1.0)
    - cognitive_accuracy (0.0 - 1.0)
    - emotional_accuracy (0.0 - 1.0)
    - behavioural_accuracy (0.0 - 1.0)
    - avg_time_spent (seconds per question, e.g., 0.5 - 5.0)
    - negative_coping_responses (count, 0 - 10)
    - emotional_regulation_score (0.0 - 1.0)
    - attention_variance (0.0 - 1.0)
    
    Target:
    - risk_level (0=Low, 1=Medium, 2=High)
    """
    data = []
    
    for _ in range(n_samples):
        # Randomize base performance (good, avg, poor students)
        student_type = random.choices(['good', 'avg', 'struggling'], weights=[0.3, 0.4, 0.3])[0]
        
        if student_type == 'good':
            overall_acc = random.uniform(0.75, 1.0)
            cog_acc = random.uniform(0.7, 1.0)
            neg_coping = random.randint(0, 2)
            risk = 0 # Low Risk
        elif student_type == 'avg':
            overall_acc = random.uniform(0.5, 0.75)
            cog_acc = random.uniform(0.4, 0.7)
            neg_coping = random.randint(1, 4)
            risk = 1 # Medium Risk
        else:
            overall_acc = random.uniform(0.0, 0.5)
            cog_acc = random.uniform(0.0, 0.4)
            neg_coping = random.randint(3, 8)
            risk = 2 # High Risk
            
        # Add some noise/variance to other features
        row = {
            "overall_accuracy": overall_acc,
            "cognitive_accuracy": cog_acc,
            "emotional_accuracy": random.uniform(0.0, 1.0),
            "behavioural_accuracy": random.uniform(0.0, 1.0),
            "avg_time_spent": random.uniform(0.5, 5.0),
            "negative_coping_responses": neg_coping,
            "emotional_regulation_score": random.uniform(0.0, 1.0),
            "attention_variance": random.uniform(0.0, 1.0),
            "risk_label": risk
        }
        data.append(row)
        
    return pd.DataFrame(data)

def train_model():
    print("Generating synthetic training data...")
    df = generate_synthetic_data(1000)
    
    # Separate Features (X) and Target (y)
    X = df.drop("risk_label", axis=1)
    y = df["risk_label"]
    
    # Feature names for reference
    print("Feature columns:", list(X.columns))
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples...")
    
    # Initialize and Train Classifier (Decision Tree for interpretability)
    # Reducing max_depth prevents overfitting and makes SHAP/LIME explanation cleaner
    clf = DecisionTreeClassifier(max_depth=5, random_state=42)
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Low Risk", "Medium Risk", "High Risk"]))
    
    # Save the model
    model_filename = "model.pkl"
    with open(model_filename, "wb") as f:
        pickle.dump(clf, f)
        
    print(f"\nModel saved to {model_filename}")
    print("You can now uncomment the pickle loading code in 'ml_service.py' to use this model.")

if __name__ == "__main__":
    train_model()
