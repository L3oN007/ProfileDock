use std::collections::HashMap;
use std::sync::Mutex;

use chrono::Utc;
use uuid::Uuid;

use crate::domain::proxy::{
    parse_protocol, password_secret_key, username_secret_key, CreateProxyInput, CredentialUpdate,
    ProfileProxyAssignmentDto, Proxy, ProxyAssignmentDto, ProxyCheckRecord, ProxyCheckResult,
    ProxyCheckResultDto, ProxyDto, ProxyHealthStatus, ProxySummaryDto, ResolvedBrowserProxy,
    ResolvedProxy, TestProxyInput, UpdateProxyInput,
};
use crate::error::AppError;
use crate::infrastructure::database::{
    SqliteBrowserInstanceRepository, SqliteProfileEventRepository, SqliteProfileProxyAssignmentRepository,
    SqliteProfileRepository, SqliteProxyCheckRepository, SqliteProxyRepository,
};
use crate::infrastructure::network::{proxy_checker::validate_proxy_input, ProxyChecker};
use crate::state::AppState;

pub struct ProxyService {
    check_locks: Mutex<HashMap<String, ()>>,
}

impl ProxyService {
    pub fn new() -> Self {
        Self {
            check_locks: Mutex::new(HashMap::new()),
        }
    }

    pub async fn create(
        &self,
        state: &AppState,
        input: CreateProxyInput,
    ) -> Result<ProxyDto, AppError> {
        let name = input.name.trim();
        if name.is_empty() || name.len() > 100 {
            return Err(AppError::InvalidConfiguration(
                "proxy name must be between 1 and 100 characters".into(),
            ));
        }

        let protocol = validate_proxy_input(
            &input.protocol,
            &input.host,
            input.port,
            input.username.as_deref(),
            input.password.as_deref(),
        )?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let username_ref = input
            .username
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .map(|_| username_secret_key(&id));
        let password_ref = input
            .password
            .as_deref()
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .map(|_| password_secret_key(&id));

        if let (Some(username), Some(key)) = (&input.username, &username_ref) {
            state.secret_store.set(key, username.trim())?;
        }
        if let (Some(password), Some(key)) = (&input.password, &password_ref) {
            if let Err(error) = state.secret_store.set(key, password) {
                self.cleanup_secrets(state, &id);
                return Err(error);
            }
        }

        let proxy = Proxy {
            id: id.clone(),
            name: name.to_string(),
            protocol,
            host: input.host.trim().to_string(),
            port: input.port,
            username_ref,
            password_ref,
            is_enabled: true,
            is_archived: false,
            created_at: now,
            updated_at: now,
        };

        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        if let Err(error) = repo.create(&proxy).await {
            self.cleanup_secrets(state, &id);
            return Err(error);
        }

        self.to_dto(state, proxy).await
    }

    pub async fn list(&self, state: &AppState) -> Result<Vec<ProxyDto>, AppError> {
        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        let proxies = repo.list(false).await?;
        let mut dtos = Vec::with_capacity(proxies.len());
        for proxy in proxies {
            dtos.push(self.to_dto(state, proxy).await?);
        }
        Ok(dtos)
    }

    pub async fn get(&self, state: &AppState, id: &str) -> Result<ProxyDto, AppError> {
        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        let proxy = repo.find_by_id(id).await?.ok_or(AppError::ProxyNotFound)?;
        self.to_dto(state, proxy).await
    }

