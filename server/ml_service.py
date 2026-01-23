"""
ML Service for Quiz Analysis with SHAP and LIME Explanations
"""
import numpy as np
from typing import Dict, List, Any
import pickle
import os

# For now, we'll use a mock model. You can replace this with your trained model.
class MockMLModel:
    """Mock ML model for demonstration. Replace with your trained DecisionTree/RandomForest"""
    
    def predict(self, X):
        """Predict risk level: 0=Low, 1=Medium, 2=High"""
        # Simple rule-based mock prediction
        accuracy = X[0][0]  # overall_accuracy
        if accuracy >= 0.7:
            return np.array([0])  # Low risk
        elif accuracy >= 0.5:
            return np.array([1])  # Medium risk
        else:
            return np.array([2])  # High risk
    
    def predict_proba(self, X):
        """Predict probability distribution"""
        accuracy = X[0][0]
        if accuracy >= 0.7:
            return np.array([[0.8, 0.15, 0.05]])
        elif accuracy >= 0.5:
            return np.array([[0.2, 0.6, 0.2]])
        else:
            return np.array([[0.1, 0.2, 0.7]])


def extract_features(quiz_data: Dict[str, Any]) -> Dict[str, float]:
    """
    Extract ML features from quiz submission data
    
    Returns feature dictionary matching mlAnalytics structure
    """
    ml_analytics = quiz_data.get("mlAnalytics", {})
    
    features = {
        "overall_accuracy": ml_analytics.get("overall_accuracy", 0.0),
        "cognitive_accuracy": ml_analytics.get("cognitive_accuracy", 0.0),
        "emotional_accuracy": ml_analytics.get("emotional_accuracy", 0.0),
        "behavioural_accuracy": ml_analytics.get("behavioural_accuracy", 0.0),
        "avg_time_spent": ml_analytics.get("avg_time_spent", 0.0),
        "negative_coping_responses": float(ml_analytics.get("negative_coping_responses", 0)),
        "emotional_regulation_score": ml_analytics.get("emotional_regulation_score", 0.0),
        "attention_variance": ml_analytics.get("attention_variance", 0.0),
    }
    print("Extracted features for ML model:", features)
    return features


def generate_shap_explanation(model, features: Dict[str, float]) -> Dict[str, float]:
    """
    Generate SHAP explanation for the prediction
    
    In production, use: import shap; explainer = shap.TreeExplainer(model)
    """
    # Mock SHAP values - in production, use actual SHAP
    # shap_values = explainer.shap_values(X_student)
    
    # Mock explanation based on feature importance
    shap_explanation = {}
    
    # Cognitive has highest impact
    if features["cognitive_accuracy"] < 0.3:
        shap_explanation["cognitive_accuracy"] = -0.42
    else:
        shap_explanation["cognitive_accuracy"] = 0.28
    
    # Negative coping responses
    if features["negative_coping_responses"] > 2:
        shap_explanation["negative_coping_responses"] = 0.26
    else:
        shap_explanation["negative_coping_responses"] = -0.15
    
    # Emotional accuracy
    if features["emotional_accuracy"] < 0.5:
        shap_explanation["emotional_accuracy"] = -0.18
    else:
        shap_explanation["emotional_accuracy"] = 0.12
    
    # Behavioral accuracy
    if features["behavioural_accuracy"] < 0.5:
        shap_explanation["behavioural_accuracy"] = -0.14
    else:
        shap_explanation["behavioural_accuracy"] = 0.10
    
    # Time spent
    shap_explanation["avg_time_spent"] = -0.09 if features["avg_time_spent"] > 5 else 0.05
    
    # Emotional regulation
    shap_explanation["emotional_regulation_score"] = 0.15 if features["emotional_regulation_score"] > 0.5 else -0.12
    
    # Attention variance
    shap_explanation["attention_variance"] = -0.08 if features["attention_variance"] > 0.5 else 0.04
    
    return shap_explanation


