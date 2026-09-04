Mình đã ghi nhận quyết định kiến trúc: **ProfileDock chỉ hỗ trợ duy nhất CloakBrowser**. Vì vậy từ Phase 3 trở đi không cần thiết kế multi-browser/provider nữa. Điều này giúp code đơn giản hơn khá nhiều.

# Phase 3 — CloakBrowser Configuration Layer

Mục tiêu Phase 3 là biến phần browser từ:

```text
Profile
   ↓
Launch CloakBrowser
```

thành một pipeline hoàn chỉnh:

```text
Profile
   │
   ├── Browser Settings
   ├── Startup URLs
   ├── Download Settings
   ├── Proxy Assignment
   └── Runtime Settings
          │
          ▼
CloakConfigResolver
          │
          ▼
CloakBrowserService
          │
          ▼
Preflight Validation
          │
          ▼
ProcessManager
          │
          ▼
CloakBrowser
```

Phase 3 vẫn chưa cần automation click/scroll hay giả lập hành vi người dùng. Nó tập trung vào **configuration + lifecycle + integration CloakBrowser thật chắc chắn**.

---

# 3.1 — Bỏ kiến trúc multi-provider

Ở Phase 0/1 mình có đề xuất:

```text
BrowserProvider
├── CloakProvider
└── FutureProvider
```

Bây giờ đã chốt chỉ có CloakBrowser thì bỏ layer này.

Không cần:

```rust
enum BrowserProvider {
    Cloak,
    Chrome,
    Firefox,
}
```

Không cần:

```rust
profile.browser_provider
```

Không cần UI:

```text
Browser
[ CloakBrowser ▼ ]
```

vì nó luôn là CloakBrowser.

Architecture mới:

```text
BrowserService
      │
      ▼
CloakBrowserService
      │
      ├── CloakInstallation
      ├── CloakConfigResolver
      ├── CloakLaunchBuilder
      └── CloakCapabilities
              │
              ▼
         ProcessManager
```

Tuy nhiên vẫn nên giữ một abstraction nhỏ cho **testability**, ví dụ:

```rust
trait BrowserRuntime {
    async fn launch(...);
    async fn stop(...);
}
```

Nhưng abstraction này không mang nghĩa hỗ trợ browser khác.

---

# 3.2 — Clean database từ Phase 1

Nếu hiện tại có:

```sql
profiles.browser_provider
```

thì Phase 3 nên remove.

Schema cuối:

```sql
profiles
---------
id
name
description
is_archived
created_at
updated_at
```

Nếu database development chưa có dữ liệu quan trọng, bạn có thể migration thẳng.

Nếu muốn giữ data, SQLite migration kiểu:

```sql
CREATE TABLE profiles_new (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO profiles_new (
    id,
    name,
    description,
    is_archived,
    created_at,
    updated_at
)
SELECT
    id,
    name,
    description,
    is_archived,
    created_at,
    updated_at
FROM profiles;

DROP TABLE profiles;

ALTER TABLE profiles_new
RENAME TO profiles;
```

---

# 3.3 — CloakBrowser installation model

Vì chỉ có một browser nên installation là app-level state, không phải profile-level.

Có thể có:

```rust
pub struct CloakInstallation {
    pub executable: PathBuf,
    pub version: Option<String>,
    pub valid: bool,
    pub last_checked_at: DateTime<Utc>,
}
```

Lưu:

```text
Cloak executable path
version
installation validation
```

Nhưng **không lưu executable path trên từng profile**.

Structure:

```text
ProfileDock
   │
   ├── CloakBrowser Installation
   │       └── one per app
   │
   └── Profiles
           ├── Profile A
           ├── Profile B
           └── Profile C
```

---

# 3.4 — CloakCapabilities

Dù chỉ một browser, vẫn nên có capability model vì **version CloakBrowser khác nhau có thể hỗ trợ feature khác nhau**.

Ví dụ:

```rust
pub struct CloakCapabilities {
    pub startup_urls: bool,
    pub custom_download_dir: bool,
    pub proxy: bool,
    pub proxy_auth: bool,
    pub extension_loading: bool,
    pub window_configuration: bool,
}
```

Không hardcode UI kiểu:

```text
Cloak luôn hỗ trợ X
```

Nếu chưa xác nhận.

Flow:

```text
Cloak executable
      ↓
detect version
      ↓
resolve capabilities
      ↓
UI chỉ enable feature supported
```

Sau này Cloak update version cũng dễ xử lý.

---

# 3.5 — Profile browser settings

Tạo table riêng:

```sql
CREATE TABLE profile_browser_settings (
    profile_id TEXT PRIMARY KEY,

    startup_urls_json TEXT NOT NULL DEFAULT '[]',

    download_mode TEXT NOT NULL DEFAULT 'profile',
    custom_download_dir TEXT,

    window_mode TEXT NOT NULL DEFAULT 'normal',

    restore_session INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);
```

Model:

```rust
pub struct ProfileBrowserSettings {
    pub profile_id: String,

    pub startup_urls: Vec<String>,

    pub download_mode: DownloadMode,
    pub custom_download_dir: Option<PathBuf>,

    pub window_mode: WindowMode,

    pub restore_session: bool,
}
```

---

# 3.6 — DownloadMode

Không nên để arbitrary path ngay từ đầu.

Dùng typed model:

```rust
pub enum DownloadMode {
    Profile,
    Custom,
}
```

`Profile`:

```text
%LOCALAPPDATA%\ProfileDock\
└── profiles/
    └── {id}/
        └── downloads/
```

`Custom`:

```text
User-selected folder
```

Default:

```text
Profile
```

là tốt nhất vì giữ profile isolation.

---

# 3.7 — Startup URLs

Profile có thể định nghĩa:

```text
Startup URLs

https://example.com
https://example.org
```

Database:

```json
["https://example.com", "https://example.org"]
```

Validation backend:

```text
http://
https://
```

Không nhận các scheme tùy ý.

Có thể giới hạn chẳng hạn:

```text
max 20 startup URLs
```

để tránh input vô hạn.

---

# 3.8 — Window settings

Chỉ nên quản lý window-level preference bình thường:

```rust
pub enum WindowMode {
    Normal,
    Maximized,
}
```

Có thể sau này thêm:

```text
width
height
position
```

nhưng Phase 3 MVP chưa cần.

Không đưa hardware/fingerprint manipulation vào model này.

---

# 3.9 — CloakLaunchConfig

Đây là object quan trọng nhất Phase 3.

Không truyền một đống arguments từ FE xuống Rust.

Tạo:

```rust
pub struct CloakLaunchConfig {
    pub profile_id: String,

    pub user_data_dir: PathBuf,
    pub download_dir: PathBuf,

    pub startup_urls: Vec<String>,

    pub proxy: Option<ResolvedBrowserProxy>,

    pub window_mode: WindowMode,

    pub restore_session: bool,
}
```

Luồng:

```text
Database
   │
   ├── Profile
   ├── Browser Settings
   └── Proxy Assignment
          │
          ▼
CloakConfigResolver
          │
          ▼
CloakLaunchConfig
          │
          ▼
CloakLaunchBuilder
```

---

# 3.10 — CloakConfigResolver

Tạo:

```text
application/services/
└── cloak_config_resolver.rs
```

Responsibility:

```rust
resolve(profile_id)
    -> CloakLaunchConfig
```

Nó gom:

```text
ProfileRepository
BrowserSettingsRepository
ProxyService
AppPaths
```

thành một configuration duy nhất.

Ví dụ:

```text
Profile QA 01

Profile paths
    browser_data
    downloads

Browser settings
    startup_urls
    restore_session

Proxy assignment
    SG Proxy 01

            ↓

CloakLaunchConfig
```

BrowserService không nên tự query 4 repository khác nhau.

---

# 3.11 — CloakLaunchBuilder

