import pandas as pd
import numpy as np

EXCLUDE = {
    'target', 'yield_pct', 'rate', 'trueYield', 'auctionDate',
    'maturityDate', 'tenor', 'securityType', 'rangeBid',
    'successfulBidRates', 'netValue', 'netType', 'auctionNo',
    'tenor_days', 'tenor_label', 'subscription_ratio', 'allotment_ratio',
}

def engineer(df: pd.DataFrame, tenor: int) -> pd.DataFrame:
    """
    Build ML-ready feature set for a single tenor.
    Cross-tenor spread features are added by merging the pivot.
    """
    grp = df[df['tenor_days'] == tenor].copy().sort_values('auctionDate').reset_index(drop=True)

    # Cross-tenor spread features via pivot
    pivot = df.pivot_table(index='auctionDate', columns='tenor_days', values='yield_pct')
    pivot.columns = [f'yield_{int(c)}' for c in pivot.columns]
    grp = grp.merge(pivot, on='auctionDate', how='left')

    y = grp['yield_pct']

    # ── Lag features ────────────────────────────────────────
    for lag in [1, 2, 3, 6, 12]:
        grp[f'yield_lag_{lag}'] = y.shift(lag)

    # ── Rolling stats ────────────────────────────────────────
    grp['roll_mean_3']  = y.rolling(3).mean()
    grp['roll_mean_6']  = y.rolling(6).mean()
    grp['roll_mean_12'] = y.rolling(12).mean()
    grp['roll_std_3']   = y.rolling(3).std()
    grp['roll_std_6']   = y.rolling(6).std()

    # ── Momentum ─────────────────────────────────────────────
    grp['momentum_1']      = y.diff(1)
    grp['momentum_3']      = y.diff(3)
    grp['momentum_6']      = y.diff(6)
    grp['roc_3']           = y.pct_change(3) * 100  # Rate of change

    # ── Demand features ───────────────────────────────────────
    grp['sub_ratio_lag1']   = grp['subscription_ratio'].shift(1)
    grp['sub_ratio_roll3']  = grp['subscription_ratio'].rolling(3).mean()
    grp['allotment_lag1']   = grp['allotment_ratio'].shift(1)

    # ── Term structure spreads ────────────────────────────────
    if 'yield_364' in grp.columns and 'yield_91' in grp.columns:
        grp['spread_364_91']  = grp['yield_364'] - grp['yield_91']
        grp['spread_182_91']  = grp.get('yield_182', np.nan) - grp['yield_91']
        grp['spread_364_182'] = grp['yield_364'] - grp.get('yield_182', np.nan)

    # ── Calendar ──────────────────────────────────────────────
    grp['month']   = grp['auctionDate'].dt.month
    grp['quarter'] = grp['auctionDate'].dt.quarter
    grp['year']    = grp['auctionDate'].dt.year

    # ── Target ────────────────────────────────────────────────
    grp['target'] = y.shift(-1)

    grp.dropna(inplace=True)
    return grp

def get_feature_cols(feat_df: pd.DataFrame) -> list:
    return [
        c for c in feat_df.columns
        if c not in EXCLUDE
        and feat_df[c].dtype in ['float64', 'int64', 'int32', 'float32']
    ]

if __name__ == "__main__":
    import sys
    sys.path.insert(0, '.')
    from src.data_loader import load_clean
    df = load_clean()
    for tenor in [91, 182, 364]:
        feat = engineer(df, tenor)
        cols = get_feature_cols(feat)
        print(f"\n{tenor}-Day → {feat.shape[0]} samples, {len(cols)} features")
        print(f"  Features: {cols}")
    feat364 = engineer(df, 364)
    feat364.to_csv("data/processed/tbill_features.csv", index=False)
    print("\nSaved → data/processed/tbill_features.csv")
