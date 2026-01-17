# ML-Enhanced Quiz System Implementation

## Overview
This implementation integrates Machine Learning predictions with SHAP and LIME explanations into the adaptive quiz system.

## Architecture Flow

```
Student Submits Quiz
        ↓
Feature Engineering (ml_service.py)
        ↓
ML Model Prediction (Risk: Low/Medium/High)
        ↓
SHAP Explanation (Feature Importance)
        ↓
LIME Explanation (Human-Readable Rules)
        ↓
Store in MongoDB (mlAnalytics + mlPrediction)
        ↓
Teacher Reviews & Submits
        ↓
Gemini AI (with ML insights)
        ↓
Natural Language Recommendations
        ↓
Display in Frontend
```

## Implementation Details

### 1. Feature Engineering (`ml_service.py`)

**Features Extracted:**
- `overall_accuracy`: Total correct/total questions
- `cognitive_accuracy`: Performance on cognitive questions
- `emotional_accuracy`: Performance on emotional questions
- `behavioural_accuracy`: Performance on behavioural questions
- `avg_time_spent`: Average time per question
- `negative_coping_responses`: Count of negative emotional indicators
- `emotional_regulation_score`: Positive coping ratio
- `attention_variance`: Consistency of attention (time variance)

### 2. ML Model Integration

**Current Implementation:**
- Mock ML model for demonstration
- Returns risk predictions: 0=Low, 1=Medium, 2=High
- Probability distribution for each risk level

**For Production:**
Replace `MockMLModel` with your trained model:
```python
import pickle
model = pickle.load(open("trained_model.pkl", "rb"))
```

Train your model:
```python
from sklearn.tree import DecisionTreeClassifier

X_train = [...]  # Feature vectors
y_train = [...]  # Risk labels

model = DecisionTreeClassifier(max_depth=4, random_state=42)
model.fit(X_train, y_train)
```

### 3. SHAP Integration

**Purpose:** Quantitative feature importance
**Current:** Mock SHAP values
**For Production:**
```python
import shap
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_student)
```

**Output Format:**
```json
{
  "cognitive_accuracy": -0.42,
  "negative_coping_responses": 0.26,
  "emotional_accuracy": -0.18
}
```

### 4. LIME Integration

**Purpose:** Local, human-readable explanations
**Current:** Mock LIME rules
**For Production:**
```python
from lime.lime_tabular import LimeTabularExplainer

explainer = LimeTabularExplainer(
    training_data=X_train,
    feature_names=feature_names,
    class_names=["Low", "Medium", "High"],
    mode="classification"
)

exp = explainer.explain_instance(
    X_student[0],
    model.predict_proba,
    num_features=5
)
```

**Output Format:**
```json
{
  "cognitive_accuracy <= 0.30": 0.41,
  "negative_coping_count > 2": 0.27,
  "emotional_accuracy <= 0.50": 0.19
}
```

### 5. Database Schema

**Quiz Submission Document:**
```json
{
  "_id": ObjectId,
  "userId": string,
  "userName": string,
  "score": number,
  "mlAnalytics": {
    "overall_accuracy": 0.467,
    "cognitive_accuracy": 0.20,
    "emotional_accuracy": 0.40,
    "behavioural_accuracy": 0.80,
    "avg_time_spent": 1.4,
    "negative_coping_responses": 3,
    "emotional_regulation_score": 0.4,
    "attention_variance": 0.3
  },
  "mlPrediction": {
    "predicted_risk": 1,
    "risk_label": "Medium Risk",
    "confidence": 0.6,
    "probabilities": {
      "low": 0.2,
      "medium": 0.6,
      "high": 0.2
    },
    "features": {...},
    "shap_explanation": {...},
    "lime_explanation": {...}
  }
}
```

### 6. Gemini Integration

**Enhanced Prompt:**
The ML insights are formatted and added to the Gemini prompt:
- Risk assessment with confidence
- Top SHAP features (most influential)
- LIME rules (human-readable conditions)
- Key metrics summary

This allows Gemini to generate recommendations that:
1. Address the specific risk factors identified
2. Consider feature importance from SHAP
3. Explain based on LIME rules
4. Provide actionable, personalized advice

### 7. Frontend Display

**Teacher Dashboard Shows:**
- ML Risk Assessment card with confidence
- Risk probability distribution (Low/Medium/High)
- SHAP feature importance visualization
- LIME explanation rules
- AI recommendations incorporating ML insights

## Installation

```bash
cd server
pip install -r requirements.txt
```

For production ML explanations, uncomment in requirements.txt:
```bash
pip install shap>=0.42.0
pip install lime>=0.2.0.1
```

## Usage

### Student Workflow:
1. Student takes quiz
2. System automatically:
   - Calculates mlAnalytics
   - Runs ML prediction
   - Generates SHAP/LIME explanations
   - Stores everything in DB

### Teacher Workflow:
1. Teacher sees submission with ML risk assessment
2. Teacher adds comments and reviews
3. Teacher clicks "Submit"
4. System:
   - Formats ML insights for Gemini
   - Gets AI recommendations
   - Displays to teacher and student

## Key Files Modified

**Backend:**
- `ml_service.py` (NEW): ML prediction and XAI logic
- `routes/quiz.py`: 
  - Imports ml_service
  - Calls ML prediction on submission
  - Formats ML insights for Gemini
- `requirements.txt`: Added numpy, scikit-learn

**Frontend:**
- `components/teacher-dashboard.tsx`:
  - Added mlPrediction interface
  - Added ML visualization in detail dialog
  - Shows SHAP and LIME explanations

## Next Steps for Production

1. **Train Your Model:**
   - Collect real quiz data
   - Extract features using `extract_features()`
   - Train DecisionTree/RandomForest
   - Save model: `pickle.dump(model, open("model.pkl", "wb"))`

2. **Add Real SHAP/LIME:**
   - Install: `pip install shap lime`
   - Replace mock functions with real implementations
   - Uncomment production code in `ml_service.py`

3. **Model Management:**
   - Store model file in server directory
   - Load at startup or cache in memory
   - Version control your models

4. **Monitoring:**
   - Log predictions and confidence scores
   - Track model performance
   - Retrain periodically with new data

## Benefits

1. **Explainable AI:** Teachers understand WHY the ML makes predictions
2. **Personalized:** Recommendations tailored to specific weaknesses
3. **Early Intervention:** Identify at-risk students automatically
4. **Data-Driven:** Uses quantitative metrics for assessment
5. **Special Education Focus:** Tracks emotional regulation and attention patterns