Tách khỏi resolver.

```text
CloakConfigResolver
        │
        ▼
CloakLaunchConfig
        │
        ▼
CloakLaunchBuilder
        │
        ▼
ProcessSpec
```

Resolver hiểu domain.

Builder hiểu **CloakBrowser được launch như thế nào**.

Ví dụ:

```rust
pub struct CloakLaunchBuilder {
    installation: CloakInstallation,
}

impl CloakLaunchBuilder {
    pub fn build(
        &self,
        config: &CloakLaunchConfig,
    ) -> Result<ProcessSpec, AppError> {
        // ...
    }
}
```

Không để code kiểu:

```rust
Command::new("cloak.exe")
```

rải ở nhiều service.

---

# 3.12 — Không hỗ trợ arbitrary launch args

Không tạo UI:

```text
Custom arguments
[                                  ]
```

và cũng không tạo IPC:

```rust
launch_profile(
    profile_id,
    args: Vec<String>
)
```

Thay vào đó chỉ support typed settings:

```text
startup_urls
download_mode
window_mode
proxy
restore_session
```

Từ đó Rust tự build command/config hợp lệ.

Điều này vừa ổn định architecture vừa tránh frontend trở thành shell controller.

---

# 3.13 — Preflight service

Trước mỗi launch:

```text
Launch
  │
  ▼
CloakPreflight
  │
  ├── executable exists?
  ├── installation valid?
  ├── profile exists?
  ├── profile archived?
  ├── profile already running?
  ├── browser_data writable?
  ├── downloads writable?
  ├── settings valid?
  └── proxy assignment resolvable?
          │
          ▼
        Launch
```

Tạo:

```rust
pub struct CloakPreflightService;
```

Output:

```rust
pub struct PreflightResult {
    pub ready: bool,
    pub warnings: Vec<PreflightWarning>,
}
```

Một số warning không nhất thiết block launch.

Ví dụ:

```text
Proxy has not been checked recently
```

có thể warning.

Nhưng:

```text
Cloak executable not found
```

phải block.

---

# 3.14 — Error taxonomy

Phase 3 thêm:

```text
CLOAK_NOT_INSTALLED

CLOAK_EXECUTABLE_NOT_FOUND

CLOAK_INSTALLATION_INVALID

CLOAK_VERSION_UNSUPPORTED

CLOAK_CAPABILITY_UNSUPPORTED

CLOAK_CONFIG_INVALID

CLOAK_LAUNCH_FAILED

CLOAK_PROFILE_DIRECTORY_INVALID

CLOAK_PROCESS_EXITED_EARLY
```

Ví dụ FE:

```json
{
	"code": "CLOAK_EXECUTABLE_NOT_FOUND",
	"message": "CloakBrowser executable could not be found."
}
```

Log developer vẫn có underlying error.

---

# 3.15 — Early-exit detection

Có case:

```text
Process spawn success
     ↓
PID created
     ↓
200ms later
     ↓
Cloak crashes
```

Không nên báo UI:

```text
Running
```

ngay khi `spawn()` thành công.

Nên:

```text
starting
   ↓
spawn
   ↓
short startup observation
   ↓
process alive?
   ├── yes → running
   └── no  → failed
```

State Phase 1 đã có:

```text
starting
running
stopping
stopped
crashed
failed
```

Phase 3 tận dụng chính xác model này.

---

# 3.16 — BrowserSettingsRepository

Domain:

```rust
#[async_trait]
pub trait BrowserSettingsRepository {
    async fn get(
        &self,
        profile_id: &str
    ) -> Result<ProfileBrowserSettings, AppError>;

    async fn save(
        &self,
        settings: &ProfileBrowserSettings
    ) -> Result<(), AppError>;
}
```

Infrastructure:

```text
sqlite_browser_settings_repository.rs
```

Không cho `CloakBrowserService` chạy SQL.

---

# 3.17 — Extension management

Mình sẽ đặt extension management ở **Phase 3.5 optional**, không để nó block Phase 3.