    pub async fn update(
        &self,
        state: &AppState,
        id: &str,
        input: UpdateProxyInput,
    ) -> Result<ProxyDto, AppError> {
        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        let mut proxy = repo.find_by_id(id).await?.ok_or(AppError::ProxyNotFound)?;

        if proxy.is_archived {
            return Err(AppError::ProxyArchived);
        }

        if let Some(name) = input.name {
            let trimmed = name.trim();
            if trimmed.is_empty() || trimmed.len() > 100 {
                return Err(AppError::InvalidConfiguration(
                    "proxy name must be between 1 and 100 characters".into(),
                ));
            }
            proxy.name = trimmed.to_string();
        }

        if let Some(protocol) = input.protocol {
            proxy.protocol = parse_protocol(&protocol)?;
        }

        if let Some(host) = input.host {
            crate::infrastructure::network::proxy_checker::validate_host(&host)?;
            proxy.host = host.trim().to_string();
        }

        if let Some(port) = input.port {
            crate::infrastructure::network::proxy_checker::validate_port(port)?;
            proxy.port = port;
        }

        if let Some(username) = input.username {
            let trimmed = username.trim();
            if trimmed.is_empty() {
                proxy.username_ref = None;
                state.secret_store.delete(&username_secret_key(id))?;
            } else {
                proxy.username_ref = Some(username_secret_key(id));
                state.secret_store.set(&username_secret_key(id), trimmed)?;
            }
        }

        if let Some(password_update) = input.password {
            match password_update {
                CredentialUpdate::Keep => {}
                CredentialUpdate::Replace { value } => {
                    if value.trim().is_empty() {
                        return Err(AppError::InvalidConfiguration(
                            "proxy password cannot be empty when replacing".into(),
                        ));
                    }
                    proxy.password_ref = Some(password_secret_key(id));
                    state
                        .secret_store
                        .set(&password_secret_key(id), &value)?;
                }
                CredentialUpdate::Remove => {
                    proxy.password_ref = None;
                    state.secret_store.delete(&password_secret_key(id))?;
                }
            }
        }

        if let Some(enabled) = input.is_enabled {
            proxy.is_enabled = enabled;
        }

        let has_username = proxy.username_ref.is_some();
        let has_password = proxy.password_ref.is_some();
        if has_username != has_password {
            return Err(AppError::InvalidConfiguration(
                "proxy username and password must both be provided".into(),
            ));
        }

        proxy.updated_at = Utc::now();
        repo.update(&proxy).await?;
        self.to_dto(state, proxy).await
    }

    pub async fn archive(&self, state: &AppState, id: &str) -> Result<(), AppError> {
        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        let proxy = repo.find_by_id(id).await?.ok_or(AppError::ProxyNotFound)?;

        if proxy.is_archived {
            return Ok(());
        }

        let assigned = repo.count_active_assignments(id).await?;
        if assigned > 0 {
            return Err(AppError::ProxyInUse);
        }

        repo.archive(id, Utc::now()).await?;
        Ok(())
    }

    pub async fn check(&self, state: &AppState, id: &str) -> Result<ProxyCheckResultDto, AppError> {
        let _lock = self.lock_check(id)?;
        let proxy = SqliteProxyRepository::new(state.db.pool().clone())
            .find_by_id(id)
            .await?
            .ok_or(AppError::ProxyNotFound)?;

        if proxy.is_archived {
            return Err(AppError::ProxyArchived);
        }

        let resolved = self.resolve_proxy(state, &proxy)?;
        let result = state.proxy_checker.check(&resolved).await?;
        let checked_at = Utc::now();
        self.persist_check(state, id, &result, checked_at).await?;
        Ok(result.to_dto(checked_at))
    }

    pub async fn test_input(
        &self,
        state: &AppState,
        input: TestProxyInput,
    ) -> Result<ProxyCheckResultDto, AppError> {
        let protocol = validate_proxy_input(
            &input.protocol,
            &input.host,
            input.port,
            input.username.as_deref(),
            input.password.as_deref(),
        )?;

        let resolved = ResolvedProxy {
            protocol,
            host: input.host.trim().to_string(),
            port: input.port,
            username: input.username.map(|v| v.trim().to_string()).filter(|v| !v.is_empty()),
            password: input.password.filter(|v| !v.is_empty()),
        };

        let result = state.proxy_checker.check(&resolved).await?;
        Ok(result.to_dto(Utc::now()))
    }

    pub async fn assign(
        &self,
        state: &AppState,
        profile_id: &str,
        proxy_id: &str,
    ) -> Result<(), AppError> {
        self.ensure_profile_proxy_change_allowed(state, profile_id).await?;

        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());
        let proxy_repo = SqliteProxyRepository::new(state.db.pool().clone());
        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        let profile = profile_repo
            .find_by_id(profile_id)
            .await?
            .ok_or(AppError::ProfileNotFound)?;
        if profile.is_archived {
            return Err(AppError::ProfileArchived);
        }

        let proxy = proxy_repo
            .find_by_id(proxy_id)
            .await?
            .ok_or(AppError::ProxyNotFound)?;
        if proxy.is_archived {
            return Err(AppError::ProxyArchived);
        }
        if !proxy.is_enabled {
            return Err(AppError::InvalidConfiguration("proxy is disabled".into()));
        }

