use sqlx::SqlitePool;

use crate::domain::profile::{ProfileDto, ProfileListPage, ProfileListQuery};
use crate::error::AppError;

pub struct ProfileListQueryService;

impl ProfileListQueryService {
    pub async fn execute(
        pool: &SqlitePool,
        query: ProfileListQuery,
    ) -> Result<ProfileListPage, AppError> {
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(50).clamp(1, 200);
        let offset = (page - 1) * page_size;
        let include_archived = query.include_archived.unwrap_or(false);

        let mut where_clauses = vec!["1 = 1".to_string()];
        let mut binds: Vec<String> = Vec::new();

        if include_archived {
            where_clauses.push("p.is_archived = 1".to_string());
        } else {
            where_clauses.push("p.is_archived = 0".to_string());
        }

        if let Some(group_id) = query.group_id.as_deref().filter(|v| !v.is_empty()) {
            where_clauses.push("p.group_id = ?".to_string());
            binds.push(group_id.to_string());
        }

        if let Some(proxy_id) = query.proxy_id.as_deref().filter(|v| !v.is_empty()) {
            where_clauses.push(
                "EXISTS (SELECT 1 FROM profile_proxy_assignments ppa
                 WHERE ppa.profile_id = p.id AND ppa.proxy_id = ?)"
                    .to_string(),
            );
            binds.push(proxy_id.to_string());
        }

        if let Some(search) = query
            .search
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
        {
            where_clauses.push(
                "(p.name LIKE ? OR p.remark LIKE ? OR p.display_id LIKE ?
                  OR EXISTS (
                    SELECT 1 FROM profile_groups g
                    WHERE g.id = p.group_id AND g.name LIKE ?
                  )
                  OR EXISTS (
                    SELECT 1 FROM profile_tags pt
                    JOIN tags t ON t.id = pt.tag_id
                    WHERE pt.profile_id = p.id AND t.name LIKE ?
                  )
                  OR EXISTS (
                    SELECT 1 FROM profile_proxy_assignments ppa
                    JOIN proxies pr ON pr.id = ppa.proxy_id
                    WHERE ppa.profile_id = p.id AND pr.name LIKE ?
                  ))"
                .to_string(),
            );
            let pattern = format!("%{search}%");
            binds.extend(std::iter::repeat(pattern).take(6));
        }

        if let Some(tag_ids) = query.tag_ids.as_ref().filter(|ids| !ids.is_empty()) {
            let placeholders = tag_ids.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
            where_clauses.push(format!(
                "p.id IN (
                    SELECT profile_id FROM profile_tags
                    WHERE tag_id IN ({placeholders})
                    GROUP BY profile_id
                    HAVING COUNT(DISTINCT tag_id) = {}
                )",
                tag_ids.len()
            ));
            binds.extend(tag_ids.clone());
        }

        if let Some(status) = query.status.as_deref() {
            match status {
                "running" => where_clauses.push(
                    "EXISTS (
                        SELECT 1 FROM browser_instances bi
                        WHERE bi.profile_id = p.id
                          AND bi.state IN ('starting', 'running', 'stopping')
                    )"
                    .to_string(),
                ),
                "ready" => {
                    where_clauses.push("p.is_archived = 0".to_string());
                    where_clauses.push(
                        "NOT EXISTS (
                            SELECT 1 FROM browser_instances bi
                            WHERE bi.profile_id = p.id
                              AND bi.state IN ('starting', 'running', 'stopping')
                        )"
                        .to_string(),
                    );
                }
                "archived" => where_clauses.push("p.is_archived = 1".to_string()),
                _ => {}
            }
        }

        let where_sql = where_clauses.join(" AND ");
        let order_sql = match query.sort.as_deref() {
            Some("name_asc") => "p.name ASC",
            Some("name_desc") => "p.name DESC",
            Some("updated_desc") => "p.updated_at DESC",
            Some("last_launch_desc") => "last_opened_at DESC",
            Some("group_asc") => "g.name ASC, p.name ASC",
            _ => "p.created_at DESC",
        };

        let count_sql = format!(
            "SELECT COUNT(*) FROM profiles p
             LEFT JOIN profile_groups g ON g.id = p.group_id
             WHERE {where_sql}"
        );

        let mut count_query = sqlx::query_scalar::<_, i64>(&count_sql);
        for value in &binds {
            count_query = count_query.bind(value);
        }
        let total = count_query.fetch_one(pool).await? as u64;

        let list_sql = format!(
            "SELECT p.id, p.display_id, p.name, p.description, p.group_id, p.remark, p.notes,
                    p.platform_label, p.is_archived, p.created_at, p.updated_at,
                    g.name AS group_name,
                    (
                        SELECT GROUP_CONCAT(t.name, ',')
                        FROM profile_tags pt
                        JOIN tags t ON t.id = pt.tag_id
                        WHERE pt.profile_id = p.id
                    ) AS tag_names,
                    ppa.proxy_id,
                    pr.name AS proxy_name,
                    (
                        SELECT MAX(stopped_at)
                        FROM browser_instances bi
                        WHERE bi.profile_id = p.id AND bi.stopped_at IS NOT NULL
                    ) AS last_opened_at
             FROM profiles p
             LEFT JOIN profile_groups g ON g.id = p.group_id
             LEFT JOIN profile_proxy_assignments ppa ON ppa.profile_id = p.id
             LEFT JOIN proxies pr ON pr.id = ppa.proxy_id
             WHERE {where_sql}
             ORDER BY {order_sql}
             LIMIT ? OFFSET ?"
        );

        let mut list_query = sqlx::query_as::<_, ProfileListRow>(&list_sql);
        for value in &binds {
            list_query = list_query.bind(value);
        }
        list_query = list_query.bind(page_size as i64).bind(offset as i64);
        let rows = list_query.fetch_all(pool).await?;

        let items = rows.into_iter().map(|row| row.into_profile_dto()).collect();

        Ok(ProfileListPage {
            items,
            total,
            page,
            page_size,
        })
    }
}

#[derive(sqlx::FromRow)]
struct ProfileListRow {
    id: String,
    display_id: Option<String>,
    name: String,
    description: Option<String>,
    group_id: Option<String>,
    remark: Option<String>,
    notes: Option<String>,
    platform_label: Option<String>,
    is_archived: i64,
    created_at: String,
    updated_at: String,
    group_name: Option<String>,
    tag_names: Option<String>,
    proxy_id: Option<String>,
    proxy_name: Option<String>,
    last_opened_at: Option<String>,
}

impl ProfileListRow {
    fn into_profile_dto(self) -> ProfileDto {
        let tags = self
            .tag_names
            .map(|value| {
                value
                    .split(',')
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .map(str::to_string)
                    .collect()
            })
            .unwrap_or_default();

        ProfileDto {
            id: self.id,
            display_id: self.display_id,
            name: self.name,
            description: self.description,
            group_id: self.group_id,
            group_name: self.group_name,
            tags,
            remark: self.remark,
            notes: self.notes,
            platform_label: self.platform_label,
            state: if self.is_archived != 0 {
                "archived".to_string()
            } else {
                "ready".to_string()
            },
            is_archived: self.is_archived != 0,
            pid: None,
            instance_id: None,
            proxy_id: self.proxy_id,
            proxy_name: self.proxy_name,
            last_opened_at: self.last_opened_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
        }
    }
}
