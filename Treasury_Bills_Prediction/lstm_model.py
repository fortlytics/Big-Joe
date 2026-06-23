"""
LSTM time-series model for NTB yield forecasting.
Run standalone or imported from notebook 03_model_training.ipynb.
"""
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def make_sequences(series: np.ndarray, lookback: int = 12):
    X, y = [], []
    for i in range(lookback, len(series)):
        X.append(series[i - lookback:i])
        y.append(series[i])
    return np.array(X), np.array(y)

def build_lstm(lookback: int = 12, units: int = 64):
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam

    model = Sequential([
        LSTM(units, return_sequences=True, input_shape=(lookback, 1)),
        Dropout(0.2),
        LSTM(units // 2),
        Dropout(0.2),
        Dense(1),
    ])
    model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')
    return model

def train_lstm(df: pd.DataFrame, tenor: int = 364,
               lookback: int = 12, epochs: int = 60,
               batch_size: int = 16, test_split: float = 0.2,
               save_path: str = "models/lstm_model.keras"):
    grp    = df[df['tenor_days'] == tenor].sort_values('auctionDate').reset_index(drop=True)
    series = grp['yield_pct'].values.reshape(-1, 1)
    dates  = grp['auctionDate'].values

    # Scale
    sc     = MinMaxScaler()
    scaled = sc.fit_transform(series)

    X, y = make_sequences(scaled, lookback)
    X    = X.reshape(X.shape[0], X.shape[1], 1)

    split   = int(len(X) * (1 - test_split))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    dates_test      = dates[lookback + split:]

    model = build_lstm(lookback)
    print(f"\nLSTM training on {tenor}-Day NTB ({split} train / {len(X_test)} test)")
    model.summary()

    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    callbacks = [
        EarlyStopping(patience=10, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(patience=5, factor=0.5, verbose=1),
    ]
    history = model.fit(
        X_train, y_train,
        epochs=epochs, batch_size=batch_size,
        validation_split=0.1,
        callbacks=callbacks,
        verbose=1,
    )

    # Evaluate
    preds_sc = model.predict(X_test)
    preds    = sc.inverse_transform(preds_sc).flatten()
    actual   = sc.inverse_transform(y_test.reshape(-1, 1)).flatten()

    rmse = np.sqrt(mean_squared_error(actual, preds))
    mae  = mean_absolute_error(actual, preds)
    r2   = r2_score(actual, preds)
    print(f"\nLSTM Test Results — {tenor}-Day NTB")
    print(f"  RMSE : {rmse:.4f}%")
    print(f"  MAE  : {mae:.4f}%")
    print(f"  R²   : {r2:.4f}")

    model.save(save_path)
    print(f"  Saved → {save_path}")

    # Plot
    plot_lstm_results(actual, preds, dates_test, history, tenor)

    return model, sc, {"RMSE": rmse, "MAE": mae, "R2": r2}

def plot_lstm_results(actual, preds, dates, history, tenor):
    fig, axes = plt.subplots(1, 2, figsize=(14, 4))
    fig.suptitle(f"LSTM Results — {tenor}-Day NTB", fontsize=13, fontweight='bold')

    # Actual vs predicted
    axes[0].plot(dates, actual, label='Actual',    color='#2ca02c', linewidth=1.4)
    axes[0].plot(dates, preds,  label='Predicted', color='#ff7f0e', linewidth=1.4, linestyle='--')
    axes[0].fill_between(dates, actual, preds, alpha=0.08, color='red')
    axes[0].set_title("Actual vs Predicted (Test Set)")
    axes[0].set_ylabel("Yield (%)")
    axes[0].legend()
    axes[0].grid(alpha=0.3)
    axes[0].spines[['top','right']].set_visible(False)

    # Training loss
    axes[1].plot(history.history['loss'],     label='Train Loss', color='#1f77b4')
    axes[1].plot(history.history['val_loss'], label='Val Loss',   color='#ff7f0e', linestyle='--')
    axes[1].set_title("Training & Validation Loss")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("MSE Loss")
    axes[1].legend()
    axes[1].grid(alpha=0.3)
    axes[1].spines[['top','right']].set_visible(False)

    plt.tight_layout()
    plt.savefig("data/processed/fig_lstm_results.png", dpi=150)
    plt.show()

def predict_next_lstm(model, scaler, recent_yields: list, lookback: int = 12) -> float:
    """
    Predict the next yield given a list of the last `lookback` yield values.
    """
    arr    = np.array(recent_yields[-lookback:]).reshape(-1, 1)
    scaled = scaler.transform(arr).reshape(1, lookback, 1)
    pred   = model.predict(scaled, verbose=0)
    return float(scaler.inverse_transform(pred)[0][0])

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '.')
    from src.data_loader import load_clean
    df = load_clean()
    train_lstm(df, tenor=364, lookback=12, epochs=60)