Lý do là trước tiên phải xác nhận chính xác CloakBrowser version bạn dùng hỗ trợ load/manage Chromium extension theo cơ chế nào.

Architecture có thể chuẩn bị:

```text
Profile
  │
  └── Extensions
       ├── Extension A
       └── Extension B
```

nhưng không assume:

```text
--load-extension
```

hoặc format config nào đó nếu chưa verify CloakBrowser thực tế.

Rule:

```text
Cloak documented/supported mechanism
            ↓
use

unknown mechanism
            ↓
do not guess
```

---

# 3.18 — CloakBrowser version compatibility

Settings page Phase 0 đã có browser detection.

Phase 3 mở rộng thành:

```text
CloakBrowser

Executable
C:\...\cloak.exe

Version
1.x.x

Status
● Compatible

Capabilities
Startup URLs       Supported
Proxy              Supported
Download directory Supported
```

Lưu ý:

```text
Detected
```

khác:

```text
Compatible
```

Một file `.exe` tồn tại không có nghĩa version đó phù hợp với integration hiện tại.

---

# 3.19 — Compatibility matrix

Có thể giữ trong Rust:

```rust
pub struct CloakCompatibility {
    pub minimum_version: Option<Version>,
}
```

Hoặc nếu API/config của Cloak thay đổi giữa version:

```text
Version family
   ↓
Launch strategy
```

Nhưng tránh overengineering nếu hiện tại chỉ có một version bạn control.

---

# 3.20 — Profile detail UI

Phase 2:

```text
Overview
Storage
Activity
```

Phase 3 thêm:

```text
Overview
Browser
Network
Storage
Activity
```

Browser tab:

```text
Profile QA 01
────────────────────────────────────────

CloakBrowser

Startup
Restore previous session       [✓]

Startup URLs
┌─────────────────────────────┐
│ https://example.com      × │
│ https://example.org      × │
└─────────────────────────────┘
[ + Add URL ]

Downloads

Location
● Profile Downloads
○ Custom

Window

Launch mode
[ Normal ▼ ]

                          [ Save ]
```

Không cần browser selector nữa.

---

# 3.21 — Profile Overview

Overview có thể trở thành:

```text
Profile QA 01                           ● Ready

Browser
CloakBrowser 1.x.x
● Compatible

Network
SG Proxy 01
● Healthy

Storage
Browser data        532 MB
Downloads            42 MB

Last session
Yesterday 18:42
Duration 01:22:10

[ Launch ]
```

---

# 3.22 — Settings > CloakBrowser

Không gọi menu:

```text
Browsers
```

nữa.

Vì chỉ có một browser.

Đổi thành:

```text
Settings
└── CloakBrowser
```

UI:

```text
CloakBrowser Installation

Executable
C:\Apps\CloakBrowser\cloak.exe

Version
1.x.x

Status
● Ready

[ Change executable ]
[ Validate installation ]
```

Sidebar cũng không cần `Browsers` nếu nó chỉ có một item.

---

# 3.23 — Tauri Commands

Phase 3 mình chốt command contract:

```text
cloak_get_installation
cloak_set_executable
cloak_validate_installation
cloak_get_capabilities

profile_browser_settings_get
profile_browser_settings_update

profile_preflight
profile_launch
profile_stop
```

Không còn:

```text
browser_provider_list
browser_provider_select
```

hay tương tự.

---

# 3.24 — Frontend API

Ví dụ:

```ts
export const cloakApi = {
	installation() {
		return invoke<CloakInstallation>('cloak_get_installation');
	},

	validate() {
		return invoke<CloakValidationResult>(
			'cloak_validate_installation',
		);
	},

	capabilities() {
		return invoke<CloakCapabilities>('cloak_get_capabilities');
	},
};
```

Profile settings:

```ts
export const browserSettingsApi = {
	get(profileId: string) {
		return invoke<ProfileBrowserSettings>(
			'profile_browser_settings_get',
			{ profileId },
		);
	},

	update(profileId: string, input: UpdateBrowserSettingsInput) {
		return invoke<ProfileBrowserSettings>(
			'profile_browser_settings_update',
			{
				profileId,
				input,
			},
		);
	},
};
```

---

# 3.25 — React Query

Query keys:

```ts
const cloakKeys = {
	all: ['cloak'] as const,

	installation: () => [...cloakKeys.all, 'installation'] as const,

	capabilities: () => [...cloakKeys.all, 'capabilities'] as const,
};
```

Profile:

```ts
profileKeys.browserSettings(profileId);
profileKeys.preflight(profileId);
```

Không cần:

```text
browserKeys(provider)
```

nữa.

---

# 3.26 — Activity history

Thêm events:

```text
browser_settings_updated

cloak_installation_changed

browser_preflight_failed

browser_launch_started
browser_launch_success
browser_launch_failed

browser_stopped
browser_crashed
```

Ví dụ user-facing:

```text
08:21  CloakBrowser launched
08:18  Browser settings updated
07:52  CloakBrowser stopped
```

Không lưu secrets hoặc full proxy credentials vào event metadata.

---

# 3.27 — Config snapshot per instance

Mình rất recommend task này.

Khi launch browser, lưu **snapshot non-sensitive configuration** đã dùng.

Ví dụ thêm vào:

```text
browser_instances.config_snapshot_json
```

Snapshot:

```json
{
	"windowMode": "normal",
	"startupUrlCount": 2,
	"proxyId": "019...",
	"cloakVersion": "1.x.x"
}
```

Không lưu:

```text
proxy password
```

Benefit:

```text
Profile settings hiện tại
          ≠
settings lúc browser instance cũ chạy
```

Audit/debug dễ hơn rất nhiều.

---

# 3.28 — Config version

Thêm:

```rust
pub const CLOAK_CONFIG_VERSION: u32 = 1;
```

Snapshot:

```json
{
	"configVersion": 1
}
```

Sau này Phase 7/8 app thay đổi configuration model vẫn đọc được historical instance.

---

# 3.29 — Prevent settings modification while running

Mình recommend rule tương tự proxy:

```text
Profile Running
      ↓
Browser configuration locked
```

Không cho đổi:

```text
download directory
startup configuration
window mode
```

trong lúc process đang chạy.

UI:

```text
Stop CloakBrowser before editing browser settings.
```

Đơn giản hơn việc hot reload config rất nhiều.

Startup URL có thể về lý thuyết thay đổi, nhưng nó chỉ ảnh hưởng next launch nên tốt hơn lock nhất quán ở MVP.

---

# 3.30 — Tests

Phase 3 cần test cả config resolution lẫn process integration.

Quan trọng nhất:

```text
CloakConfigResolver
├── profile paths
├── browser settings
├── no proxy
├── assigned proxy
└── invalid config

CloakLaunchBuilder
├── correct executable
├── correct profile directory
├── correct downloads directory
└── no arbitrary frontend args

CloakPreflight
├── missing executable
├── invalid executable
├── running profile
├── invalid storage
└── ready

Browser lifecycle
├── starting
├── running
├── early exit
├── manual close
├── stop
└── crash

Settings
├── persistence
├── validation
└── cannot change while running
```

Process test có thể dùng dummy executable thay vì launch CloakBrowser thật trong unit test.

CloakBrowser thật dùng E2E test Windows.

---

# Phase 3 Task Board

Giao agent theo thứ tự này:

