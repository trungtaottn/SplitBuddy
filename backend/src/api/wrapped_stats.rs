use uuid::Uuid;

use crate::api::wrapped_dto::{PartnerStat, WrappedStats};

pub async fn generate_wrapped_stats(
    pool: &sqlx::PgPool,
    user_id: Uuid,
    year: i32,
    period: &str,
) -> Result<WrappedStats, (axum::http::StatusCode, String)> {
    let (start_date, end_date) = get_date_range(year, period);

    // Total sessions attended
    let total_sessions: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT s.id)
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1
          AND s.session_date >= $2
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Total spent (from bills where user paid)
    let total_spent: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(bp.amount_paid::float), 0)
        FROM bill_payers bp
        JOIN bills b ON b.id = bp.bill_id
        JOIN sessions s ON s.id = b.session_id
        JOIN participants p ON p.id = bp.participant_id
        WHERE p.user_id = $1
          AND s.session_date >= $2
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((Some(0.0),));

    // Total received (from debts settled to user)
    let total_received: (Option<f64>,) = sqlx::query_as(
        r#"
        SELECT COALESCE(SUM(d.amount::float), 0)
        FROM debts d
        JOIN sessions s ON s.id = d.session_id
        WHERE d.creditor_id = $1
          AND d.status = 'settled'
          AND s.session_date >= $2
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((Some(0.0),));

    // Favorite day of week
    let favorite_day: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT TO_CHAR(s.session_date, 'Day') as day
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1
          AND s.session_date >= $2
          AND s.session_date < $3
        GROUP BY TO_CHAR(s.session_date, 'Day')
        ORDER BY COUNT(*) DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Unique partners
    let unique_partners: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT p2.user_id)
        FROM participants p1
        JOIN participants p2 ON p2.session_id = p1.session_id AND p2.user_id != p1.user_id
        JOIN sessions s ON s.id = p1.session_id
        WHERE p1.user_id = $1 AND p2.user_id IS NOT NULL
          AND s.session_date >= $2
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Top partner
    let top_partner: Option<(Uuid, String, i64)> = sqlx::query_as(
        r#"
        SELECT p2.user_id, u.full_name, COUNT(DISTINCT s.id) as sessions_count
        FROM participants p1
        JOIN participants p2 ON p2.session_id = p1.session_id AND p2.user_id != p1.user_id
        JOIN sessions s ON s.id = p1.session_id
        JOIN users u ON u.id = p2.user_id
        WHERE p1.user_id = $1 AND p2.user_id IS NOT NULL
          AND s.session_date >= $2
          AND s.session_date < $3
        GROUP BY p2.user_id, u.full_name
        ORDER BY sessions_count DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Unique locations
    let unique_locations: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT LOWER(COALESCE(s.location, '')))
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1 AND s.location IS NOT NULL AND s.location != ''
          AND s.session_date >= $2
          AND s.session_date < $3
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Favorite location
    let favorite_location: Option<(String,)> = sqlx::query_as(
        r#"
        SELECT s.location
        FROM sessions s
        JOIN participants p ON p.session_id = s.id
        WHERE p.user_id = $1 AND s.location IS NOT NULL AND s.location != ''
          AND s.session_date >= $2
          AND s.session_date < $3
        GROUP BY s.location
        ORDER BY COUNT(*) DESC
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_optional(pool)
    .await
    .unwrap_or(None);

    // Achievements earned this period
    let achievements_earned: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM user_achievements
        WHERE user_id = $1
          AND unlocked_at >= $2::timestamptz
          AND unlocked_at < $3::timestamptz
        "#,
    )
    .bind(user_id)
    .bind(&start_date)
    .bind(&end_date)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    // Groups count
    let groups_count: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT gm.group_id)
        FROM group_members gm
        WHERE gm.user_id = $1
        "#,
    )
    .bind(user_id)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    let total_spent_val = total_spent.0.unwrap_or(0.0);
    let avg_per_session = if total_sessions.0 > 0 {
        total_spent_val / total_sessions.0 as f64
    } else {
        0.0
    };

    Ok(WrappedStats {
        total_sessions: total_sessions.0,
        total_spent: total_spent_val,
        total_received: total_received.0.unwrap_or(0.0),
        avg_per_session,
        favorite_day: favorite_day.map(|d| d.0.trim().to_string()),
        favorite_month: None,
        late_night_sessions: 0,
        unique_partners: unique_partners.0,
        top_partner: top_partner.map(|(id, name, count)| PartnerStat {
            user_id: id,
            name,
            sessions_together: count,
            total_spent_together: 0.0,
        }),
        top_3_partners: vec![],
        groups_count: groups_count.0,
        favorite_group: None,
        unique_locations: unique_locations.0,
        favorite_location: favorite_location.map(|l| l.0),
        achievements_earned: achievements_earned.0,
        top_achievement: None,
        biggest_session: None,
        longest_streak_weeks: 0,
        generous_score: 0.0,
        titles: vec![],
    })
}

fn get_date_range(year: i32, period: &str) -> (String, String) {
    match period {
        "q1" => (format!("{}-01-01", year), format!("{}-04-01", year)),
        "q2" => (format!("{}-04-01", year), format!("{}-07-01", year)),
        "q3" => (format!("{}-07-01", year), format!("{}-10-01", year)),
        "q4" => (format!("{}-10-01", year), format!("{}-01-01", year + 1)),
        _ => (format!("{}-01-01", year), format!("{}-01-01", year + 1)),
    }
}
