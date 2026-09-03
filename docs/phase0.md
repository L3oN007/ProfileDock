Sau khi Tauri + monorepo đã build pass, mình sẽ coi **Phase 0 của ProfileDock = Foundation / Application Core**. Mục tiêu của phase này chưa phải làm profile hay automation, mà là tạo nền móng để các phase sau không phải sửa lại kiến trúc.

> Scope hợp lý của ProfileDock là quản lý profile/browser/proxy và automation cho testing hoặc workflow được phép. Không nên thiết kế phần né phát hiện, giả hành vi người dùng để vượt cơ chế chống abuse của nền tảng.

## Phase 0 — Foundation

Kết thúc Phase 0, app nên đạt trạng thái:

```text
ProfileDock
   │
   ├── React UI chạy
   ├── React ↔ Tauri IPC chạy
   ├── Rust application state chạy
   ├── SQLite chạy + migration
   ├── Logging chạy
   ├── App data directory chuẩn
   ├── Process manager abstraction có sẵn
   ├── CloakBrowser binary được detect
   ├── Error model thống nhất
   └── Windows build pass
```

Chưa cần:

```text
❌ tạo browser profile hoàn chỉnh
❌ proxy assignment
❌ launch nhiều profile
❌ TikTok integration
❌ browser automation
```

---

# 0.1 — Dọn lại monorepo trước

Hiện package của bạn tên:

```text
@profiledock/desktop
```

nhưng physical folder vẫn là:

```text
apps/web
```

Mình sẽ sửa ngay:

```bash
mv apps/web apps/desktop
```

Cuối cùng:

```text
ProfileDock/
├── apps/
│   └── desktop/
│       ├── src/
│       ├── src-tauri/
│       ├── package.json
│       └── vite.config.ts
│
├── crates/
├── packages/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

Đây là việc nên làm **trước khi code tiếp**.

---

# 0.2 — Thiết lập boundary FE / Rust

Đừng để React trực tiếp biết quá nhiều implementation của Rust.

Luồng chuẩn:

```text
React Feature
      │
      ▼
TS API wrapper
      │
      ▼
Tauri invoke()
      │
      ▼
Tauri Command
      │
      ▼
Application Service
      │
      ▼
Repository / Process / OS
```

Ví dụ FE:

```text
apps/desktop/src/
├── app/
├── features/
├── lib/
│   └── tauri/
│       ├── client.ts
│       ├── system.ts
│       ├── profiles.ts
│       └── browser.ts
└── shared/
```

Không nên rải:

```ts
invoke(...)
```

khắp các React component.

Thay vào đó:

```ts
// lib/tauri/system.ts

import { invoke } from '@tauri-apps/api/core';

export function getSystemInfo() {
	return invoke<SystemInfo>('get_system_info');
}
```

Component chỉ gọi:

```ts
getSystemInfo();
```

---

# 0.3 — Tổ chức Rust backend

Không nhét logic vào:

```text
main.rs
```

Mình recommend:

```text
apps/desktop/src-tauri/src/
├── main.rs
├── lib.rs
│
├── commands/
│   ├── mod.rs
│   └── system.rs
│
├── application/
│   ├── mod.rs
│   └── services/
│
├── infrastructure/
│   ├── mod.rs
│   ├── database/
│   ├── filesystem/
│   └── process/
│
├── state/
│   └── mod.rs
│
├── error/
│   └── mod.rs
│
└── domain/
    └── mod.rs
```

Architecture:

```text
commands
   │
   ▼
application
   │
   ▼
domain
   ▲
   │
infrastructure
```

Tauri chỉ là delivery layer.

---

# 0.4 — Tạo `AppState`

Đây là core rất quan trọng.

Tauri nên giữ một state chung:

```rust
pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,
    pub process_manager: ProcessManager,
}
```

Sau này có thể mở rộng:

```rust
pub struct AppState {
    pub db: Database,
    pub paths: AppPaths,

