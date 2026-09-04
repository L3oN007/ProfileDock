Phase 3 của bạn đã đủ tốt để chuyển tiếp, nhưng trước khi code Phase 4 mình sẽ cho agent làm một bước **P3.6 — Real CloakBrowser Bootstrap** để ProfileDock chạy được với CloakBrowser thật trên Windows, thay vì chỉ có abstraction/config.

Một điểm rất quan trọng: vì ProfileDock target Windows, hãy cài/test CloakBrowser bằng **PowerShell Windows**, không dùng WSL. CloakBrowser hỗ trợ Windows x64; wrapper chính thức có CLI `install`, `info`, `update`, và binary được cache dưới `~/.cloakbrowser/`. ([GitHub][1])

# P3.6 — Setup CloakBrowser thật

Trên Windows PowerShell:

```powershell
cd D:\Modobom\ProfileDock

pnpm --filter @profiledock/desktop add -D cloakbrowser playwright-core
```

Sau đó:

```powershell
pnpm --filter @profiledock/desktop exec cloakbrowser install
```

Kiểm tra:

```powershell
pnpm --filter @profiledock/desktop exec cloakbrowser info
```

Official package sẽ tải Chromium binary riêng của CloakBrowser; tài liệu hiện tại nói binary khoảng 200 MB và được cache trong thư mục `.cloakbrowser` của user. ([GitHub][1])

Bạn có thể kiểm tra:

```powershell
Get-ChildItem "$env:USERPROFILE\.cloakbrowser" -Recurse -Filter chrome.exe
```

Ví dụ có thể ra:

```text
C:\Users\admin\.cloakbrowser\
└── chromium-146.x.x.x\
    ├── chrome.exe
    ├── chrome.dll
    ├── locales\
    ├── resources.pak
    └── ...
```

ProfileDock Settings → CloakBrowser lúc đó có thể point vào:

```text
C:\Users\admin\.cloakbrowser\chromium-...\chrome.exe
```

**Không copy riêng mỗi `chrome.exe`**. Chromium cần các DLL/resources nằm cùng installation directory.

Official releases cũng publish Windows x64 archive cùng SHA-256 checksums; repo còn mô tả signed release tags và GitHub attestation. Đây là cơ sở tốt để Phase 4 làm native installer/update manager mà không phụ thuộc Node trên máy end-user. ([GitHub][2])

---

# Quan trọng: npm package chỉ nên dùng cho DEVELOPMENT

Kiến trúc production của ProfileDock không nên trở thành:

```text
ProfileDock.exe
      │
      ▼
Node.js
      │
      ▼
cloakbrowser npm
      │
      ▼
Chromium
```

Bạn đã chọn Tauri + Rust, nên production nên là:

```text
ProfileDock.exe
      │
      ▼
CloakRuntimeManager
      │
      ▼
CloakBrowser installation
      │
      ▼
chrome.exe
```

`cloakbrowser` npm CLI chỉ nên giúp developer tải/test binary ban đầu.

Production user không nên phải:

```text
install Node.js
install pnpm
npm install cloakbrowser
```

---

# Phase 4 — Cloak Runtime Distribution & Reliability

Mình đề xuất Phase 4 tập trung vào:

> **ProfileDock tự cài, quản lý version, validate, update, rollback và vận hành CloakBrowser một cách production-ready.**

Sau Phase 4:

```text
Fresh Windows Machine
        │
        ▼
Install ProfileDock.exe
        │
        ▼
Open ProfileDock
        │
        ▼
CloakBrowser chưa có
        │
        ▼
[ Install CloakBrowser ]
        │
        ▼
Download official binary
        │
        ▼
SHA-256 verification
        │
        ▼
Atomic extract
        │
        ▼
Validate installation
        │
        ▼
Ready
        │
        ▼
Create Profile
        │
        ▼
Launch
```

Đây là phase rất quan trọng trước khi nghĩ tới workflow cao hơn.

---

# P4-01 — Tạo `CloakRuntimeManager`

Không để `CloakInstallationService` phình quá lớn.

Tạo:

```text
src-tauri/src/
├── application/
│   └── services/
│       ├── cloak_installation_service.rs
│       └── cloak_runtime_manager.rs
│
└── infrastructure/
    └── cloak/
        ├── downloader.rs
        ├── extractor.rs
        ├── checksum.rs
        └── release_manifest.rs
```

Responsibility:

```rust
CloakRuntimeManager

detect()
list_installed()
install()
activate()
validate()
update()
rollback()
remove_version()
```

