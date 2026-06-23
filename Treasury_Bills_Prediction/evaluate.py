import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def metrics(y_true, y_pred, label: str = "Model") -> dict:
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae  = mean_absolute_error(y_true, y_pred)
    r2   = r2_score(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / y_true.replace(0, np.nan))) * 100
    print(f"\n=== {label} ===")
    print(f"  RMSE : {rmse:.4f}%")
    print(f"  MAE  : {mae:.4f}%")
    print(f"  R²   : {r2:.4f}")
    print(f"  MAPE : {mape:.2f}%")
    return {"RMSE": rmse, "MAE": mae, "R2": r2, "MAPE": mape}

def plot_actual_vs_predicted(y_true, y_pred, dates=None, label="364-Day NTB", save_path=None):
    fig, axes = plt.subplots(2, 1, figsize=(13, 7))
    fig.suptitle(f"Actual vs Predicted Yield — {label}", fontsize=13, fontweight='bold')

    x = dates if dates is not None else range(len(y_true))

    # Line chart
    axes[0].plot(x, y_true,  label='Actual',    color='#2ca02c', linewidth=1.4)
    axes[0].plot(x, y_pred,  label='Predicted', color='#ff7f0e', linewidth=1.4, linestyle='--')
    axes[0].fill_between(x, y_true, y_pred, alpha=0.08, color='red')
    axes[0].set_ylabel('Yield (%)')
    axes[0].legend()
    axes[0].grid(alpha=0.3)
    axes[0].spines[['top','right']].set_visible(False)

    # Residuals
    residuals = np.array(y_true) - np.array(y_pred)
    axes[1].bar(x, residuals, color=np.where(residuals >= 0, '#2ca02c', '#d62728'),
                alpha=0.6, width=1)
    axes[1].axhline(0, color='black', linewidth=1)
    axes[1].set_ylabel('Residual (%)')
    axes[1].set_xlabel('Auction')
    axes[1].grid(alpha=0.3)
    axes[1].spines[['top','right']].set_visible(False)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved → {save_path}")
    plt.show()

def plot_model_comparison(summary: dict, save_path=None):
    """Bar chart comparing RMSE and R² across all models."""
    models = list(summary.keys())
    rmse   = [np.mean(summary[m]["RMSE"]) for m in models]
    r2     = [np.mean(summary[m]["R2"])   for m in models]

    fig, axes = plt.subplots(1, 2, figsize=(12, 4))
    fig.suptitle("Model Comparison — 5-Fold TimeSeriesSplit CV", fontweight='bold')

    colors = ['#1f77b4','#ff7f0e','#2ca02c','#d62728']

    # RMSE (lower is better)
    axes[0].bar(models, rmse, color=colors, alpha=0.85, edgecolor='white')
    axes[0].set_title("RMSE (lower = better)")
    axes[0].set_ylabel("RMSE (%)")
    axes[0].set_xticklabels(models, rotation=15, ha='right')
    for i, v in enumerate(rmse):
        axes[0].text(i, v + 0.002, f'{v:.4f}', ha='center', fontsize=9)

    # R² (higher is better)
    axes[1].bar(models, r2, color=colors, alpha=0.85, edgecolor='white')
    axes[1].set_title("R² Score (higher = better)")
    axes[1].set_ylabel("R²")
    axes[1].set_xticklabels(models, rotation=15, ha='right')
    axes[1].set_ylim(min(0, min(r2)) - 0.05, 1.05)
    for i, v in enumerate(r2):
        axes[1].text(i, v + 0.005, f'{v:.4f}', ha='center', fontsize=9)

    for ax in axes:
        ax.spines[['top','right']].set_visible(False)
        ax.grid(alpha=0.3, axis='y')

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches='tight')
        print(f"Saved → {save_path}")
    plt.show()

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '.')
    from src.data_loader import load_clean
    from src.features import engineer, get_feature_cols
    from src.train import train
    from sklearn.model_selection import TimeSeriesSplit
    from sklearn.preprocessing import StandardScaler

    df      = load_clean()
    feat_df = engineer(df, tenor=364)
    fcols   = get_feature_cols(feat_df)
    model, scaler, summary = train(feat_df, fcols)

    # Evaluate on last fold
    tscv = TimeSeriesSplit(n_splits=5)
    X    = feat_df[fcols]
    y    = feat_df['target']
    splits = list(tscv.split(X))
    tr_idx, te_idx = splits[-1]
    sc   = StandardScaler()
    sc.fit_transform(X.iloc[tr_idx])
    preds = model.predict(sc.transform(X.iloc[te_idx]))

    metrics(y.iloc[te_idx].values, preds, label="Random Forest (Hold-out Fold)")
    plot_actual_vs_predicted(
        y.iloc[te_idx].values, preds,
        dates=feat_df['auctionDate'].iloc[te_idx].values,
        save_path="data/processed/fig_actual_vs_pred.png"
    )
    plot_model_comparison(summary, save_path="data/processed/fig_model_comparison.png")