        let now = Utc::now();
        assignment_repo.assign(profile_id, proxy_id, now).await?;

        event_repo
            .insert(
                profile_id,
                "proxy_assigned",
                Some(serde_json::json!({ "proxy_id": proxy_id, "proxy_name": proxy.name })),
            )
            .await?;

        Ok(())
    }

    pub async fn unassign(&self, state: &AppState, profile_id: &str) -> Result<(), AppError> {
        self.ensure_profile_proxy_change_allowed(state, profile_id).await?;

        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let event_repo = SqliteProfileEventRepository::new(state.db.pool().clone());

        assignment_repo.unassign(profile_id).await?;
        event_repo.insert(profile_id, "proxy_unassigned", None).await?;
        Ok(())
    }

    pub async fn get_profile_assignment(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<ProfileProxyAssignmentDto, AppError> {
        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let proxy_repo = SqliteProxyRepository::new(state.db.pool().clone());
        let check_repo = SqliteProxyCheckRepository::new(state.db.pool().clone());

        let assignment = assignment_repo.find_by_profile(profile_id).await?;
        if assignment.is_none() {
            return Ok(ProfileProxyAssignmentDto {
                profile_id: profile_id.to_string(),
                proxy: None,
                assigned_at: None,
            });
        }

        let assignment = assignment.unwrap();
        let proxy = proxy_repo
            .find_by_id(&assignment.proxy_id)
            .await?
            .ok_or(AppError::ProxyNotFound)?;
        let latest_check = check_repo.latest_for_proxy(&proxy.id).await?;

        Ok(ProfileProxyAssignmentDto {
            profile_id: profile_id.to_string(),
            proxy: Some(ProxySummaryDto {
                id: proxy.id,
                name: proxy.name,
                protocol: proxy.protocol.as_str().to_string(),
                host: proxy.host,
                port: proxy.port,
                has_auth: proxy.username_ref.is_some(),
                health_status: ProxyHealthStatus::from_latest_check(latest_check.as_ref())
                    .as_str()
                    .to_string(),
            }),
            assigned_at: Some(assignment.assigned_at.to_rfc3339()),
        })
    }

    pub async fn list_assignments(
        &self,
        state: &AppState,
        proxy_id: &str,
    ) -> Result<Vec<ProxyAssignmentDto>, AppError> {
        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let profile_repo = SqliteProfileRepository::new(state.db.pool().clone());

        let assignments = assignment_repo.list_by_proxy(proxy_id).await?;
        let mut dtos = Vec::with_capacity(assignments.len());

        for assignment in assignments {
            let profile = profile_repo
                .find_by_id(&assignment.profile_id)
                .await?
                .ok_or(AppError::ProfileNotFound)?;

            dtos.push(ProxyAssignmentDto {
                profile_id: assignment.profile_id,
                profile_name: profile.name,
                proxy_id: assignment.proxy_id,
                assigned_at: assignment.assigned_at.to_rfc3339(),
            });
        }

        Ok(dtos)
    }

    pub async fn list_checks(
        &self,
        state: &AppState,
        proxy_id: &str,
        limit: u32,
    ) -> Result<Vec<ProxyCheckResultDto>, AppError> {
        let check_repo = SqliteProxyCheckRepository::new(state.db.pool().clone());
        let checks = check_repo.list_for_proxy(proxy_id, limit).await?;
        Ok(checks.into_iter().map(|c| c.to_dto()).collect())
    }

    pub async fn resolve_for_profile(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<Option<ResolvedBrowserProxy>, AppError> {
        let assignment_repo =
            SqliteProfileProxyAssignmentRepository::new(state.db.pool().clone());
        let proxy_repo = SqliteProxyRepository::new(state.db.pool().clone());

        let assignment = assignment_repo.find_by_profile(profile_id).await?;
        let Some(assignment) = assignment else {
            return Ok(None);
        };

        let proxy = proxy_repo
            .find_by_id(&assignment.proxy_id)
            .await?
            .ok_or(AppError::ProxyNotFound)?;

        if proxy.is_archived || !proxy.is_enabled {
            return Ok(None);
        }

        let resolved = self.resolve_proxy(state, &proxy)?;
        Ok(Some(ResolvedBrowserProxy::from_resolved(resolved)))
    }

    fn resolve_proxy(&self, state: &AppState, proxy: &Proxy) -> Result<ResolvedProxy, AppError> {
        let username = proxy
            .username_ref
            .as_ref()
            .map(|key| state.secret_store.get(key))
            .transpose()?
            .flatten();

        let password = proxy
            .password_ref
            .as_ref()
            .map(|key| state.secret_store.get(key))
            .transpose()?
            .flatten();

        if proxy.username_ref.is_some() && (username.is_none() || password.is_none()) {
            return Err(AppError::ProxySecretNotFound);
        }

        Ok(ResolvedProxy {
            protocol: proxy.protocol,
            host: proxy.host.clone(),
            port: proxy.port,
            username,
            password,
        })
    }

    async fn persist_check(
        &self,
        state: &AppState,
        proxy_id: &str,
        result: &ProxyCheckResult,
        checked_at: chrono::DateTime<Utc>,
    ) -> Result<(), AppError> {
        let record = ProxyCheckRecord {
            id: Uuid::new_v4().to_string(),
            proxy_id: proxy_id.to_string(),
            success: result.success,
            latency_ms: result.latency_ms,
            observed_ip: result.observed_ip.clone(),
            error_code: result.error_code.clone(),
            error_message: result.error_message.clone(),
            checked_at,
        };

        SqliteProxyCheckRepository::new(state.db.pool().clone())
            .insert(&record)
            .await?;

        Ok(())
    }

    async fn to_dto(&self, state: &AppState, proxy: Proxy) -> Result<ProxyDto, AppError> {
        let repo = SqliteProxyRepository::new(state.db.pool().clone());
        let check_repo = SqliteProxyCheckRepository::new(state.db.pool().clone());
        let latest_check = check_repo.latest_for_proxy(&proxy.id).await?;
        let assigned_profile_count = repo.count_active_assignments(&proxy.id).await?;

        Ok(ProxyDto {
            id: proxy.id,
            name: proxy.name,
            protocol: proxy.protocol.as_str().to_string(),
            host: proxy.host,
            port: proxy.port,
            has_auth: proxy.username_ref.is_some(),
            is_enabled: proxy.is_enabled,
            is_archived: proxy.is_archived,
            health_status: ProxyHealthStatus::from_latest_check(latest_check.as_ref())
                .as_str()
                .to_string(),
            last_check: latest_check.map(|check| check.to_dto()),
            assigned_profile_count,
            created_at: proxy.created_at.to_rfc3339(),
            updated_at: proxy.updated_at.to_rfc3339(),
        })
    }

    async fn ensure_profile_proxy_change_allowed(
        &self,
        state: &AppState,
        profile_id: &str,
    ) -> Result<(), AppError> {
        let instance_repo = SqliteBrowserInstanceRepository::new(state.db.pool().clone());
        if instance_repo
            .find_active_by_profile(profile_id)
            .await?
            .is_some()
        {
            return Err(AppError::ProfileRunning);
        }

        Ok(())
    }

    fn cleanup_secrets(&self, state: &AppState, proxy_id: &str) {
        let _ = state.secret_store.delete(&username_secret_key(proxy_id));
        let _ = state.secret_store.delete(&password_secret_key(proxy_id));
    }

    fn lock_check(&self, proxy_id: &str) -> Result<ProxyCheckLockGuard<'_>, AppError> {
        let mut locks = self
            .check_locks
            .lock()
            .map_err(|_| AppError::InvalidConfiguration("proxy check lock poisoned".into()))?;

        if locks.contains_key(proxy_id) {
            return Err(AppError::InvalidConfiguration(
                "proxy check already in progress".into(),
            ));
        }

        locks.insert(proxy_id.to_string(), ());
        Ok(ProxyCheckLockGuard {
            proxy_id: proxy_id.to_string(),
            locks: &self.check_locks,
        })
    }
}

struct ProxyCheckLockGuard<'a> {
    proxy_id: String,
    locks: &'a Mutex<HashMap<String, ()>>,
}

impl Drop for ProxyCheckLockGuard<'_> {
    fn drop(&mut self) {
        if let Ok(mut locks) = self.locks.lock() {
            locks.remove(&self.proxy_id);
        }
    }
}