    pub process_manager: ProcessManager,

    pub profile_service: ProfileService,
    pub proxy_service: ProxyService,
    pub browser_service: BrowserService,
}
```

React không giữ state authoritative cho những thứ như:

```text
browser process
profile filesystem
database
proxy assignment
```

Rust mới là source of truth.

---

# 0.5 — Chuẩn hóa App Data Directory

Đây là task mình đánh giá **bắt buộc phải làm ngay Phase 0**.

Không lưu runtime data bên cạnh source code.

Ví dụ Windows:

```text
%LOCALAPPDATA%\ProfileDock\
```

Structure:

```text
ProfileDock/
├── profiledock.db
│
├── logs/
│   ├── app.log
│   └── browser.log
│
├── profiles/
│
├── browsers/
│
├── cache/
│
└── temp/
```

Trong Rust tạo abstraction:

```text
AppPaths
├── root
├── database
├── logs
├── profiles
├── browsers
├── cache
└── temp
```

Sau này tuyệt đối tránh kiểu:

```rust
"C:\\Users\\abc\\..."
```

hoặc:

```rust
"./profiles"
```

hardcode khắp project.

---

# 0.6 — SQLite + migration

ProfileDock là desktop app nên mình chọn:

```text
SQLite
```

cho local state.

Phase 0 chỉ cần schema cơ sở.

Ví dụ migration đầu:

```sql
CREATE TABLE app_metadata (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

Sau này mới thêm:

```text
profiles
proxies
profile_proxy_assignments
browser_installations
browser_instances
settings
activity_logs
```

Đừng tạo toàn bộ schema Profile ngay Phase 0.

### Rust stack

Có thể dùng:

```text
sqlx + SQLite
```

Mình ưu tiên `sqlx` cho project này.

Structure:

```text
infrastructure/database/
├── mod.rs
├── connection.rs
├── migration.rs
└── repositories/
```

---

# 0.7 — Error model thống nhất

Nếu bỏ qua task này, sau vài phase FE sẽ đầy:

```text
Unknown IPC error
Command failed
Something went wrong
```

Nên định nghĩa từ đầu:

```rust
pub enum AppError {
    Database(...),
    Io(...),
    BrowserNotFound,
    ProcessLaunchFailed(...),
    InvalidConfiguration(...),
}
```

Response về FE nên có shape ổn định:

```json
{
	"code": "BROWSER_NOT_FOUND",
	"message": "CloakBrowser executable was not found",
	"details": null
}
```

TS:

```ts
export interface AppError {
	code: string;
	message: string;
	details?: unknown;
}
```

---

# 0.8 — Logging

Setup logging ngay Phase 0.

Ví dụ:

```text
INFO
WARN
ERROR
DEBUG
```

Rust side:

```text
tracing
tracing-subscriber
```

Log format:

```text
2026-09-03T15:30:12 INFO  app started
2026-09-03T15:30:12 INFO  database initialized
2026-09-03T15:30:12 INFO  data_dir=C:\...\ProfileDock
2026-09-03T15:30:13 INFO  browser installation detected
```

Production có thể ghi:

```text
%LOCALAPPDATA%\ProfileDock\logs\profiledock.log
```

Điểm này sau này cực kỳ hữu ích khi debug browser launch.

---

# 0.9 — Process Manager abstraction

Mặc dù chưa launch profile ở Phase 0, hãy tạo abstraction trước.

```text
ProcessManager
```

Responsibility:

```text
spawn()
kill()
is_running()
get_pid()
list_managed()
```

Model:

```rust
pub struct ManagedProcess {
    pub id: String,
    pub pid: u32,
    pub process_type: ProcessType,
}
```

Sau này:

```text
ProcessType
├── Browser
├── Worker
└── Sidecar
```

Quan trọng là **không để feature profile tự gọi `std::process::Command` lung tung**.

Tất cả:

```text
browser launch
browser stop
worker launch
```

đều đi qua:

```text
ProcessManager
```

---

# 0.10 — Browser provider abstraction

Đây là một trong những quyết định kiến trúc quan trọng nhất.

Không nên viết application thành:

```text
ProfileDock = CloakBrowser
```

Nên:

```text
ProfileDock
      │
      ▼
BrowserProvider
      │
      ├── CloakProvider
      │
      └── future provider
```

Interface concept:

```rust
trait BrowserProvider {
    fn detect(&self) -> ...;
    fn version(&self) -> ...;
    fn launch(&self, ...) -> ...;
    fn terminate(&self, ...) -> ...;
}
```

Phase 0 chỉ implement:

```text
detect
version
```

Chưa cần profile launch.

Như vậy sau này ProfileDock không bị lock toàn bộ architecture vào CloakBrowser.

---

# 0.11 — Detect CloakBrowser

Ở Phase 0 chỉ cần verify binary.

Ví dụ settings:

```text
Browser
────────────────────────────

Provider
CloakBrowser

Executable
C:\...\cloak.exe

Status
● Detected

Version
xxx

[ Change executable ]
```

Flow:

```text
App start
   │
   ▼
BrowserProvider.detect()
   │
   ├── found
   │      ↓
   │    validate
   │      ↓
   │    save path
   │
   └── not found
          ↓
       UI setup
```

Không cần launch profile ở đây.

---

# 0.12 — Tauri commands đầu tiên

Phase 0 mình chỉ cần khoảng 4–6 commands.

Ví dụ:

```text
get_app_info
get_system_info
get_app_paths
get_browser_status
set_browser_executable
health_check
```

Ví dụ:

```rust
#[tauri::command]
async fn health_check() -> Result<HealthCheck, AppError> {
    // ...
}
```

FE gọi:

```ts
await invoke('health_check');
```

và nhận:

```json
{
	"database": "ok",
	"filesystem": "ok",
	"browser": "detected"
}
```

---

# 0.13 — UI Phase 0

Đừng làm Dashboard phức tạp.

Chỉ cần shell:

```text
┌───────────────────────────────────────────────────────┐
│ ProfileDock                                      ─ □ ×│
├──────────────┬────────────────────────────────────────┤
│              │                                        │
│ Dashboard    │         ProfileDock                    │
│ Profiles     │                                        │
│ Proxies      │         System Ready                   │
│ Browsers     │                                        │
│              │   Database       ● Ready               │
│              │   Storage        ● Ready               │
│              │   CloakBrowser   ● Detected            │
│              │                                        │
│ Settings     │                                        │
└──────────────┴────────────────────────────────────────┘
```

Routes có thể tạo sẵn:

```text
/
├── dashboard
├── profiles
├── proxies
├── browsers
└── settings
```

Nhưng:

```text
Profiles → placeholder
Proxies  → placeholder
```

Phase sau mới implement.

---

# 0.14 — FE architecture

Với stack React + React Query mà bạn đang hướng tới:

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── layout/
│
├── features/
│   ├── dashboard/
│   ├── profiles/
│   ├── proxies/
│   ├── browsers/
│   └── settings/
│
├── components/
│
├── lib/
│   ├── tauri/
│   └── query/
│
└── types/
```

React Query vẫn rất hợp với Tauri:

```text
React Query
     │
     ▼
queryFn
     │
     ▼
Tauri IPC wrapper
     │
     ▼
Rust command
```

Không nhất thiết query phải HTTP.

---

# 0.15 — Config

Tạo config model ngay.

Ví dụ:

```rust
pub struct AppConfig {
    pub browser_executable: Option<PathBuf>,
    pub log_level: LogLevel,
    pub launch_on_startup: bool,
}
```

Nhưng phân biệt:

```text
Config
     → user setting

Database
     → application/domain data
```

Không nhét toàn bộ mọi thứ vào `settings.json`.

---

# 0.16 — Security boundary

Đặc biệt vì app của bạn sẽ chạy executable bên ngoài.

Ngay Phase 0 cần rule:

```text
Frontend
   ❌ không được truyền arbitrary executable path + arguments

Frontend
   ↓ typed command
Rust
   ↓ validate
BrowserProvider
   ↓ predefined arguments
ProcessManager
```

Không làm command kiểu:

```rust
run_command(command: String)
```

vì về bản chất bạn đang tạo một shell executor cho frontend.

Thay bằng:

```text
launch_browser(profile_id)
stop_browser(instance_id)
```

sau này.

---

# 0.17 — Git / CI

Phase 0 cũng nên hoàn thiện CI tối thiểu:

```text
PR / push
   │
   ├── pnpm lint
   ├── pnpm typecheck
   ├── pnpm test
   │
   ├── cargo fmt --check
   ├── cargo clippy
   └── cargo test
```

Và release:

```text
tag v0.1.0
     │
     ▼
windows-latest
     │
     ▼
tauri build
     │
     ├── ProfileDock.exe
     └── ProfileDock_x64-setup.exe
```

Bạn đang code bằng WSL nên CI Windows càng hữu ích.

---

# Thứ tự task mình khuyên agent thực hiện

Nếu giao cho coding agent, mình sẽ chia chính xác như sau:

```text
P0-01  Rename apps/web → apps/desktop

P0-02  Establish frontend folder architecture

P0-03  Establish Rust application/domain/infrastructure architecture

P0-04  Implement AppState

P0-05  Implement AppPaths
       + create app directories

P0-06  Setup SQLite
       + connection
       + migration runner

P0-07  Setup unified AppError

P0-08  Setup tracing/logging

P0-09  Create typed Tauri IPC layer

P0-10  Implement health_check

P0-11  Implement ProcessManager abstraction

P0-12  Implement BrowserProvider abstraction

P0-13  Implement CloakBrowser detection
       + executable validation
       + version detection

P0-14  Build application shell
       + sidebar
       + routes

P0-15  Build Settings > Browser

P0-16  Build Dashboard health/status

P0-17  Add lint/typecheck/test

P0-18  Setup Windows CI build

P0-19  Verify production installer

P0-20  Write architecture README
```

---

# Acceptance criteria của Phase 0

Mình sẽ **không cho sang Phase 1** cho tới khi toàn bộ những cái này pass:

```text
[✓] pnpm install clean

[✓] pnpm desktop:dev

[✓] cargo check

[✓] cargo clippy

[✓] React ↔ Rust invoke hoạt động

[✓] SQLite tự tạo khi first launch

[✓] migrations tự chạy

[✓] app data dir được tạo đúng

[✓] logs được persist

[✓] browser executable có thể detect

[✓] browser version có thể đọc

[✓] invalid browser path trả typed error

[✓] app restart vẫn giữ configuration

[✓] ProcessManager có unit test

[✓] BrowserProvider không phụ thuộc UI

[✓] Windows CI build pass

[✓] tạo được ProfileDock_x64-setup.exe

[✓] cài vào Windows sạch và mở app thành công
```

## Sau đó mới vào Phase 1

Phase 1 hợp lý sẽ là **Profile Core**:

```text
PHASE 0
Foundation
     │
     ▼
PHASE 1
Profile Core
     │
     ├── Profile CRUD
     ├── profile directory
     ├── browser data isolation
     ├── profile state
     ├── profile launch/stop
     └── instance lifecycle
     │
     ▼
PHASE 2
Proxy Management
     │
     ▼
PHASE 3
Browser Integration
     │
     ▼
PHASE 4
Operational workflows
```

Nếu làm đúng Phase 0 này thì từ Phase 1 trở đi, `Profile`, `Proxy`, `Browser` chỉ là các module cắm vào foundation đã có, thay vì càng code càng phải refactor `src-tauri`.