```text
P3-01
Lock architecture to CloakBrowser only

P3-02
Remove BrowserProvider enum / provider selection

P3-03
Remove browser_provider from Profile model

P3-04
Create migration for profile schema cleanup

P3-05
Create CloakInstallation model

P3-06
Create CloakCapabilities model

P3-07
Create profile_browser_settings migration

P3-08
Implement BrowserSettingsRepository

P3-09
Implement typed browser settings models

P3-10
Implement startup URL validation

P3-11
Implement download directory configuration

P3-12
Implement CloakConfigResolver

P3-13
Implement CloakLaunchConfig

P3-14
Implement CloakLaunchBuilder

P3-15
Implement CloakPreflightService

P3-16
Integrate ProxyService from Phase 2

P3-17
Integrate AppPaths / ProfilePaths

P3-18
Implement installation validation

P3-19
Implement version detection

P3-20
Implement capability detection

P3-21
Improve process early-exit detection

P3-22
Create configuration snapshot per instance

P3-23
Add config versioning

P3-24
Lock browser settings while running

P3-25
Add typed Tauri commands

P3-26
Create cloakApi frontend layer

P3-27
Create browserSettingsApi

P3-28
Add React Query hooks

P3-29
Build Settings > CloakBrowser

P3-30
Build Profile > Browser tab

P3-31
Update Profile Overview

P3-32
Add preflight UI

P3-33
Add activity events

P3-34
Add Rust unit tests

P3-35
Add integration tests

P3-36
Windows CloakBrowser E2E test
```

---

# Flow cuối Phase 3

Toàn bộ launch flow lúc này phải thành:

```text
User clicks Launch
        │
        ▼
ProfileService
        │
        ▼
CloakPreflightService
        │
        ├── installation
        ├── profile
        ├── storage
        ├── settings
        └── proxy
        │
        ▼
CloakConfigResolver
        │
        ├── Profile
        ├── ProfilePaths
        ├── BrowserSettings
        └── ProxyService
        │
        ▼
CloakLaunchConfig
        │
        ▼
CloakLaunchBuilder
        │
        ▼
ProcessSpec
        │
        ▼
ProcessManager
        │
        ▼
CloakBrowser
        │
        ▼
startup observation
        │
        ├── alive ──► RUNNING
        │
        └── exited ─► FAILED
```

Đây nên là **một đường duy nhất để launch CloakBrowser** trong toàn bộ application.

---

# Definition of Done

Phase 3 chỉ DONE khi:

```text
[✓] ProfileDock chỉ còn concept CloakBrowser

[✓] Không còn browser selector/provider selector

[✓] profiles không còn phụ thuộc browser_provider

[✓] CloakBrowser executable được detect + validate

[✓] CloakBrowser version được đọc

[✓] capability model hoạt động

[✓] Browser settings persist per profile

[✓] Startup URLs persist + validate

[✓] Downloads isolated per profile

[✓] Browser settings không sửa được khi running

[✓] Profile proxy được resolve từ Phase 2

[✓] Credentials không xuất hiện trong config snapshot

[✓] CloakLaunchConfig được resolve hoàn toàn ở Rust

[✓] FE không truyền arbitrary CLI args

[✓] CloakLaunchBuilder là nơi duy nhất build ProcessSpec

[✓] Preflight chạy trước launch

[✓] Missing Cloak executable trả typed error

[✓] Early process crash được detect

[✓] Browser instance có config snapshot

[✓] Manual browser close được detect

[✓] Restart ProfileDock vẫn reconcile instance đúng

[✓] Settings > CloakBrowser hoàn chỉnh

[✓] Profile > Browser hoàn chỉnh

[✓] Rust tests pass

[✓] TypeScript typecheck pass

[✓] Windows build pass

[✓] CloakBrowser E2E launch pass
```

Sau Phase 3, kiến trúc ProfileDock của bạn sẽ khá sạch:

```text
Profile
├── Metadata
├── Browser Settings
├── Storage
├── Proxy
├── Activity
└── Browser Instance
        │
        ▼
CloakConfigResolver
        │
        ▼
CloakBrowserService
        │
        ▼
ProcessManager
        │
        ▼
CloakBrowser
```

Và vì đã **chốt chỉ dùng CloakBrowser**, từ Phase 4 trở đi mình cũng sẽ thiết kế trực tiếp quanh CloakBrowser, không thêm layer Chrome/Firefox/AdsPower/GoLogin hay `BrowserProvider` chung nữa.