def generate_lime_explanation(model, features: Dict[str, float], feature_vector: List[float]) -> Dict[str, float]:
    """
    Generate LIME explanation for the prediction
    
    In production, use: from lime.lime_tabular import LimeTabularExplainer
    """
    # Mock LIME values - in production, use actual LIME
    # exp = explainer.explain_instance(X_student[0], model.predict_proba, num_features=5)
    
    lime_explanation = {}
    
    # Create human-readable rules with weights
    if features["cognitive_accuracy"] <= 0.30:
        lime_explanation["cognitive_accuracy <= 0.30"] = 0.41
    elif features["cognitive_accuracy"] <= 0.60:
        lime_explanation["0.30 < cognitive_accuracy <= 0.60"] = 0.22
    else:
        lime_explanation["cognitive_accuracy > 0.60"] = -0.35
    
    if features["negative_coping_responses"] > 2:
        lime_explanation["negative_coping_responses > 2"] = 0.27
    elif features["negative_coping_responses"] > 0:
        lime_explanation["negative_coping_responses > 0"] = 0.14
    else:
        lime_explanation["negative_coping_responses = 0"] = -0.18
    
    if features["emotional_accuracy"] <= 0.50:
        lime_explanation["emotional_accuracy <= 0.50"] = 0.19
    else:
        lime_explanation["emotional_accuracy > 0.50"] = -0.15
    
    if features["attention_variance"] > 0.5:
        lime_explanation["attention_variance > 0.5 (inconsistent)"] = 0.16
    else:
        lime_explanation["attention_variance <= 0.5 (consistent)"] = -0.08
    
    return lime_explanation


def predict_student_risk(quiz_submission: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main function to predict student risk with XAI explanations
    
    Returns:
        {
            "predicted_risk": int (0=Low, 1=Medium, 2=High),
            "risk_label": str,
            "confidence": float,
            "features": dict,
            "shap_explanation": dict,
            "lime_explanation": dict
        }
    """
    # Load or initialize model (in production, load your trained model)
    model = pickle.load(open("model.pkl", "rb"))
    model = MockMLModel()
    
    # Extract features
    features = extract_features(quiz_submission)
    
    # Prepare feature vector
    feature_vector = [
        features["overall_accuracy"],
        features["cognitive_accuracy"],
        features["emotional_accuracy"],
        features["behavioural_accuracy"],
        features["avg_time_spent"],
        features["negative_coping_responses"],
        features["emotional_regulation_score"],
        features["attention_variance"],
    ]
    
    X_student = [feature_vector]
    
    # Predict risk level
    prediction = model.predict(X_student)[0]
    probabilities = model.predict_proba(X_student)[0]
    
    risk_labels = ["Low Risk", "Medium Risk", "High Risk"]
    
    # Generate explanations
    shap_explanation = generate_shap_explanation(model, features)
    lime_explanation = generate_lime_explanation(model, features, feature_vector)
    
    # Compile result
    result = {
        "predicted_risk": int(prediction),
        "risk_label": risk_labels[int(prediction)],
        "confidence": float(probabilities[int(prediction)]),
        "probabilities": {
            "low": float(probabilities[0]),
            "medium": float(probabilities[1]),
            "high": float(probabilities[2])
        },
        "features": features,
        "shap_explanation": shap_explanation,
        "lime_explanation": lime_explanation
    }
    
    return result


def format_ml_insights_for_gemini(ml_prediction: Dict[str, Any]) -> str:
    """
    Format ML prediction and explanations for Gemini prompt
    """
    risk_label = ml_prediction["risk_label"]
    confidence = ml_prediction["confidence"] * 100
    
    # Top SHAP features (sorted by absolute value)
    shap_items = sorted(
        ml_prediction["shap_explanation"].items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:3]
    
    shap_text = "\n".join([f"  - {k}: {v:+.3f}" for k, v in shap_items])
    
    # LIME rules
    lime_text = "\n".join([f"  - {k}: weight {v:+.3f}" for k, v in ml_prediction["lime_explanation"].items()])
    
    prompt = f"""
        ML Model Analysis Results:

        Risk Assessment: {risk_label} (confidence: {confidence:.1f}%)

        SHAP Feature Importance (Top Contributing Factors):
        {shap_text}

        LIME Explanation (Human-Readable Rules):
        {lime_text}

        Key Metrics:
        - Overall Accuracy: {ml_prediction['features']['overall_accuracy']:.2%}
        - Cognitive Accuracy: {ml_prediction['features']['cognitive_accuracy']:.2%}
        - Emotional Accuracy: {ml_prediction['features']['emotional_accuracy']:.2%}
        - Emotional Regulation Score: {ml_prediction['features']['emotional_regulation_score']:.2%}
        - Negative Coping Responses: {ml_prediction['features']['negative_coping_responses']}
        - Attention Variance: {ml_prediction['features']['attention_variance']:.2f}

        Based on these ML insights and explainability analysis, provide:
        """
    
    return prompt
