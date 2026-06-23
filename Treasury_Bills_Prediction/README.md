# Nigerian Treasury Bill Investment Predictor


---

## Project Overview
A machine learning system that predicts Nigerian Treasury Bill (NTB) yields
using CBN Primary Market auction data (2002–2026). Built as a final-year project
demonstrating end-to-end ML pipeline: data ingestion → cleaning → feature
engineering → model training → interactive dashboard.

## Data Source
Central Bank of Nigeria — Primary Market Auction Records  
https://www.cbn.gov.ng/rates/GovtSecuritiesDrillDown.html

## Stack
| Layer | Tool |
|---|---|
| Language | Python 3.10+ |
| ML Models | scikit-learn, XGBoost |
| Deep Learning | TensorFlow / Keras (LSTM) |
| Dashboard | Streamlit |
| Data | pandas, numpy |
| Viz | matplotlib, seaborn, plotly |

## Project Structure
```
tbill_predictor/
├── data/raw/              ← CBN Excel exports
├── data/processed/        ← cleaned CSVs + saved charts
├── notebooks/             ← EDA, feature engineering, model training
├── src/                   ← reusable Python modules
├── models/                ← saved model artifacts
├── app/                   ← Streamlit dashboard
└── requirements.txt
```

## Quick Start
```bash
pip install -r requirements.txt

# 1. Run EDA notebook
jupyter notebook notebooks/01_eda.ipynb

# 2. Feature engineering
python src/features.py

# 3. Train models
python src/train.py

# 4. Launch dashboard
streamlit run app/streamlit_app.py
```

## Models Evaluated
- Linear Regression (baseline)
- Random Forest ← best classical model
- Gradient Boosting
- XGBoost
- LSTM (deep learning extension)

**Evaluation:** 5-Fold TimeSeriesSplit CV — RMSE, MAE, R²
