Ok. Nếu Phase 0 đã xong thì **Phase 1 của ProfileDock nên tập trung hoàn toàn vào Profile Core + Browser Instance Lifecycle**.

Mục tiêu của phase này là:

```text
ProfileDock
   │
   ├── Create Profile
   ├── Edit Profile
   ├── Delete / Archive Profile
   │
   ├── tạo profile filesystem riêng
   ├── browser data isolation
   │
   ├── Launch Profile
   ├── Stop Profile
   ├── Detect running/crashed
   │
   └── Restore trạng thái sau khi restart app
```

Chưa đưa proxy management, automation hay logic thay đổi fingerprint vào Phase 1. Profile ở phase này chỉ nên quản lý các môi trường browser độc lập phục vụ testing/workflow hợp lệ.

---

# Phase 1 — Profile Core

## 1. Architecture mục tiêu

Sau Phase 1:

```text
React
 │
 │ Tauri IPC
 ▼
Profile Commands
 │
 ▼
ProfileService
 │
 ├───────────────┐
 ▼               ▼
ProfileRepo     BrowserService
 │               │
 ▼               ▼
SQLite       BrowserProvider
                 │
                 ▼
            ProcessManager
                 │
                 ▼
              Browser
```

Điểm quan trọng:

```text
React
  ❌ không biết browser executable thực tế chạy thế nào
  ❌ không tự generate CLI arguments
  ❌ không quản lý PID
  ❌ không tự thao tác profile directory

Rust
  ✓ quản lý toàn bộ lifecycle
```

---

# P1-01 — Profile domain model

Tạo domain:

```text
src-tauri/src/domain/profile/
├── mod.rs
├── entity.rs
├── status.rs
└── repository.rs
```

Model cơ bản:

```rust
pub struct Profile {
    pub id: String,
    pub name: String,
    pub description: Option<String>,

    pub browser_provider: String,

    pub status: ProfileStatus,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

Status:

```rust
pub enum ProfileStatus {
    Ready,
    Running,
    Stopped,
    Error,
    Archived,
}
```

Nhưng lưu ý:

**Không nên dùng `profiles.status` làm source of truth cho running state.**

Ví dụ app crash thì DB có thể còn:

```text
running
```

nhưng process đã chết.

Nên tách:

```text
Profile
    → persistent configuration

BrowserInstance
    → runtime process
```

---

# P1-02 — Database schema

Mình recommend Phase 1 có 3 tables chính:

```text
profiles
profile_settings
browser_instances
```

### `profiles`

```sql
CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,

    browser_provider TEXT NOT NULL DEFAULT 'cloak',

    is_archived INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_profiles_archived
ON profiles(is_archived);
```

Không cần lưu `status=running` ở đây.

---

### `profile_settings`

Để những settings riêng của profile không làm `profiles` phình ra:

```sql
CREATE TABLE profile_settings (
    profile_id TEXT PRIMARY KEY,

    startup_urls_json TEXT,

    locale TEXT,
    timezone TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);