Không cho React tự download ZIP hoặc tự extract.

---

# P4-02 — App-owned runtime directory

Mình không recommend production phụ thuộc trực tiếp:

```text
C:\Users\...\ .cloakbrowser
```

Đó là cache của tool bên ngoài.

ProfileDock nên có runtime riêng:

```text
%LOCALAPPDATA%\ProfileDock\
├── profiledock.db
├── logs\
├── profiles\
│
└── runtimes\
    └── cloak\
        ├── 146.0.x.x\
        │   ├── chrome.exe
        │   ├── chrome.dll
        │   ├── locales\
        │   └── ...
        │
        └── 150.0.x.x\
            └── ...
```

Rồi giữ:

```text
active runtime
      ↓
146.0.x.x
```

Development có thể fallback tới:

```text
%USERPROFILE%\.cloakbrowser
```

nhưng production ưu tiên:

```text
ProfileDock/runtimes/cloak/
```

---

# P4-03 — `CloakRuntime` domain model

```rust
pub struct CloakRuntime {
    pub id: String,

    pub version: String,

    pub platform: String,
    pub arch: String,

    pub root_dir: PathBuf,
    pub executable: PathBuf,

    pub sha256: String,

    pub source: CloakRuntimeSource,

    pub active: bool,

    pub installed_at: DateTime<Utc>,
    pub validated_at: Option<DateTime<Utc>>,
}
```

Source:

```rust
pub enum CloakRuntimeSource {
    ProfileDockManaged,
    External,
}
```

`External` dành cho trường hợp user chọn executable thủ công.

---

# P4-04 — Database

Migration `005_phase4_cloak_runtime.sql`:

```sql
CREATE TABLE cloak_runtimes (
    id TEXT PRIMARY KEY,

    version TEXT NOT NULL,

    platform TEXT NOT NULL,
    arch TEXT NOT NULL,

    root_dir TEXT NOT NULL,
    executable_path TEXT NOT NULL,

    sha256 TEXT,

    source TEXT NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 0,

    installed_at TEXT NOT NULL,
    validated_at TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_cloak_runtime_version
ON cloak_runtimes(version, platform, arch);
```

Enforce application-side:

```text
maximum 1 active runtime
```

---

# P4-05 — Release manifest

**Không cho frontend gửi arbitrary download URL xuống Rust.**

Sai:

```rust
cloak_install(url: String)
```

Đúng:

```rust
cloak_install(version: String)
```

Backend tự resolve:

```text
supported version
      ↓
known official asset
      ↓
known checksum
```

Concept:

```rust
pub struct CloakRelease {
    pub version: String,
    pub asset_url: String,
    pub sha256: String,
    pub platform: Platform,
    pub arch: Architecture,
}
```

Phase 4 đầu tiên mình còn khuyên **pin một version đã test**, thay vì chạy theo `latest`.

Ví dụ:

```text
ProfileDock 0.1.x
      ↓
Supported Cloak Runtime
      ↓
version X
```

Sau này mới có update channel.

---

# P4-06 — SHA-256 bắt buộc

Flow:

```text
Download
   ↓
cloak.zip.part
   ↓
SHA256
   ↓
expected == actual?
   │
   ├── NO
   │    ↓
   │  delete
   │
   └── YES
        ↓
      extract
```

Error:

```text
CLOAK_CHECKSUM_MISMATCH
```

Không:

```text
checksum mismatch
     ↓
warning
     ↓
continue anyway
```

Checksum mismatch phải block.

Official CloakBrowser releases hiện cung cấp SHA-256 cho platform assets và mô tả release verification mechanisms. ([GitHub][2])

---

# P4-07 — Atomic installation

Không extract trực tiếp:

```text
runtimes/cloak/146/
```

Làm:

```text
runtimes/cloak/
├── .installing-UUID/
└── 146/
```

Flow:

```text
download
   ↓
checksum
   ↓
extract → .installing-UUID
   ↓
validate chrome.exe
   ↓
rename atomically
   ↓
146/
```

Nếu ProfileDock crash giữa chừng:

```text
.installing-...
```

được cleanup lần startup sau.

---

# P4-08 — Safe ZIP extraction

Agent phải chống path traversal.

Archive có entry kiểu:

```text
../../ProfileDock.exe
```

không bao giờ được extract ra ngoài target directory.

Rule:

```text
canonical extracted path
        ↓
must start with runtime temp path
```

Đây nên có unit test riêng.

