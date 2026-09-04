Phase 2 nên tập trung vào **Proxy Core + Profile ↔ Proxy Assignment + Proxy Health/Connectivity**, nhưng vẫn giữ Proxy như một module độc lập với browser. Mục tiêu là sau phase này, mỗi profile có thể gán một proxy cố định, kiểm tra proxy trước khi launch, và BrowserProvider chỉ nhận một cấu hình proxy đã được validate.

> Với ProfileDock, mình sẽ không đưa proxy rotation, đổi identity tự động hoặc logic né cơ chế phát hiện nền tảng vào Phase 2. Phase này chỉ xây network configuration ổn định cho profile.

# Phase 2 — Proxy Core

Kiến trúc cuối Phase 2 nên thành:

```text
React
  │
  ▼
Tauri Commands
  │
  ▼
ProxyService
  │
  ├──────────────┬─────────────────┐
  ▼              ▼                 ▼
ProxyRepo    ProxyChecker     SecretStore
  │              │
SQLite         Network
  │
  ▼
ProfileProxyAssignment
  │
  ▼
BrowserService
  │
  ▼
BrowserProvider
  │
  ▼
ProcessManager
```

Và relationship:

```text
Profile
   │
   │ 0..1
   ▼
Proxy Assignment
   │
   ▼
Proxy
```

Một proxy có thể được nhiều profile sử dụng nếu bạn cho phép:

```text
Proxy A
├── Profile 01
├── Profile 02
└── Profile 03
```

nhưng **một profile tại một thời điểm chỉ có tối đa một proxy active**.

---

## P2-01 — Proxy domain model

Rust:

```text
src-tauri/src/domain/proxy/
├── mod.rs
├── entity.rs
├── protocol.rs
├── status.rs
└── repository.rs
```

Model:

```rust
pub struct Proxy {
    pub id: String,

    pub name: String,

    pub protocol: ProxyProtocol,

    pub host: String,
    pub port: u16,

    pub username_ref: Option<String>,
    pub password_ref: Option<String>,

    pub status: ProxyStatus,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

Protocol ban đầu:

```rust
pub enum ProxyProtocol {
    Http,
    Https,
    Socks5,
}
```

Không cần hỗ trợ mọi loại proxy ngay.

Phase 2 MVP:

```text
HTTP
HTTPS
SOCKS5
```

là đủ.

---

# P2-02 — Không lưu password trực tiếp trong SQLite

Đây là design mình khuyên chốt ngay.

Không làm:

```sql
username TEXT,
password TEXT
```

trong database.

Thay vào đó:

```text
SQLite
  ↓
credential reference

OS Secret Store
  ↓
actual username/password
```

Ví dụ DB:

```text
proxy.username_ref
proxy.password_ref
```

Secret store abstraction:

```rust
pub trait SecretStore {
    fn set(&self, key: &str, value: &str)
        -> Result<(), AppError>;

    fn get(&self, key: &str)
        -> Result<Option<String>, AppError>;