```

Phase 1 có thể chỉ dùng:

```text
startup_urls
```

Còn:

```text
locale
timezone
```

có thể để reserved cho tương lai.

Không implement fingerprint spoofing ở đây.

---

### `browser_instances`

```sql
CREATE TABLE browser_instances (
    id TEXT PRIMARY KEY,

    profile_id TEXT NOT NULL,

    pid INTEGER,

    state TEXT NOT NULL,

    started_at TEXT,
    stopped_at TEXT,

    exit_code INTEGER,
    error_message TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_browser_instances_profile
ON browser_instances(profile_id);
```

State:

```text
starting
running
stopping
stopped
crashed
failed
```

---

# P1-03 — Profile filesystem

Mỗi profile phải có data directory riêng.

Ví dụ Windows:

```text
%LOCALAPPDATA%\ProfileDock\
└── profiles/
    ├── 019xxxx/
    │   ├── browser-data/
    │   ├── downloads/
    │   ├── cache/
    │   └── profile.json
    │
    └── 019yyyy/
        ├── browser-data/
        ├── downloads/
        ├── cache/
        └── profile.json
```

Đừng dùng profile name làm directory:

```text
❌ profiles/My TikTok Account
```

Dùng:

```text
profiles/{profile_uuid}
```

Ví dụ:

```text
profiles/019b03d4-e139-7...
```

Lý do:

```text
rename profile
     ↓
không cần rename filesystem

duplicate names
     ↓
không conflict
```

---

# P1-04 — ProfilePaths

Phase 0 đã có:

```rust
AppPaths
```

Phase 1 bổ sung:

```rust
pub struct ProfilePaths {
    pub root: PathBuf,
    pub browser_data: PathBuf,
    pub downloads: PathBuf,
    pub cache: PathBuf,
}
```

API:

```rust
impl AppPaths {
    pub fn profile(&self, id: &str) -> ProfilePaths;
}
```

Ví dụ:

```rust
let paths = app_paths.profile(profile.id());

paths.root
paths.browser_data
paths.downloads
```

Không hardcode:

```rust
format!("profiles/{}/browser-data", id)
```

ở khắp project.

---

# P1-05 — ProfileRepository

Tạo abstraction:

```text
domain/profile/repository.rs
```

Concept:

```rust
#[async_trait]
pub trait ProfileRepository {
    async fn create(
        &self,
        profile: &Profile
    ) -> Result<(), AppError>;

    async fn find_by_id(
        &self,
        id: &str
    ) -> Result<Option<Profile>, AppError>;

    async fn list(
        &self
    ) -> Result<Vec<Profile>, AppError>;

    async fn update(
        &self,
        profile: &Profile
    ) -> Result<(), AppError>;

    async fn archive(
        &self,
        id: &str
    ) -> Result<(), AppError>;
}
```

Infrastructure:

```text
infrastructure/database/repositories/
└── sqlite_profile_repository.rs
```

Không cho `ProfileService` viết SQL trực tiếp.

---

# P1-06 — ProfileService

Đây sẽ là core application service:

```text
application/services/
└── profile_service.rs
```

Responsibility:

```text
create_profile()
update_profile()
archive_profile()
get_profile()
list_profiles()

launch_profile()
stop_profile()
```

Nhưng launch nên delegate:

```text
ProfileService
      │
      ▼
BrowserService
```

Không gọi process trực tiếp.

---

# P1-07 — Create Profile flow

Flow chuẩn:

```text
CreateProfileRequest
        │
        ▼
validate
        │
        ▼
generate UUID
        │
        ▼
create DB transaction
        │
        ├── profiles
        └── profile_settings
        │
        ▼
create filesystem
        │
        ▼
return Profile
```

Input:

```json
{
	"name": "Profile 001",
	"description": "QA profile",
	"browserProvider": "cloak"
}
```

Rules:

```text
name
  required
  trim
  1..100 chars

browserProvider
  must be supported
```

Nếu filesystem fail:

```text
rollback DB
```

Hoặc nếu DB fail sau filesystem:

```text
cleanup generated directory
```

Mục tiêu:

```text
không bao giờ tồn tại half-created profile
```

---

# P1-08 — Profile delete strategy

Mình không recommend hard-delete ngay.

Dùng:

```text
Archive
```

UI:

```text
Delete Profile
     ↓
Archive
```

DB:

```text
is_archived = 1
```

Directory ban đầu vẫn giữ.

Sau này có thể thêm:

```text
Delete permanently
```

ở Advanced.

Điều này đặc biệt hữu ích khi profile chứa browser session/data.

---

# P1-09 — Browser launch config

Browser provider cần nhận model rõ ràng:

```rust
pub struct BrowserLaunchRequest {
    pub profile_id: String,
    pub user_data_dir: PathBuf,
    pub download_dir: PathBuf,
    pub startup_urls: Vec<String>,
}
```

Provider convert sang actual command.

Application layer:

```text
BrowserLaunchRequest
```

không nên chứa:

```text
Vec<String> arbitrary_args
```

để frontend tùy ý truyền CLI flags.

---

# P1-10 — CloakBrowser provider

Phase 0 có:

```text
BrowserProvider
├── detect()
└── version()
```

Phase 1 mở rộng:

```rust
trait BrowserProvider {
    async fn detect(&self) -> Result<BrowserInstallation, AppError>;

    async fn version(&self) -> Result<String, AppError>;

    async fn build_launch_spec(
        &self,
        request: BrowserLaunchRequest,
    ) -> Result<ProcessSpec, AppError>;
}
```

Ví dụ internally:

```text
CloakProvider

profile_id
     ↓
browser_data path
     ↓
build ProcessSpec
     ↓
ProcessManager.spawn()
```

Điểm quan trọng:

```text
BrowserProvider
    → biết arguments của browser

ProcessManager
    → không biết Cloak là gì
```

---

# P1-11 — ProcessSpec

Phase 0 có ProcessManager.

Phase 1 thêm:

```rust
pub struct ProcessSpec {
    pub executable: PathBuf,

    pub args: Vec<String>,

    pub working_dir: Option<PathBuf>,

    pub process_kind: ProcessKind,
}
```

ProcessManager:

```rust
spawn(spec)
```

trả:

```rust
ManagedProcess {
    id,
    pid,
    started_at,
}
```

---

# P1-12 — BrowserService

Thêm:

```text
application/services/browser_service.rs
```

Flow launch:

```text
launch_profile(profile_id)
        │
        ▼
ProfileRepository
        │
        ▼
Profile exists?
        │
        ▼
Check already running
        │
        ▼
BrowserProvider
        │
        ▼
build_launch_spec()
        │
        ▼
ProcessManager.spawn()
        │
        ▼
browser_instances INSERT
        │
        ▼
BrowserInstance
```

Pseudo:

```rust
pub async fn launch_profile(
    &self,
    profile_id: &str,
) -> Result<BrowserInstance, AppError> {

    let profile = self.profile_repo
        .find_by_id(profile_id)
        .await?
        .ok_or(AppError::ProfileNotFound)?;

    self.ensure_not_running(profile_id).await?;

    let paths = self.app_paths.profile(profile_id);

    let spec = self.provider
        .build_launch_spec(
            BrowserLaunchRequest {
                profile_id: profile.id.clone(),
                user_data_dir: paths.browser_data,
                download_dir: paths.downloads,
                startup_urls: vec![],
            }
        )
        .await?;

    let process = self.process_manager
        .spawn(spec)
        .await?;

    // persist instance

    Ok(instance)
}
```

---

# P1-13 — Enforce one process/profile

Phase 1 nên đặt rule:

```text
1 profile
    ↓
maximum 1 active browser instance
```

Nếu user click Launch lần hai:

```json
{
	"code": "PROFILE_ALREADY_RUNNING",
	"message": "This profile already has a running browser instance."
}
```

Đừng spawn browser thứ hai vào cùng user-data-dir.

Rất dễ:

```text
DB corruption
profile lock
browser crash
```

---

# P1-14 — Stop lifecycle

Flow:

```text
Stop
 │
 ▼
find instance
 │
 ▼
state = stopping
 │
 ▼
ProcessManager.terminate()
 │
 ▼
wait graceful timeout
 │
 ├── exited
 │
 │      ↓
 │ │  state stopped
 │
 └── timeout
        ↓
      force kill
        ↓
      state stopped
```

Mình recommend:

```text
graceful timeout = 5-10 seconds
```

Sau này mới config.

---

# P1-15 — Process exit monitoring

Đây là task quan trọng.

Nếu user tự đóng browser:

```text
User clicks X browser
       │
       ▼
browser process exits
       │
       ▼
ProcessManager detects exit
       │
       ▼
BrowserService
       │
       ▼
browser_instances
state = stopped
exit_code = ...
```

Nếu process crash:

```text
unexpected exit
      ↓
state = crashed
```

Frontend nhận event:

```text
browser://instance-exited
```

Payload:

```json
{
	"profileId": "...",
	"instanceId": "...",
	"state": "stopped",
	"exitCode": 0
}
```

React Query:

```text
event
 ↓
invalidateQueries(profile)
 ↓
UI update
```

---

# P1-16 — Recovery khi ProfileDock restart

Ví dụ:

```text
ProfileDock starts browser
      ↓
browser PID 1234
      ↓
ProfileDock bị kill
      ↓
browser có thể vẫn chạy
```

Khi ProfileDock mở lại:

```text
startup
   │
   ▼
find instances state=running
   │
   ▼
check PID
   │
   ├── process exists
   │      ↓
   │   restore runtime state
   │
   └── process gone
          ↓
      mark stopped/crashed
```

Đây gọi là:

```text
runtime reconciliation
```

Thêm:

```rust
InstanceReconciler
```

hoặc:

```rust
BrowserService::reconcile_instances()
```

App startup:

```text
database init
     ↓
migrations
     ↓
reconcile browser instances
     ↓
start UI
```

---

# P1-17 — Profile DTOs

Không return domain struct trực tiếp ra FE.

Tạo:

```text
commands/profile/dto.rs
```

Ví dụ:

```rust
#[derive(Serialize)]
pub struct ProfileDto {
    pub id: String,
    pub name: String,

    pub state: String,

    pub browser: BrowserSummaryDto,

    pub created_at: String,
}
```

State này được derived:

```text
Profile DB
     +
Active BrowserInstance
     ↓
ProfileDto.state
```

---

# P1-18 — Tauri commands

Phase 1 command contract:

```text
profiles_list
profiles_get
profiles_create
profiles_update
profiles_archive

profiles_launch
profiles_stop

profiles_get_instance
```

Không dùng:

```text
create_profile
update_profile
```

lẫn naming convention tùy ý.

Chốt convention ngay.

Mình thích:

```text
profile_create
profile_update
profile_get
profile_list
profile_archive

profile_launch
profile_stop
```

Ngắn hơn.

---

# P1-19 — Typed frontend API

FE:

```text
src/lib/tauri/
├── client.ts
└── profile.ts
```

Ví dụ:

```ts
export const profileApi = {
	list() {
		return invoke<Profile[]>('profile_list');
	},

	get(id: string) {
		return invoke<Profile>('profile_get', { id });
	},

	create(input: CreateProfileInput) {
		return invoke<Profile>('profile_create', {
			input,
		});
	},

	launch(id: string) {
		return invoke<BrowserInstance>('profile_launch', { id });
	},

	stop(id: string) {
		return invoke<void>('profile_stop', { id });
	},
};
```

React component không import:

```ts
invoke;
```

trực tiếp.

---

# P1-20 — React Query layer

Feature:

```text
features/profiles/
├── api/
│   ├── queries.ts
│   └── mutations.ts
├── components/
├── pages/
├── hooks/
├── schemas/
└── types/
```

Query keys:

```ts
export const profileKeys = {
	all: ['profiles'] as const,

	list: () => [...profileKeys.all, 'list'] as const,

	detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
};
```

Queries:

```text
useProfiles()
useProfile(id)
```

Mutations:

```text
useCreateProfile()
useUpdateProfile()
useArchiveProfile()

useLaunchProfile()
useStopProfile()
```

---

# P1-21 — Profile list UI

Main Profiles screen:

```text
┌────────────────────────────────────────────────────────────┐
│ Profiles                              [+ New Profile]      │
│                                                            │
│ Search profiles...                                        │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Profile QA #01                              ● Ready  │   │
│ │ CloakBrowser                                          │   │
│ │                                                       │   │
│ │ Last opened: 2h ago                   [ Launch ] ⋮   │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Profile QA #02                            ● Running  │   │
│ │ CloakBrowser                                          │   │
│ │                                                       │   │
│ │ PID 14024                              [ Stop ] ⋮    │   │
│ └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

Không cần làm table nếu bạn muốn UI thiên về desktop manager.

Card/grid phù hợp hơn.

---

# P1-22 — Create Profile dialog

Dialog:

```text
Create Profile

Name
[ QA Browser 01                ]

Description
[                              ]

Browser
[ CloakBrowser              v ]

                    Cancel   Create
```

Phase 1 đừng nhồi:

```text
Proxy
Fingerprint
Timezone spoof
User-agent spoof
Automation
```

vào dialog.

Profile creation phải rất nhẹ.

---

# P1-23 — Profile detail

Route:

```text
/profiles/:id
```

Layout:

```text
Profile QA 01                         ● Running

[ Overview ] [ Storage ] [ Activity ]

Browser
CloakBrowser

Runtime
PID               14024
Started           14:34
Runtime           01:12:04

Storage
Browser Data      328 MB
Downloads         20 MB

[ Stop Browser ]
```

Phase 1 tabs:

```text
Overview
Storage
Activity
```

Settings nâng cao để phase sau.

---

# P1-24 — Profile activity log

Bạn đã có logging ở Phase 0.

Phase 1 thêm domain activity:

```text
profile_created
profile_updated

browser_started
browser_stopped
browser_crashed

profile_archived
```

Có thể thêm table:

```sql
CREATE TABLE profile_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    profile_id TEXT NOT NULL,

    event_type TEXT NOT NULL,

    metadata_json TEXT,

    created_at TEXT NOT NULL
);
```

Ví dụ:

```text
16:22  Browser launched
16:10  Profile updated
13:42  Browser stopped
12:10  Browser launched
```

Khác với debug logs.

```text
debug logs
     → developer

profile events
     → user-facing audit
```

---

# P1-25 — Search

Phase 1 chỉ cần:

```text
search by name
```

Không cần Elasticsearch hay gì phức tạp.

SQLite:

```sql
WHERE name LIKE ?
```

Nếu dự kiến hàng chục nghìn profiles sau này có thể FTS, nhưng chưa cần.

---

# P1-26 — Profile archive rule

Không cho archive nếu đang running.

Flow:

```text
Archive
   │
   ▼
active instance?
   │
   ├── yes
   │      ↓
   │   PROFILE_RUNNING
   │
   └── no
          ↓
      archive
```

UI:

```text
Stop the browser before archiving this profile.
```

---

# P1-27 — Browser data safety

Điều này rất quan trọng.

Không bao giờ:

```text
rm -rf browser-data
```

khi:

```text
archive profile
```

Archive chỉ:

```text
is_archived = true
```

Nếu sau này user chọn:

```text
Delete permanently
```

thì mới xóa filesystem.

---

# P1-28 — Duplicate profile

Mình sẽ **không làm trong Phase 1 MVP**.

Vì copy raw browser profile có thể rất lớn:

```text
Cache
Service Worker
IndexedDB
Cookies
LocalStorage
Extensions
```

và có vấn đề lock/file consistency.

Để Phase 1.5 hoặc Phase 2.

---

# P1-29 — Concurrency protection

Quan trọng vì UI có thể double click.

Launch:

```text
ProfileService
    │
    ▼
per-profile lock
```

Có thể dùng:

```rust
DashMap<ProfileId, Mutex<()>>
```

hoặc manager abstraction.

Flow:

```text
launch profile A
     │
     ▼
lock A
     │
     ▼
check instance
     │
     ▼
spawn
```

Hai concurrent calls:

```text
Launch A
Launch A
```

không được tạo 2 browser.

---

# P1-30 — Instance registry

ProcessManager nên có runtime registry:

```rust
HashMap<InstanceId, ManagedProcess>
```

được wrap:

```rust
Arc<RwLock<...>>
```

Conceptually:

```text
ProcessManager

instances
├── instance-001 → PID 1234
├── instance-002 → PID 4321
└── ...
```

Không để mỗi command tự quản lý Child process.

---

# P1-31 — Health state

Profile state FE nên derive như:

```text
archived
  if profile.is_archived

running
  if active instance exists

error
  if latest launch failed

ready
  otherwise
```

Không persist những state derived này vào `profiles`.

---

# P1-32 — Tests

Phase 1 nên bắt buộc test:

```text
ProfileService
├── create
├── validation
├── archive
└── archive-running-profile denied

BrowserService
├── launch
├── duplicate launch denied
├── stop
├── process exit
└── reconciliation

ProfileRepository
├── CRUD
└── migration

ProfilePaths
├── deterministic
└── traversal protection
```

Một case security quan trọng:

```text
profile_id = "../../something"
```

không được escape khỏi:

```text
ProfileDock/profiles/
```

Tốt nhất ID được generated server-side, không nhận arbitrary path từ FE.

---

# Phase 1 Task Board

Nếu giao thẳng cho coding agent, mình sẽ chia như sau:

```text
P1-01
Create Profile domain model

P1-02
Create profile database migrations

P1-03
Implement SQLiteProfileRepository

P1-04
Implement ProfilePaths

P1-05
Implement ProfileService

P1-06
Implement profile create/get/list/update/archive

P1-07
Create BrowserInstance domain model

P1-08
Create browser_instances migration

P1-09
Extend BrowserProvider launch interface

P1-10
Implement CloakBrowser ProcessSpec builder

P1-11
Extend ProcessManager instance registry

P1-12
Implement BrowserService

P1-13
Implement launch_profile

P1-14
Enforce one active instance per profile

P1-15
Implement graceful stop + force terminate fallback

P1-16
Implement process exit observer

P1-17
Implement instance reconciliation on startup

P1-18
Implement profile_events audit

P1-19
Create typed Tauri commands

P1-20
Create TypeScript profile API

P1-21
Create React Query queries + mutations

P1-22
Build Profiles list page

P1-23
Build Create Profile dialog

P1-24
Build Edit Profile

P1-25
Build Profile detail page

P1-26
Build Launch / Stop actions

P1-27
Build profile runtime status

P1-28
Build Activity feed

P1-29
Implement archive UX

P1-30
Add concurrency guards

P1-31
Add unit + integration tests

P1-32
Windows lifecycle test
```

---

# Thứ tự implementation

Không nên để agent làm FE trước.

Làm theo dependency:

```text
                         ┌──────────────┐
                         │ Domain Model │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ DB Migration │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Repository   │
                         └──────┬───────┘
                                │
                    ┌───────────┴──────────┐
                    ▼                      ▼
             ProfileService        BrowserInstance
                                           │
                                           ▼
                                    BrowserProvider
                                           │
                                           ▼
                                    ProcessManager
                                           │
                                           ▼
                                    BrowserService
                                           │
                                           ▼
                                     Tauri Commands
                                           │
                                           ▼
                                       TS API
                                           │
                                           ▼
                                     React Query
                                           │
                                           ▼
                                          UI
```

Đây là thứ tự mình khuyên giữ nghiêm.

---

# Definition of Done

Phase 1 chỉ coi là **DONE** khi scenario này chạy hoàn chỉnh:

```text
Fresh Install
    │
    ▼
Open ProfileDock
    │
    ▼
Create Profile "QA 01"
    │
    ├── DB record created
    │
    └── profile directory created
          │
          ▼
       Launch
          │
          ▼
       Browser opens
          │
          ├── isolated browser-data
          │
          └── PID registered
          │
          ▼
      UI → Running
          │
          ▼
user closes browser
          │
          ▼
ProfileDock detects exit
          │
          ▼
UI → Ready
          │
          ▼
Launch again
          │
          ▼
previous browser data retained
          │
          ▼
Stop from ProfileDock
          │
          ▼
browser gracefully exits
          │
          ▼
Archive profile
          │
          ▼
profile hidden from default list
```

Acceptance criteria:

```text
[✓] Create profile works

[✓] Profile gets UUID generated by backend

[✓] Profile filesystem automatically created

[✓] Each profile receives a unique browser-data directory

[✓] Browser launches against the expected profile directory

[✓] Browser data persists across launches

[✓] Two profiles never share browser-data directories

[✓] Same profile cannot be launched twice concurrently

[✓] Running PID is tracked

[✓] Closing browser manually updates ProfileDock

[✓] Stop from ProfileDock works

[✓] Unexpected process exit is detected

[✓] Restarting ProfileDock reconciles stale instances

[✓] Profile can be edited

[✓] Running profile cannot be archived

[✓] Archived profile preserves browser data

[✓] Activity history is persisted

[✓] FE never directly spawns external processes

[✓] FE never builds arbitrary browser CLI commands

[✓] DB migration works from clean install

[✓] Rust tests pass

[✓] pnpm typecheck passes

[✓] Windows build passes
```

---

# Phase 1 không nên làm

Để tránh scope creep, explicitly exclude:

```text
OUT OF SCOPE

Proxy pool
Proxy rotation
Proxy health checker

Browser fingerprint manipulation
Canvas/WebGL spoofing
Device impersonation
Anti-detection bypass

TikTok automation
Scrolling automation
Click automation
Human behavior simulation

Account management

Batch launch

Profile cloning

Cloud sync

Remote API

Scheduler
```

Những phần hợp lệ như proxy configuration cơ bản có thể đưa vào Phase 2, nhưng nên tách khỏi Profile Core.

---

# Sau Phase 1

Roadmap nên trở thành:

```text
Phase 0
Foundation
   │
   ▼
Phase 1                     ← NOW
Profile Core
   │
   ├── CRUD
   ├── Storage isolation
   ├── Browser lifecycle
   ├── Instance management
   └── Recovery
   │
   ▼
Phase 2
Proxy Core
   │
   ├── Proxy CRUD
   ├── Validation
   ├── Health check
   └── Profile assignment
   │
   ▼
Phase 3
Browser Configuration
   │
   ├── Startup configuration
   ├── Extensions
   ├── Downloads
   └── Browser preferences
   │
   ▼
Phase 4
Operations
```

Điểm mình ưu tiên nhất trong **Phase 1** là đừng coi `Profile` đơn giản là một row SQLite. Trong ProfileDock, profile thực chất phải là aggregate:

```text
Profile
├── Metadata
├── Settings
├── Filesystem
├── Browser Data
├── Current Instance
└── Activity History
```

Nếu thiết kế đúng aggregate này ngay Phase 1 thì Phase 2 Proxy và các module browser sau đó chỉ việc reference `profile_id`, không phải thay đổi lại core architecture.