---

# P4-09 — Installation validation

Sau extract:

```text
CloakRuntime
   │
   ├── executable exists
   ├── required files exist
   ├── version readable
   ├── process can start
   └── startup smoke test
```

Không đánh dấu:

```text
READY
```

chỉ vì:

```text
chrome.exe exists
```

---

# P4-10 — Native installer không phụ thuộc Node

Sau khi Phase 4 hoàn thành, installer user chỉ cần:

```text
ProfileDock_x64-setup.exe
```

Không cần:

```text
Node
npm
pnpm
Rust
cargo
```

Luồng production:

```text
ProfileDock.exe
       │
       ▼
Rust reqwest
       │
       ▼
Official Cloak release
       │
       ▼
ZIP
       │
       ▼
checksum
       │
       ▼
extract
```

---

# P4-11 — Download progress

Tauri event:

```text
cloak://install-progress
```

Payload:

```json
{
	"phase": "downloading",
	"downloadedBytes": 52428800,
	"totalBytes": 209715200,
	"percent": 25
}
```

States:

```text
resolving
downloading
verifying
extracting
validating
completed
failed
```

Frontend chỉ render state.

---

# P4-12 — Settings UI

Settings → CloakBrowser nên đổi thành:

```text
CloakBrowser
──────────────────────────────────────

Status
● Ready

Version
146.x.x

Location
C:\Users\...\ProfileDock\runtimes\cloak\146...

Installation
Managed by ProfileDock

[ Check for update ]

──────────────────────────────────────

Installed Versions

● 146.x.x       Active
  145.x.x

                    [ Activate ]
                    [ Remove ]
```

Nếu chưa có:

```text
CloakBrowser

Not installed

ProfileDock requires CloakBrowser
to launch profiles.

[ Install CloakBrowser ]
```

---

# P4-13 — Update không được chạy tự động mỗi launch

Không làm:

```text
Open ProfileDock
     ↓
download newest Cloak
```

vì có thể:

```text
new Cloak version
       ↓
regression
       ↓
tất cả profiles lỗi
```

Nên:

```text
check update
       ↓
show update available
       ↓
user installs
       ↓
keep previous runtime
```

Official wrapper hiện cũng hỗ trợ version pinning/rollback, nên giữ tư duy versioned runtime trong ProfileDock là hợp lý. ([GitHub][2])

---

# P4-14 — Rollback

Đây là lý do không overwrite runtime cũ.

```text
146
│
├── active
│
150
```

Update:

```text
146
│
├── previous
│
150
    └── active
```

Nếu lỗi:

```text
Activate 146
```

không cần download lại.

---

# P4-15 — Không switch runtime khi profile đang chạy

Rule global:

```text
Any Cloak instance running?
        │
        ├── YES
        │    ↓
        │ CLOAK_RUNTIME_IN_USE
        │
        └── NO
             ↓
         activate version
```

Không cho:

```text
Profile A running with v146

          ↓

change active runtime → v150
```

giữa session.

---

# P4-16 — Runtime snapshot

Phase 3 đã có:

```text
browser_instances.config_snapshot_json
```

Phase 4 thêm:

```json
{
	"configVersion": 1,
	"cloakRuntimeId": "019...",
	"cloakVersion": "146.x.x",
	"proxyId": "019...",
	"startupUrlCount": 1
}
```

Nhờ đó history biết chính xác instance từng chạy version nào.

---

# P4-17 — Session model

Phase 1 có `browser_instances`.

Phase 4 nên xem mỗi instance như một session runtime.

Bổ sung nếu chưa có:

```text
launch_reason
ended_reason
runtime_version
duration
```

Ví dụ:

```text
ended_reason

user_stop
browser_closed
crash
app_shutdown
unknown
```

---

# P4-18 — Graceful application shutdown

Nếu user đóng ProfileDock khi Cloak đang chạy:

```text
Close ProfileDock
       │
       ▼
Active sessions?
       │
       ▼
Dialog

CloakBrowser is still running.

○ Keep browser running
● Close browser and exit

[ Cancel ] [ Exit ]
```

Không kill browser silently.

---

# P4-19 — Crash recovery

Nếu ProfileDock crash:

```text
ProfileDock
     X

Cloak PID 1234
     │
     └── still alive
```

Restart:

```text
startup
   ↓
reconcile
   ↓
PID alive?
   │
   ├── yes → reconnect runtime state
   └── no  → mark ended
```