    fn delete(&self, key: &str)
        -> Result<(), AppError>;
}
```

Windows production có thể backing bằng Windows Credential Manager / OS keyring.

Application chỉ biết:

```text
proxy/{proxy_id}/username
proxy/{proxy_id}/password
```

Không biết secret được lưu vật lý ở đâu.

---

# P2-03 — Database schema

Mình sẽ dùng 3 table:

```text
proxies
profile_proxy_assignments
proxy_checks
```

### `proxies`

```sql
CREATE TABLE proxies (
    id TEXT PRIMARY KEY,

    name TEXT NOT NULL,

    protocol TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,

    username_ref TEXT,
    password_ref TEXT,

    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_archived INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_proxies_archived
ON proxies(is_archived);

CREATE INDEX idx_proxies_enabled
ON proxies(is_enabled);
```

Không lưu `online/offline` trực tiếp vào đây làm authoritative state.

---

### `profile_proxy_assignments`

```sql
CREATE TABLE profile_proxy_assignments (
    profile_id TEXT PRIMARY KEY,

    proxy_id TEXT NOT NULL,

    assigned_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY(proxy_id)
        REFERENCES proxies(id)
        ON DELETE RESTRICT
);
```

`profile_id` là primary key giúp enforce:

```text
1 profile → max 1 proxy
```

DB tự bảo vệ rule.

---

### `proxy_checks`

```sql
CREATE TABLE proxy_checks (
    id TEXT PRIMARY KEY,

    proxy_id TEXT NOT NULL,

    success INTEGER NOT NULL,

    latency_ms INTEGER,

    observed_ip TEXT,

    error_code TEXT,
    error_message TEXT,

    checked_at TEXT NOT NULL,

    FOREIGN KEY(proxy_id)
        REFERENCES proxies(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_proxy_checks_proxy_time
ON proxy_checks(proxy_id, checked_at DESC);
```

Không cần lưu cả triệu record.

Có thể sau này retention:

```text
keep last 50 / 100 checks per proxy
```

---

# P2-04 — Proxy credential model

Input từ FE:

```ts
type CreateProxyInput = {
	name: string;

	protocol: 'http' | 'https' | 'socks5';

	host: string;
	port: number;

	username?: string;
	password?: string;
};
```

Nhưng response **không bao giờ return password**.

Ví dụ response:

```json
{
	"id": "019...",
	"name": "Proxy Singapore 01",
	"protocol": "socks5",
	"host": "proxy.example.net",
	"port": 1080,
	"hasAuth": true
}
```

Không:

```json
{
	"password": "secret123"
}
```

Kể cả frontend vừa gửi password lên.

---

# P2-05 — Proxy validation

Có 2 tầng validation.

Tầng 1 là format:

```text
protocol valid
host valid
port 1..65535
username/password consistency
```

Tầng 2 là connectivity:

```text
Proxy configuration
      │
      ▼
TCP/connect request
      │
      ▼
HTTP request through proxy
      │
      ▼
success / failed
```

Tách hai concept:

```text
VALID
```

nghĩa là config hợp lệ.

Và:

```text
HEALTHY
```

nghĩa là proxy vừa được kiểm tra và request thành công.

Đừng nhập hai cái thành một.

---

# P2-06 — ProxyChecker abstraction

Thêm:

```text
infrastructure/network/
├── mod.rs
└── proxy_checker.rs
```

Interface:

```rust
#[async_trait]
pub trait ProxyChecker {
    async fn check(
        &self,
        proxy: &ResolvedProxy,
    ) -> Result<ProxyCheckResult, AppError>;
}
```

`ResolvedProxy`:

```rust
pub struct ResolvedProxy {
    pub protocol: ProxyProtocol,

    pub host: String,
    pub port: u16,

    pub username: Option<String>,
    pub password: Option<String>,
}
```

Model này chỉ tồn tại trong memory.

Không serialize nó về FE.

---

# P2-07 — Health result

Output:

```rust
pub struct ProxyCheckResult {
    pub success: bool,

    pub latency_ms: Option<u64>,

    pub observed_ip: Option<String>,

    pub error_code: Option<String>,
}
```

Ví dụ:

```json
{
	"success": true,
	"latencyMs": 243,
	"observedIp": "203.0.113.20"
}
```

Hoặc:

```json
{
	"success": false,
	"latencyMs": null,
	"observedIp": null,
	"errorCode": "PROXY_CONNECTION_TIMEOUT"
}
```

---

# P2-08 — Error taxonomy

Từ Phase 0 bạn đã có `AppError`.

Phase 2 mở rộng:

```text
PROXY_NOT_FOUND

PROXY_INVALID_HOST
PROXY_INVALID_PORT
PROXY_INVALID_PROTOCOL

PROXY_AUTH_FAILED
PROXY_CONNECTION_FAILED
PROXY_CONNECTION_TIMEOUT

PROXY_SECRET_NOT_FOUND

PROXY_IN_USE
PROXY_ARCHIVED

PROFILE_PROXY_NOT_ASSIGNED
```

Đừng return raw:

```text
reqwest error ...
io error ...
```

về UI.

Developer log vẫn giữ raw cause.

---

# P2-09 — ProxyRepository

Domain:

```rust
#[async_trait]
pub trait ProxyRepository {
    async fn create(
        &self,
        proxy: &Proxy,
    ) -> Result<(), AppError>;

    async fn get(
        &self,
        id: &str,
    ) -> Result<Option<Proxy>, AppError>;

    async fn list(
        &self,
    ) -> Result<Vec<Proxy>, AppError>;

    async fn update(
        &self,
        proxy: &Proxy,
    ) -> Result<(), AppError>;

    async fn archive(
        &self,
        id: &str,
    ) -> Result<(), AppError>;
}
```

Infrastructure:

```text
infrastructure/database/repositories/
└── sqlite_proxy_repository.rs
```

---

# P2-10 — ProxyService

Core service:

```text
application/services/
└── proxy_service.rs
```

Responsibility:

```text
create proxy
update proxy
archive proxy

get proxy
list proxies

check proxy
get last health

assign to profile
unassign from profile

resolve credentials
```

BrowserService không được tự query proxy credentials.

Thay vào đó:

```text
BrowserService
      │
      ▼
ProxyService.resolve_for_profile()
      │
      ▼
ResolvedProxy
```

---

# P2-11 — Create proxy flow

Flow:

```text
CreateProxyInput
      │
      ▼
validate
      │
      ▼
generate proxy UUID
      │
      ├──── store username secret
      │
      ├──── store password secret
      │
      ▼
create proxy DB record
      │
      ▼
optionally run check
      │
      ▼
ProxyDto
```

Có một case quan trọng:

```text
secret stored
    ↓
DB INSERT fails
```

phải cleanup secret.

Và ngược lại.

Nên có compensation logic.

---

# P2-12 — Update credentials

UI không cần load password cũ.

Form:

```text
Username
[ myuser ]

Password
[ ••••••••••••• ]

[ Keep existing password ]

or

[ Replace password ]
```

API nên phân biệt:

```ts
password:
  | { mode: "keep" }
  | { mode: "replace"; value: string }
  | { mode: "remove" };
```

Không dùng:

```ts
password?: string
```

vì không phân biệt được:

```text
undefined
empty
keep
remove
```

---

# P2-13 — Assign proxy to Profile

API:

```rust
assign_proxy(
    profile_id,
    proxy_id,
)
```

Flow:

```text
Profile
  │
  ├─ exists?
  ├─ archived?
  └─ running?
       │
       ▼
Proxy
  │
  ├─ exists?
  ├─ enabled?
  └─ archived?
       │
       ▼
assignment
```

Mình recommend Phase 2 rule:

```text
không đổi proxy khi browser của profile đang chạy
```

Tức:

```text
Profile Running
      +
Change Proxy
      ↓
PROFILE_RUNNING
```

UI:

```text
Stop the browser before changing its proxy.
```

Đơn giản và an toàn hơn rất nhiều.

---

# P2-14 — Unassign proxy

Cũng cùng rule:

```text
Running profile
    ↓
cannot unassign proxy
```

Sau khi stop:

```text
Profile
  ↓
Proxy: None
```

Profile vẫn launch được hay không thì nên config theo application requirement.

Mình recommend:

```text
proxy optional
```

ở Phase 2:

```text
profile.proxy = None
     ↓
normal system network
```

Không bắt buộc profile nào cũng cần proxy.

---

# P2-15 — Integrate BrowserLaunchRequest

Phase 1 có:

```rust
pub struct BrowserLaunchRequest {
    pub profile_id: String,
    pub user_data_dir: PathBuf,
    pub download_dir: PathBuf,
    pub startup_urls: Vec<String>,
}
```

Phase 2 đổi thành:

```rust
pub struct BrowserLaunchRequest {
    pub profile_id: String,

    pub user_data_dir: PathBuf,
    pub download_dir: PathBuf,

    pub startup_urls: Vec<String>,

    pub proxy: Option<ResolvedBrowserProxy>,
}
```

Ví dụ:

```rust
pub struct ResolvedBrowserProxy {
    pub protocol: ProxyProtocol,

    pub host: String,
    pub port: u16,

    pub username: Option<String>,
    pub password: Option<String>,
}
```

Nhưng password chỉ tồn tại ở backend memory.

---

# P2-16 — BrowserProvider chịu trách nhiệm translate

Đây là boundary quan trọng:

```text
ProxyService
      │
      ▼
ResolvedBrowserProxy
      │
      ▼
BrowserProvider
      │
      ▼
provider-specific config
```

Không để:

```text
ProxyService
```

biết command line của CloakBrowser.

Và cũng không để:

```text
ProfileService
```

biết browser sử dụng proxy bằng argument nào.

Architecture:

```text
Domain Proxy
      ↓
BrowserProxyConfig
      ↓
CloakBrowserProvider
      ↓
actual launch settings
```

Nếu CloakBrowser yêu cầu cơ chế khác CLI flags thì chỉ sửa provider.

---

# P2-17 — Proxy preflight trước launch

Mình recommend **không bắt buộc check remote mỗi lần launch**.

Nếu làm:

```text
Launch
  ↓
remote proxy check
  ↓
wait
  ↓
browser opens
```

UX sẽ chậm và proxy check endpoint lỗi có thể chặn browser không cần thiết.

Tốt hơn:

```text
last check < configurable threshold
          │
          ├─ yes → use cached health
          │
          └─ no  → optional preflight
```

Nhưng Phase 2 MVP có thể đơn giản:

```text
Proxy status:
Unknown
Healthy
Unhealthy
```

Nếu `Unhealthy`:

```text
Launch anyway?
```

phụ thuộc policy của app.

Đừng tự động đổi sang proxy khác.

---

# P2-18 — Derived proxy status

Không lưu:

```text
status = online
```

permanently trong `proxies`.

Derive từ latest `proxy_checks`.

Ví dụ:

```text
latest successful check <= 10 minutes
        ↓
Healthy

latest failed check
        ↓
Unhealthy

no check
        ↓
Unknown
```

Threshold sau này đặt config.

---

# P2-19 — Proxy activity events

Extend activity:

```text
proxy_created
proxy_updated
proxy_checked
proxy_archived

proxy_assigned
proxy_unassigned
```

Profile event:

```text
10:20 Proxy "SG-01" assigned
10:40 Browser launched
11:30 Browser stopped
```

Proxy history:

```text
10:20 Assigned to Profile QA 01
10:19 Connectivity check successful
```

---

# P2-20 — UI: Proxies page

Desktop layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Proxies                                   [+ Add Proxy]     │
│                                                             │
│ Search...                      Status [ All ▼ ]             │
│                                                             │
│ SG Proxy 01                                ● Healthy         │
│ SOCKS5                                                     │
│ proxy.example.com:1080                                     │
│                                                             │
│ IP       203.0.113.20                                      │
│ Latency  182ms                                             │
│ Used by  2 profiles                                        │
│                                          [ Check ] [ ⋮ ]   │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ US Proxy 02                                ○ Unknown         │
│ HTTP                                                        │
│ proxy2.example.com:8080                                    │
│                                          [ Check ] [ ⋮ ]   │
└─────────────────────────────────────────────────────────────┘
```

Không hiển thị password.

---

# P2-21 — Add Proxy dialog

```text
Add Proxy

Name
[ SG Proxy 01                     ]

Protocol
[ SOCKS5                       ▼ ]

Host
[ proxy.example.com              ]

Port
[ 1080                           ]

Authentication
[✓] Username / Password

Username
[ user123                        ]

Password
[ •••••••••••••                 ]


[Test Connection]

                    Cancel   Save
```

`Test Connection` không bắt buộc Save trước.

Backend có command riêng:

```text
proxy_test_input
```

để test transient config.

Nhưng **không persist password chỉ vì user test**.

---

# P2-22 — Proxy detail

Route:

```text
/proxies/:id
```

UI:

```text
SG Proxy 01                 ● Healthy

Connection
Protocol        SOCKS5
Host            proxy.example.com
Port            1080
Authentication  Enabled

Last Check
Status          Healthy
Observed IP     203.0.113.20
Latency         182ms
Checked         2 min ago

Assignments
QA 01
QA 04

Recent checks
14:30   Success   182ms
14:20   Success   201ms
14:10   Timeout
```

---

# P2-23 — Profile UI integration

Profile detail Phase 1:

```text
Overview
Storage
Activity
```

Phase 2 Overview thêm:

```text
Network

Proxy
SG Proxy 01

SOCKS5
proxy.example.com:1080

Status
● Healthy

[ Change Proxy ]
```

Nếu none:

```text
Proxy
No proxy assigned

[ Assign Proxy ]
```

---

# P2-24 — Create Profile integration

Create Profile dialog có thể thêm optional:

```text
Network

Proxy
[ No proxy                   ▼ ]
```

Nhưng mình vẫn khuyên:

```text
Create profile
      ↓
then assign proxy
```

cho MVP Phase 2.

Form Create Profile càng đơn giản càng tốt.

Sau này mới thêm quick assignment.

---

# P2-25 — Archive proxy

Rule:

```text
Proxy assigned to any active profile
          ↓
cannot archive
```

Error:

```text
PROXY_IN_USE
```

UI:

```text
This proxy is assigned to 3 profiles.
Unassign it before archiving.
```

Không tự động unassign silently.

---

# P2-26 — Delete strategy

Giống profiles:

```text
Archive
```

trước.

Không hard delete proxy theo default.

Khi archive:

```text
is_archived = 1
```

Secret vẫn giữ.

Permanent deletion sau này:

```text
delete DB
delete proxy checks
delete credentials
```

nhưng ngoài Phase 2 MVP.

---

# P2-27 — Batch import

Mình **không đưa batch import vào core implementation đầu tiên**.

Sau khi CRUD ổn mới thêm Phase 2.5:

```text
host:port
user:pass@host:port
protocol://user:pass@host:port
```

Batch import có nhiều edge case nên không nên block Phase 2.

---

# P2-28 — Background health checking

MVP:

```text
manual Check
```

trước.

Sau đó có thể thêm:

```text
check enabled proxies every N minutes
```

nhưng không cần ngay Phase 2 core.

Nếu làm background checker:

```text
ProxyHealthScheduler
     │
     ▼
ProxyChecker
```

không dùng React timer.

React không phải source-of-truth cho scheduling.

---

# P2-29 — Concurrency

Không được chạy nhiều health check đồng thời cho cùng proxy.

Ví dụ user spam:

```text
Check
Check
Check
Check
```

Backend:

```text
per-proxy lock
     ↓
one active check
```

Tương tự assign:

```text
profile lock
```

để tránh:

```text
Assign Proxy A
Assign Proxy B
```

race condition.

---

# P2-30 — Network timeout

Không để request treo lâu.

Ví dụ concept:

```text
connect timeout: few seconds
overall timeout: bounded
```

Các giá trị cụ thể nên config ở infrastructure.

Return typed error:

```text
PROXY_CONNECTION_TIMEOUT
```

thay vì chờ vô hạn.

---

# P2-31 — Sensitive logging

Đây là rule bắt buộc.

Không bao giờ log:

```text
proxy://user:password@host:port
```

Log dạng:

```text
proxy_id=019...
protocol=socks5
host=proxy.example.com
port=1080
auth=true
```

Nếu debug:

```text
username
```

cũng nên mask.

Ví dụ:

```text
u***3
```

Password:

```text
NEVER
```

---

# P2-32 — Tauri commands

Commands Phase 2:

```text
proxy_list
proxy_get

proxy_create
proxy_update
proxy_archive

proxy_check
proxy_test_input

proxy_assign
proxy_unassign

proxy_get_profile_assignment
proxy_list_assignments
```

Frontend vẫn không được gọi raw network/process APIs.

---

# P2-33 — TypeScript API

```ts
export const proxyApi = {
	list() {
		return invoke<Proxy[]>('proxy_list');
	},

	create(input: CreateProxyInput) {
		return invoke<Proxy>('proxy_create', {
			input,
		});
	},

	check(id: string) {
		return invoke<ProxyCheckResult>('proxy_check', { id });
	},

	assign(profileId: string, proxyId: string) {
		return invoke<void>('proxy_assign', {
			profileId,
			proxyId,
		});
	},

	unassign(profileId: string) {
		return invoke<void>('proxy_unassign', { profileId });
	},
};
```

---

# P2-34 — React Query

Query keys:

```ts
const proxyKeys = {
	all: ['proxies'] as const,

	list: () => [...proxyKeys.all, 'list'] as const,

	detail: (id: string) => [...proxyKeys.all, 'detail', id] as const,

	checks: (id: string) =>
		[...proxyKeys.detail(id), 'checks'] as const,
};
```

Mutations:

```text
useCreateProxy
useUpdateProxy
useArchiveProxy

useCheckProxy

useAssignProxy
useUnassignProxy
```

Khi assign:

```text
invalidate profile detail
invalidate proxy assignments
```

---

# P2-35 — Tests

Các test quan trọng nhất:

```text
ProxyService

create
update
archive

credentials stored outside DB

credentials are never returned

invalid port denied
invalid protocol denied

check success
check timeout
check auth failure

assign proxy
replace assignment

cannot assign archived proxy
cannot modify running profile proxy

cannot archive proxy in use

secret cleanup on failed create
```

Browser integration test:

```text
Profile
   ↓
assigned Proxy
   ↓
BrowserService.launch
   ↓
BrowserLaunchRequest.proxy
   ↓
Provider receives correct config
```

Không cần test Internet thật trong unit test.

Dùng mock:

```text
MockProxyChecker
MockSecretStore
MockBrowserProvider
```

Integration tests remote network để riêng.

---

# Task board cho coding agent

Đây là thứ tự mình sẽ giao agent:

1. `P2-01` tạo Proxy domain model + protocol; `P2-02` tạo migrations `proxies`, `profile_proxy_assignments`, `proxy_checks`; `P2-03` implement `ProxyRepository`; `P2-04` implement `SecretStore` abstraction; `P2-05` implement OS-backed secret storage; `P2-06` implement ProxyService CRUD; `P2-07` implement input validation; `P2-08` implement ProxyChecker abstraction; `P2-09` implement HTTP/HTTPS/SOCKS5 connectivity checker; `P2-10` persist proxy check result; `P2-11` derive health status; `P2-12` implement assign/unassign; `P2-13` enforce no proxy changes while profile is running; `P2-14` integrate ProxyService into BrowserService; `P2-15` extend BrowserLaunchRequest; `P2-16` extend BrowserProvider proxy config; `P2-17` ensure credentials never leave Rust backend; `P2-18` add proxy/profile activity events; `P2-19` create typed Tauri commands; `P2-20` create TS proxy API; `P2-21` create React Query layer; `P2-22` build Proxies list; `P2-23` build Add/Edit Proxy; `P2-24` build connection test UI; `P2-25` build Proxy detail; `P2-26` integrate proxy into Profile detail; `P2-27` implement archive UX; `P2-28` implement concurrency locks; `P2-29` redact sensitive logs; `P2-30` add Rust unit/integration tests; `P2-31` test Browser launch with and without proxy; `P2-32` Windows production test.

---

# Implementation dependency

Giữ thứ tự này:

```text
Proxy Domain
     │
     ▼
DB migrations
     │
     ├─────────────┐
     ▼             ▼
Repository     SecretStore
     │             │
     └──────┬──────┘
            ▼
       ProxyService
            │
            ▼
       ProxyChecker
            │
            ▼
Profile Assignment
            │
            ▼
      BrowserService
            │
            ▼
      BrowserProvider
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

Đừng cho agent nhảy thẳng vào UI.

---

# Definition of Done

Scenario cuối Phase 2 phải chạy được:

```text
Open ProfileDock
      │
      ▼
Add Proxy
      │
      ├── config → SQLite
      │
      └── credentials → SecretStore
      │
      ▼
Test Proxy
      │
      ▼
Healthy
      │
      ▼
Assign Proxy → Profile QA 01
      │
      ▼
Launch Profile
      │
      ▼
BrowserService
      │
      ├── loads Profile
      ├── loads Proxy
      ├── resolves credentials
      │
      ▼
BrowserProvider
      │
      ▼
Browser launches with configured network
      │
      ▼
Stop browser
      │
      ▼
Change / Unassign Proxy
```

Phase 2 chỉ nên được đánh dấu **DONE** khi credential không xuất hiện trong DB/log/UI, mỗi profile chỉ có tối đa một assignment, không đổi proxy khi profile đang chạy, proxy health check có timeout và typed errors, BrowserService hoạt động cả với `proxy=None` lẫn proxy được gán, restart ProfileDock vẫn giữ assignment, và toàn bộ test + Windows build đều pass.

Sau Phase 2, mình sẽ đi **Phase 3 = Browser Configuration Layer**: startup URLs, downloads, browser preferences, extension management, provider capabilities và cách lưu/apply configuration theo từng profile. Đây là bước phù hợp tiếp theo trước khi nghĩ tới các workflow cao hơn.
