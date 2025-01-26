from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

# Load the dataset
file_path = r'C:\Users\Dell\OneDrive\Desktop\CARDS\construction_bids_synthetic.csv'
try:
    df = pd.read_csv(file_path)
    logging.info("Dataset loaded successfully.")
except FileNotFoundError:
    logging.error("Dataset file not found. Please check the file path.")
    raise

# Add Project Duration column
df['Project Duration (Months)'] = np.random.randint(6, 24, size=len(df))

# Preprocess the data
label_encoder = LabelEncoder()
columns_to_encode = ['Construction Type', 'Flooring Type', 'Roof Type', 'Foundation Type', 'Company', 'Location']

for column in columns_to_encode:
    try:
        df[column] = label_encoder.fit_transform(df[column])
    except Exception as e:
        logging.error(f"Error encoding column {column}: {e}")

# Split the data into features (X) and target (y)
X = df.drop(['Bid Amount'], axis=1)
y = df['Bid Amount']

# Train the Random Forest Regressor model
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)
logging.info("Model trained successfully.")

@app.route('/predict', methods=['POST'])
def predict():
    try:
        new_project_details = request.json
        new_project_df = pd.DataFrame([new_project_details])

        def safe_transform(column_name, value):
            if value in label_encoder.classes_:
                return label_encoder.transform([value])[0]
            else:
                return label_encoder.transform([label_encoder.classes_[0]])[0]

        for column in X.columns:
            if column not in new_project_df.columns:
                new_project_df[column] = np.nan

        new_project_encoded = new_project_df.copy()
        for column in columns_to_encode:
            new_project_encoded[column] = safe_transform(column, new_project_details[column])

        new_project_encoded = new_project_encoded.reindex(columns=X.columns)
        predicted_bid_for_project = model.predict(new_project_encoded)[0]  # Get the predicted bid for the new project

        # Get predicted bids for all companies
        company_bids = df.groupby('Company')['Bid Amount'].mean()  # Calculate the mean predicted bid per company
        detailed_bids = []

        for company, company_predicted_bid in company_bids.items():
            detailed_bids.append({
                'Company': label_encoder.inverse_transform([company])[0],
                'Predicted Bid Amount': company_predicted_bid
            })

        # Include the predicted bid for the new project
        detailed_bids.append({
            'Company': 'New Project',
            'Predicted Bid Amount': predicted_bid_for_project
        })

        # Calculate waste management costs
        waste_management_cost = np.ceil(predicted_bid_for_project * 0.05)  # Example: 5% of the predicted bid for waste management

        logging.info("Predicted bids for all companies: %s", detailed_bids)
        return jsonify({
            'predicted_bids': detailed_bids,
            'waste_management_cost': waste_management_cost
        })
    except Exception as e:
        logging.error("Error processing prediction: %s", e)
        return jsonify({'error': 'An error occurred while processing the prediction.'}), 400

@app.route('/static/<path:filename>', methods=['GET'])
def send_static(filename):
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=True)
