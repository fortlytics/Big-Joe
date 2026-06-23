import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import TimeSeriesSplit
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from xgboost import XGBRegressor

MODELS = {
    "Linear Regression": LinearRegression(),
    "Random Forest":     RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1),
    "Gradient Boosting": GradientBoostingRegressor(n_estimators=200, random_state=42),
    "XGBoost":           XGBRegressor(n_estimators=200, random_state=42, verbosity=0),
}

def train(feat_df: pd.DataFrame, feature_cols: list, n_splits: int = 5):
    X = feat_df[feature_cols]
    y = feat_df['target']

    tscv    = TimeSeriesSplit(n_splits=n_splits)
    scaler  = make_pipeline(SimpleImputer(strategy="constant", fill_value=0), StandardScaler())
    summary = {name: {"RMSE": [], "MAE": [], "R2": []} for name in MODELS}

    print(f"\nTraining on {len(X)} samples with {len(feature_cols)} features")
    print(f"Using {n_splits}-Fold TimeSeriesSplit CV\n")

    for fold, (tr_idx, te_idx) in enumerate(tscv.split(X), 1):
        X_tr = scaler.fit_transform(X.iloc[tr_idx])
        X_te = scaler.transform(X.iloc[te_idx])
        y_tr, y_te = y.iloc[tr_idx], y.iloc[te_idx]

        for name, model in MODELS.items():
            model.fit(X_tr, y_tr)
            preds = model.predict(X_te)
            summary[name]["RMSE"].append(np.sqrt(mean_squared_error(y_te, preds)))
            summary[name]["MAE"].append(mean_absolute_error(y_te, preds))
            summary[name]["R2"].append(r2_score(y_te, preds))

    # Print comparison table
    print(f"{'Model':<22} {'RMSE':>8} {'MAE':>8} {'R²':>8}")
    print("─" * 50)
    for name, m in summary.items():
        print(f"{name:<22} {np.mean(m['RMSE']):>8.4f} "
              f"{np.mean(m['MAE']):>8.4f} {np.mean(m['R2']):>8.4f}")

    # Final fit — best model on full data
    best = RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)
    X_sc = scaler.fit_transform(X)
    best.fit(X_sc, y)

    os.makedirs("models", exist_ok=True)
    joblib.dump(best,         "models/best_model.pkl")
    joblib.dump(scaler,       "models/scaler.pkl")
    joblib.dump(feature_cols, "models/feature_cols.pkl")
    print("\n✓ Saved → models/best_model.pkl, scaler.pkl, feature_cols.pkl")

    return best, scaler, summary

def load_model():
    model        = joblib.load("models/best_model.pkl")
    scaler       = joblib.load("models/scaler.pkl")
    feature_cols = joblib.load("models/feature_cols.pkl")
    return model, scaler, feature_cols

def predict_next(model, scaler, feature_cols: list, feat_df: pd.DataFrame) -> float:
    last  = feat_df[feature_cols].iloc[[-1]]
    pred  = model.predict(scaler.transform(last))[0]
    return round(float(pred), 4)

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '.')
    from src.data_loader import load_clean
    from src.features import engineer, get_feature_cols

    df      = load_clean()
    feat_df = engineer(df, tenor=364)
    fcols   = get_feature_cols(feat_df)
    model, scaler, summary = train(feat_df, fcols)

    pred = predict_next(model, scaler, fcols, feat_df)
    last = feat_df['yield_pct'].iloc[-1]
    print(f"\nLast 364-Day yield : {last:.4f}%")
    print(f"Predicted next     : {pred:.4f}%")
    print(f"Delta              : {pred - last:+.4f}%")
