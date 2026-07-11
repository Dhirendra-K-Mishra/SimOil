"""
Train per-node SVR models on historical demand and insert forecasts
into the `demand_history` table as rows with `predicted_demand` set
for the next N days. This is a lightweight, self-contained script
intended to be run after the database is seeded.

Usage:
    python train_and_insert.py --horizon 14

Requirements: see requirements.txt (psycopg2-binary, pandas, scikit-learn, joblib)
"""
import os
import argparse
import psycopg2
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler
from joblib import dump


def get_conn():
    return psycopg2.connect(
        dbname=os.environ.get('DB_NAME'),
        user=os.environ.get('DB_USER'),
        password=os.environ.get('DB_PASSWORD'),
        host=os.environ.get('DB_HOST'),
        port=os.environ.get('DB_PORT'),
    )


def fetch_node_ids(conn):
    cur = conn.cursor()
    cur.execute("SELECT id FROM nodes WHERE type != 'refinery'")
    rows = [r[0] for r in cur.fetchall()]
    cur.close()
    return rows


def fetch_history(conn, node_id):
    cur = conn.cursor()
    cur.execute(
        "SELECT date, actual_demand FROM demand_history WHERE node_id = %s AND actual_demand IS NOT NULL ORDER BY date ASC",
        (node_id,),
    )
    rows = cur.fetchall()
    cur.close()
    if not rows:
        return pd.DataFrame(columns=['date', 'actual_demand'])
    df = pd.DataFrame(rows, columns=['date', 'actual_demand'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.set_index('date')
    # Convert Decimal (from psycopg2) to float for numpy operations
    if 'actual_demand' in df.columns:
        df['actual_demand'] = df['actual_demand'].apply(lambda v: float(v) if v is not None else np.nan)
    return df


def make_features(series, max_lag=14):
    df = pd.DataFrame(series)
    for lag in range(1, max_lag + 1):
        df[f'lag_{lag}'] = df['actual_demand'].shift(lag)
    df['rmean_7'] = df['actual_demand'].rolling(7).mean()
    df['rmean_30'] = df['actual_demand'].rolling(30).mean()
    df['dayofweek'] = df.index.dayofweek
    df['month'] = df.index.month
    df = df.dropna()
    return df


def iterative_forecast(model, scaler, last_series, horizon=14, max_lag=14):
    preds = []
    # ensure history values are floats
    history = [float(v) for v in list(last_series[-max_lag:])]
    for i in range(horizon):
        # Build feature row
        feat = {}
        for lag in range(1, max_lag + 1):
            val = history[-lag] if len(history) >= lag else history[0]
            feat[f'lag_{lag}'] = val
        # safe rolling means (handle small history lengths)
        feat['rmean_7'] = float(np.mean(history[-7:])) if len(history) > 0 else 0.0
        feat['rmean_30'] = float(np.mean(history[-30:])) if len(history) > 0 else 0.0
        # dayofweek and month for next date
        next_date = datetime.today().date() + timedelta(days=i + 1)
        feat['dayofweek'] = next_date.weekday()
        feat['month'] = next_date.month

        feat_df = pd.DataFrame([feat])
        X = scaler.transform(feat_df)
        p = model.predict(X)[0]
        preds.append(float(max(0, p)))
        history.append(p)
    return preds


def train_and_insert(horizon=14):
    conn = get_conn()
    node_ids = fetch_node_ids(conn)
    inserted = 0
    for node_id in node_ids:
        df = fetch_history(conn, node_id)
        if len(df) < 60:
            # Not enough history — skip or fill with recent mean
            mean_val = int(df['actual_demand'].mean()) if len(df) > 0 else 0
            # create horizon rows with mean_val as prediction
            cur = conn.cursor()
            last_date = df.index.max().date() if len(df) > 0 else datetime.today().date()
            for d in range(1, horizon + 1):
                pd_date = (last_date + timedelta(days=d)).isoformat()
                cur.execute(
                    "INSERT INTO demand_history (node_id, date, predicted_demand) VALUES (%s, %s, %s)",
                    (node_id, pd_date, mean_val),
                )
            conn.commit()
            cur.close()
            inserted += horizon
            continue

        feature_df = make_features(df, max_lag=14)
        y = feature_df['actual_demand']
        X = feature_df.drop(columns=['actual_demand'])

        scaler = StandardScaler()
        Xs = scaler.fit_transform(X)

        model = SVR(C=10.0, epsilon=0.1, kernel='rbf')
        model.fit(Xs, y)

        last_series = df['actual_demand'].tolist()
        preds = iterative_forecast(model, scaler, last_series, horizon=horizon, max_lag=14)

        # Insert predictions as future rows
        cur = conn.cursor()
        last_date = df.index.max().date()
        for i, p in enumerate(preds, start=1):
            pd_date = (last_date + timedelta(days=i)).isoformat()
            cur.execute(
                "INSERT INTO demand_history (node_id, date, predicted_demand) VALUES (%s, %s, %s)",
                (node_id, pd_date, float(p)),
            )
        conn.commit()
        cur.close()
        inserted += len(preds)

    conn.close()
    print(f"Inserted {inserted} predicted rows for horizon {horizon}.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--horizon', type=int, default=14)
    args = parser.parse_args()
    train_and_insert(horizon=args.horizon)