Phase 1 đã có reconciliation; Phase 4 harden nó cho Cloak runtime version.

---

# P4-20 — Runtime health

Dashboard thêm:

```text
System

Profile Database     ● Ready
CloakBrowser          ● Ready
Cloak Version         146.x
Running Sessions      2
Storage               1.8 GB
```

Không cần dashboard quá phức tạp.

---

# P4-21 — Storage management

Cloak/Chromium profile data sẽ lớn dần.

Thêm:

```text
Profile Storage

Browser Data     542 MB
Cache            318 MB
Downloads        124 MB

[ Clear Cache ]
```

`Clear Cache` chỉ chạy khi profile stopped.

Không tự xóa:

```text
cookies
local storage
IndexedDB
session storage
```

vì đó là persistent profile data.

---

# P4-22 — Error taxonomy

Thêm:

```text
CLOAK_RUNTIME_NOT_INSTALLED

CLOAK_RUNTIME_NOT_FOUND
CLOAK_RUNTIME_IN_USE

CLOAK_DOWNLOAD_FAILED
CLOAK_DOWNLOAD_TIMEOUT

CLOAK_CHECKSUM_MISMATCH

CLOAK_ARCHIVE_INVALID
CLOAK_EXTRACTION_FAILED

CLOAK_RUNTIME_INVALID
CLOAK_RUNTIME_VERSION_UNSUPPORTED

CLOAK_RUNTIME_ACTIVATION_FAILED
CLOAK_RUNTIME_REMOVE_FAILED
```

Frontend không nhận raw reqwest/zip/io error.

---

# P4-23 — Commands

Command contract:

```text
cloak_runtime_status

cloak_runtime_list

cloak_runtime_install
cloak_runtime_cancel_install

cloak_runtime_validate

cloak_runtime_activate

cloak_runtime_remove

cloak_runtime_check_update

cloak_runtime_get_install_progress
```

Không có:

```text
download_url
executable_args
shell_command
```

trong command input.

---

# P4-24 — Windows E2E

Phase 3 còn thiếu E2E, Phase 4 **bắt buộc đóng task này**.

Test trên Windows native:

```text
Clean machine
    ↓
Install ProfileDock
    ↓
No Cloak installed
    ↓
Install Cloak
    ↓
Validate
    ↓
Create Profile A
    ↓
Launch
    ↓
Close
    ↓
Launch again
    ↓
Browser data retained
    ↓
Assign proxy
    ↓
Launch
    ↓
Stop
    ↓
Restart ProfileDock
    ↓
Everything restored
```

---

# Task board cho agent

Đưa nguyên block này cho agent:

```text
PHASE 4 — CLOAK RUNTIME DISTRIBUTION & RELIABILITY

Context:
- Phase 0 Foundation is complete.
- Phase 1 Profile Core is complete.
- Phase 2 Proxy Core is complete.
- Phase 3 CloakBrowser Configuration is complete.
- ProfileDock supports ONLY CloakBrowser.
- Do NOT introduce BrowserProvider, browser selection, Chrome,
  Firefox, AdsPower, GoLogin, etc.
- Existing launch pipeline:
  CloakPreflight
    -> CloakConfigResolver
    -> CloakLaunchBuilder
    -> ProcessManager.

Primary goal:
Make CloakBrowser a production-managed runtime that ProfileDock
can install, validate, version, activate, update and roll back
without requiring Node.js on the end user's machine.

Before implementation:
1. Inspect existing Phase 0-3 architecture.
2. Reuse AppPaths, AppState, SecretStore, ProcessManager,
   BrowserInstance, AppError and existing Cloak services.
3. Do not duplicate existing services.
4. Preserve current Tauri command conventions.
5. Preserve frontend React Query architecture.
6. Do not introduce arbitrary shell execution or arbitrary
   download URLs.

Implementation order:

P4-01 Create CloakRuntime domain model.

P4-02 Add migration 005 for cloak_runtimes.

P4-03 Implement CloakRuntimeRepository.

P4-04 Extend AppPaths with:
      runtimes/cloak
      runtime temp
      runtime download cache.

P4-05 Implement official Cloak release manifest abstraction.

P4-06 Implement CloakRuntimeDownloader.

P4-07 Implement streaming download progress.

P4-08 Implement SHA-256 verification.

P4-09 Implement safe ZIP extraction with traversal protection.

P4-10 Implement atomic runtime installation.

P4-11 Implement incomplete-install cleanup on application startup.

P4-12 Implement CloakRuntimeManager.

P4-13 Implement list installed runtimes.

P4-14 Implement active runtime selection.

P4-15 Prevent activation/removal while any dependent instance
      is running.

P4-16 Integrate active runtime into CloakInstallationService.

P4-17 Integrate runtime ID/version into CloakConfigResolver.

P4-18 Store runtime information in browser instance config snapshot.

P4-19 Implement update availability checking.

P4-20 Implement side-by-side runtime installation.

P4-21 Implement manual rollback/activation.

P4-22 Implement runtime removal while preserving active/in-use
      protections.

P4-23 Extend browser session ended_reason handling.

P4-24 Harden startup process reconciliation.

P4-25 Implement application shutdown handling when browser
      sessions are still active.

P4-26 Add per-profile storage size calculation.

P4-27 Implement safe cache cleanup for stopped profiles.

P4-28 Add typed Phase 4 errors.

P4-29 Add typed Tauri runtime commands.

P4-30 Create frontend cloakRuntimeApi.

P4-31 Create React Query queries/mutations.

P4-32 Upgrade Settings > CloakBrowser UI.

P4-33 Add installation progress UI.

P4-34 Add installed-version management UI.

P4-35 Add update/rollback UI.

P4-36 Add runtime information to profile session/history UI.

P4-37 Add runtime status to Dashboard.

P4-38 Add Rust unit tests.

P4-39 Add integration tests.

P4-40 Perform Windows clean-machine E2E.

Security / reliability constraints:
- Never allow frontend supplied arbitrary executable arguments.
- Never allow frontend supplied arbitrary download URLs.
- Validate all runtime archive paths before extraction.
- Verify SHA-256 before installation.
- Never mark a partially extracted runtime as installed.
- Do not overwrite old runtimes during update.
- Do not auto-update during application startup.
- Do not remove or switch a runtime being used by a running
  browser instance.
- Never log proxy credentials, secrets or license keys.
- Runtime downloading/extraction must be cancellable and
  recover safely from application crashes.
```

# Definition of Done Phase 4

Đừng cho agent báo Phase 4 complete chỉ vì UI đã có nút Install. Luồng này phải chạy thật:

```text
ProfileDock installed
       │
       ▼
Cloak missing
       │
       ▼
Install
       │
       ├── download progress
       ├── checksum
       ├── safe extract
       └── validation
       │
       ▼
Cloak Ready
       │
       ▼
Profile A → Launch
       │
       ▼
Runtime version persisted
       │
       ▼
Close → Launch again
       │
       ▼
Profile persisted
       │
       ▼
Install newer Cloak
       │
       ▼
old + new coexist
       │
       ▼
activate new
       │
       ▼
launch test
       │
       ▼
rollback old
```

Acceptance cuối cùng:

```text
[✓] User không cần Node/npm/pnpm

[✓] CloakBrowser cài được từ ProfileDock

[✓] Download có progress

[✓] SHA-256 được verify

[✓] Corrupted binary bị reject

[✓] ZIP traversal bị reject

[✓] Interrupted installation không phá runtime cũ

[✓] Có một active runtime duy nhất

[✓] Có thể giữ nhiều version song song

[✓] Update không overwrite version cũ

[✓] Rollback hoạt động

[✓] Không switch runtime khi browser đang chạy

[✓] Config snapshot ghi đúng Cloak runtime/version

[✓] Profile vẫn giữ browser data sau update

[✓] Startup reconciliation hoạt động

[✓] Shutdown handling hoạt động

[✓] Cache cleanup không xóa persistent session data

[✓] cargo test pass

[✓] pnpm check-types pass

[✓] Windows clean-install E2E pass

[✓] ProfileDock_x64-setup.exe chạy trên máy Windows sạch
```

Sau Phase 4, mình sẽ **không nhảy ngay vào automation**. Phase 5 hợp lý hơn là **Profile Operations & Management UX**: search/filter nâng cao, tags/groups, profile notes, session history, storage controls, import/export cấu hình không nhạy cảm và UX quản lý số lượng profile lớn. Như vậy core ProfileDock sẽ production-ready trước khi thêm workflow ở tầng cao hơn.

[1]: https://github.com/CloakHQ/CloakBrowser/blob/main/js/README.md 'CloakBrowser/js/README.md at main · CloakHQ/CloakBrowser · GitHub'
[2]: https://github.com/CloakHQ/cloakbrowser/releases?utm_source=chatgpt.com 'Releases · CloakHQ/CloakBrowser · GitHub'
