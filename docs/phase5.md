Phase 5 nên chuyển từ “core kỹ thuật” sang **Workspace/Profile Management UX kiểu AdsPower**, nhưng giữ boundary rõ: làm quản lý profile, group, tag, proxy, extension, cookie/session, storage, lifecycle; **không làm fingerprint spoofing / fake hardware signals / anti-detection bypass**.

Từ ảnh bạn gửi, mình sẽ lấy đúng tinh thần UX:

```text
AdsPower-like UX

Sidebar
├── New Profile
├── Profiles
├── Groups
├── Proxies
├── Extensions
├── Trash
└── Settings

Create Profile
├── General
├── Proxy
├── Platform
├── Browser
└── Advanced

Right panel
└── Profile Overview
```

Với ProfileDock, vì đã chốt **chỉ dùng CloakBrowser**, không cần browser selector nữa.

# Phase 5 — Profile Workspace & Management UX

Mục tiêu cuối Phase 5:

```text
ProfileDock
│
├── New Profile
│
├── Profiles
│   ├── search
│   ├── filters
│   ├── sort
│   ├── status
│   ├── group
│   ├── tags
│   ├── proxy
│   ├── launch / stop
│   └── bulk metadata actions
│
├── Groups
├── Tags
├── Proxies
├── Extensions
├── Trash
│
└── Profile Editor
    ├── General
    ├── Proxy
    ├── Platform
    ├── Browser
    └── Advanced
```

---

# 5.1 — Sidebar giống AdsPower

Đổi navigation thành:

```text
ProfileDock

[ + New Profile ]

Profiles

Organization
├── Groups
├── Tags
├── Proxies
├── Extensions
└── Trash

System
├── Activity
└── Settings
```

Không cần:

```text
Browser
Browsers
Browser Provider
```

vì CloakBrowser là cố định.

---

# 5.2 — New Profile thành page riêng

Không dùng dialog nhỏ nữa.

Route:

```text
/profiles/new
```

Layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ New Browser Profile                                          │
├───────────────────────────────────────────────────────────────┤
│ General | Proxy | Platform | Browser | Advanced              │
│                                                               │
│                  FORM                         OVERVIEW         │
│                                                               │
│                                              Name             │
│                                              Group            │
│                                              Tags             │
│                                              Proxy            │
│                                              Cloak version    │
│                                              Startup URLs     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                         Cancel     Create     │
└───────────────────────────────────────────────────────────────┘
```

Điểm hay của AdsPower là panel Overview bên phải luôn cho user biết configuration hiện tại.

ProfileDock nên copy pattern UX đó.

---

# 5.3 — Tab General

Form:

```text
General

Profile name
[ QA Profile 001                         ]

Group
[ Ungrouped                           ▼ ]

Tags
[ QA ] [ VN ] [ Test ]        [+ Tag]

Remark
[                                       ]
[                                       ]

Startup
[✓] Restore previous session
```

Domain model bổ sung:

```rust
Profile {
    id,
    name,
    description,
    group_id,
    remark,
    is_archived,
    created_at,
    updated_at,
}
```

---

# 5.4 — Groups

Tạo entity:

```rust
pub struct ProfileGroup {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
}
```

DB:

```sql
CREATE TABLE profile_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

ALTER TABLE profiles
ADD COLUMN group_id TEXT REFERENCES profile_groups(id);
```

Một profile:

```text
0..1 group
```

Một group:

```text
many profiles
```

UI:

```text
Groups

All Profiles        42
QA                  12
Development          8
Client A            14
Archived             8

[ + New Group ]
```

---

# 5.5 — Tags

Group và Tag phải khác nhau.

```text
Group
→ organizational hierarchy

Tag
→ many-to-many classification
```

Ví dụ:

```text
Profile A
Group: QA

Tags:
[ VN ]
[ Mobile ]
[ Regression ]
```

Schema:

```sql
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE profile_tags (
    profile_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,

    PRIMARY KEY(profile_id, tag_id),

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE,

    FOREIGN KEY(tag_id)
        REFERENCES tags(id)
        ON DELETE CASCADE
);
```

---

# 5.6 — Proxy tab

Phase 2 đã có Proxy Core.

Phase 5 chỉ nâng UX:

```text
Proxy

○ No Proxy
● Saved Proxy
○ Custom Proxy

Saved Proxy
[ SG Proxy 01                         ▼ ]

Status
● Healthy

Protocol
SOCKS5

Address
proxy.example.com:1080

Observed IP
203.0.113.2

Latency
183 ms

[ Check connection ]
```

Không hiện password.

---

# 5.7 — Custom Proxy trên New Profile

Có thể cho nhập proxy ngay lúc create:

```text
Custom Proxy

Protocol
[ SOCKS5 ▼ ]

Host
[ proxy.example.com ]

Port
[ 1080 ]

Username
[ user ]

Password
[ ••••••••• ]

[ Test connection ]
```

Khi Create:

```text
Create Profile
      │
      ├── create proxy
      ├── secret → SecretStore
      └── assign profile
```

Nhưng nên cho option:

```text
[✓] Save this proxy to Proxy Library
```

Nếu không save:

```text
profile-owned proxy config
```

Tuy nhiên để architecture đơn giản, mình khuyên MVP:

```text
Custom Proxy
      ↓
automatically save to Proxy Library
      ↓
assign
```

---

# 5.8 — Platform tab

“Platform” ở đây chỉ nên là metadata/workflow organization, không làm device impersonation.

Ví dụ:

```text
Platform

Category
[ General ▼ ]

Options
General
Web Testing
Development
QA
Other
```

Hoặc nếu bạn muốn label theo target website:

```text
Target
[ TikTok ]
```

thì chỉ lưu metadata:

```rust
profile.platform_label
```

Không dùng platform để tự động thay:

```text
User-Agent
hardware
canvas
WebGL
device model
```

---

# 5.9 — Không có Fingerprint tab

AdsPower có:

```text
Fingerprint
```

ProfileDock không nên replicate phần giả mạo hardware/browser fingerprint.

Thay tab này bằng:

```text
Browser
```

và sử dụng settings CloakBrowser đã có từ Phase 3.

```text
Browser

CloakBrowser
Version            146.x
Runtime            Managed

Startup URLs
[ https://example.com           × ]
[ + Add URL ]

Download Location
● Profile folder
○ Custom folder

Window
[ Normal ▼ ]

Restore Session
[✓]
```

---

# 5.10 — Advanced tab

Advanced chỉ chứa setting an toàn và operational:

```text
Advanced

Storage
Profile directory
C:\...\ProfileDock\profiles\019...

Downloads
C:\...\downloads

Startup behavior
[✓] Restore previous session

Browser lifecycle
[✓] Confirm before force-stop

Data
[ Export profile configuration ]

Maintenance
[ Clear browser cache ]

Danger Zone
[ Archive Profile ]
```

Không đặt:

```text
Custom Chromium arguments
Custom executable arguments
Custom JS injection
```

---

# 5.11 — Overview panel giống AdsPower

Panel phải update realtime khi user chỉnh form:

```text
Overview
────────────────────────

Name
QA Profile 01

Group
QA

Tags
VN, Regression

Browser
CloakBrowser 146.x

Proxy
SG Proxy 01

Proxy Status
Healthy

Startup URLs
2

Storage
Profile isolated

Restore Session
Enabled
```

FE thực hiện hoàn toàn local:

```text
TanStack Form
      │
      ▼
form values
      │
      ▼
ProfileOverview
```

Không cần backend request mỗi lần input thay đổi.

---

# 5.12 — Profiles List giống AdsPower

Đây nên là màn hình quan trọng nhất application.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Profiles                                          + New Profile     │
│                                                                     │
│ Search...   Group ▼   Tag ▼   Status ▼   Proxy ▼                  │
│                                                                     │
│ □ Name          Group    Tags       Proxy       Status      Action │
│ ─────────────────────────────────────────────────────────────────── │
│ □ QA 001        QA       VN         SG-01       ● Ready      Open  │
│ □ QA 002        QA       Test       SG-02       ● Running    Stop  │
│ □ Dev 01        Dev      -          None        ● Ready      Open  │
└─────────────────────────────────────────────────────────────────────┘
```

Columns nên user chọn được:

```text
Name
Group
Tags
Proxy
Proxy IP
Proxy status
Cloak version
Profile status
Last launch
Created
Remark
Storage
```

---

# 5.13 — Column preferences

Lưu preference:

```text
profile_list_preferences
```

Ví dụ:

```json
{
	"columns": ["name", "group", "proxy", "status", "lastLaunch"],
	"density": "compact"
}
```

Đây là user UI preference, có thể lưu app settings thay vì domain DB.

---

# 5.14 — Search

Search backend:

```text
name
remark
group
tag
proxy name
```

Request:

```rust
ProfileListQuery {
    search,
    group_id,
    tag_ids,
    status,
    proxy_id,
    sort,
    page,
    page_size,
}
```

Đừng load toàn bộ profiles rồi filter bằng React.

---

# 5.15 — Pagination

Ngay cả desktop local app cũng nên làm chuẩn:

```text
page size:
25
50
100
200
```

SQLite query:

```sql
LIMIT ?
OFFSET ?
```

Response:

```json
{
	"items": [],
	"total": 841,
	"page": 1,
	"pageSize": 50
}
```

---

# 5.16 — Sorting

Cho sort:

```text
name
created_at
updated_at
last_launched_at
group
```

Không cho FE truyền raw SQL column.

Rust map:

```rust
enum ProfileSort {
    NameAsc,
    NameDesc,
    CreatedDesc,
    LastLaunchDesc,
}
```

---

# 5.17 — Profile status

List status:

```text
● Ready
● Running
● Starting
● Error
○ Archived
```

Status derive từ:

```text
Profile
+
BrowserInstance
+
runtime reconciliation
```

Không duplicate `status` vào `profiles`.

---

# 5.18 — Quick actions

Row:

```text
[ Launch ] [ ⋮ ]
```

Menu:

```text
Edit
Move to group
Manage tags
Change proxy
Open profile folder
View activity
Archive
```

Nếu running:

```text
[ Stop ]
```

Menu không cho đổi Proxy/Browser settings khi running.

---

# 5.19 — Multi select

Giống AdsPower:

```text
☑ Profile A
☑ Profile B
☑ Profile C
```

Toolbar:

```text
3 selected

[ Move Group ]
[ Add Tags ]
[ Remove Tags ]
[ Assign Proxy ]
[ Archive ]
```

MVP Phase 5 nên giới hạn bulk action ở **quản trị metadata/configuration**.

Không cần làm mass-login/mass-behavior automation.

---

# 5.20 — Bulk update backend

Không loop:

```text
FE
  ↓
100 invoke()
```

Tạo command:

```rust
profile_bulk_update
```

Input:

```rust
pub struct BulkProfileUpdateInput {
    pub profile_ids: Vec<String>,

    pub group_id: Option<String>,

    pub add_tags: Vec<String>,
    pub remove_tags: Vec<String>,
}
```

Backend transaction:

```text
validate all
   ↓
begin transaction
   ↓
apply
   ↓
commit
```

---

# 5.21 — Trash

AdsPower có Trash, ProfileDock cũng nên có.

Hiện Phase 1:

```text
archive = soft delete
```

Phase 5 expose thành:

```text
Trash
```

Flow:

```text
Profile
  ↓
Move to Trash
  ↓
is_archived = 1
```

Trash UI:

```text
Trash

QA Profile 01
Deleted 2 days ago

[ Restore ]
[ Delete permanently ]
```

---

# 5.22 — Permanent delete

Chỉ cho khi browser stopped.

Confirmation:

```text
Delete profile permanently?

This will delete:
- Profile metadata
- Browser data
- Cookies/session data
- Downloads if stored in profile directory
- Activity history

Type profile name:

[ QA Profile 01 ]

[ Delete permanently ]
```

Backend order:

```text
ensure stopped
      ↓
delete secrets/assignments
      ↓
delete filesystem safely
      ↓
delete DB
```

Nếu filesystem fail, phải trả rõ và tránh state nửa vời.

---

# 5.23 — Restore profile

```text
Trash
   ↓
Restore
   ↓
is_archived = 0
```

Browser data vẫn còn nên profile tiếp tục chạy như trước.

---

# 5.24 — Extensions Library

Phase 3.5 chưa làm, Phase 5 có thể đưa vào nếu CloakBrowser hỗ trợ cách load extension hợp lệ.

UI:

```text
Extensions

Extension             Version     Profiles
──────────────────────────────────────────
Extension A           1.3.2       4
Extension B           2.1.0       12

[ Add Extension ]
```

Assignment:

```text
Extension
   │
   ├── Profile A
   ├── Profile B
   └── Profile C
```

Schema:

```text
extensions
profile_extensions
```

Nhưng agent phải verify cơ chế CloakBrowser thực tế trước khi implement launch integration.

---

# 5.25 — Cookie import/export

Đây là tính năng profile manager hữu ích.

Trong profile:

```text
Browser Data

Cookies
[ Import ]
[ Export ]
```

Support format rõ ràng:

```text
JSON
Netscape cookie format
```

Nhưng architecture nên có:

```text
CookieImportService
```

và validate file size/schema.

Không cho raw file contents đi thẳng vào browser process.

---

# 5.26 — Profile notes

`remark` ngắn và `notes` dài nên tách:

```text
Remark
→ list/table summary

Notes
→ profile detail
```

Schema:

```sql
ALTER TABLE profiles
ADD COLUMN remark TEXT;

ALTER TABLE profiles
ADD COLUMN notes TEXT;
```

UI:

```text
Remark
QA account

Notes
Longer operational notes...
```

---

# 5.27 — Profile ID display

AdsPower-style systems thường cần ID dễ reference.

ProfileDock UUID dài không thân thiện.

Thêm:

```text
display_id
```

Ví dụ:

```text
PD-000001
PD-000002
```

DB vẫn dùng UUID làm FK.

```text
UUID
→ internal identity

PD-000042
→ human-readable
```

---

# 5.28 — Profile duplication

Phase 1 từng để ngoài scope.

Phase 5 có thể làm:

```text
Duplicate Profile
```

nhưng mặc định chỉ duplicate **configuration**, không duplicate session/browser data.

```text
Duplicate

[✓] General settings
[✓] Group & tags
[✓] Proxy assignment
[✓] Browser settings

[ ] Browser data
```

MVP:

```text
Browser data duplication = disabled
```

tránh copy profile đang có locks/cache/database phức tạp.

---

# 5.29 — Activity Logs

Sidebar:

```text
Activity
```

Global table:

```text
Time          Profile      Event
─────────────────────────────────────────
08:42         QA 001       Browser started
08:40         QA 002       Proxy changed
08:38         QA 003       Profile updated
```

Filters:

```text
profile
event type
date
```

Không log credentials.

---

# 5.30 — Profile creation transaction

Create page bây giờ chạm nhiều entity:

```text
Profile
Group
Tags
Proxy
Browser settings
```

Nên tạo orchestration:

```rust
ProfileCreationService
```

Flow:

```text
CreateProfileDraft
      │
      ▼
validate
      │
      ▼
DB transaction
      │
      ├── profile
      ├── group
      ├── tags
      ├── browser settings
      └── proxy assignment
      │
      ▼
filesystem
      │
      ▼
commit/finalize
```

Không để Tauri command gọi 5 service một cách tùy ý.

---

# 5.31 — Draft model FE

New Profile sử dụng TanStack Form:

```ts
type CreateProfileForm = {
	general: {
		name: string;
		groupId?: string;
		tags: string[];
		remark?: string;
	};

	proxy: {
		mode: 'none' | 'saved' | 'custom';
		proxyId?: string;
	};

	platform: {
		label?: string;
	};

	browser: {
		startupUrls: string[];
		downloadMode: 'profile' | 'custom';
		windowMode: 'normal' | 'maximized';
		restoreSession: boolean;
	};
};
```

Zod validate tại FE.

Rust validate lại backend.

---

# 5.32 — Auto-save draft

AdsPower-like UX sẽ tốt hơn nếu form không mất khi app đóng nhầm.

Có thể lưu draft:

```text
New Profile
   ↓
changes
   ↓
local draft
```

Dùng:

```text
localStorage
```

hoặc app config.

Draft không được chứa proxy password plaintext lâu dài.

Nếu có custom credential:

```text
do not persist password in draft
```

---

# 5.33 — Keyboard UX

Desktop app nên có:

```text
Ctrl + N
→ New Profile

Ctrl + F
→ Search profiles

Enter
→ Open selected profile
```

Nhưng tránh quá nhiều shortcut ngay MVP.

---

# 5.34 — Density

AdsPower dùng dense information layout.

ProfileDock nên có:

```text
Comfortable
Compact
```

Đặc biệt với 100+ profiles.

---

# 5.35 — Backend query architecture

Không để `ProfileService` trở thành god service.

Tách read/query:

```text
application/
├── services/
│   └── profile_service.rs
│
└── queries/
    └── profile_list_query.rs
```

CQRS nhẹ:

```text
Commands
→ create/update/archive

Queries
→ list/search/filter
```

Không cần full CQRS framework.

---

# 5.36 — Tauri commands Phase 5

Command surface:

```text
profile_list
profile_create_full
profile_update_full

profile_duplicate

profile_bulk_update

profile_move_to_trash
profile_restore
profile_delete_permanent

group_list
group_create
group_update
group_delete

tag_list
tag_create
tag_delete

profile_activity_list
```

Existing:

```text
profile_launch
profile_stop
```

giữ nguyên.

---

# 5.37 — FE feature structure

Mình recommend:

```text
src/features/
├── profiles/
│   ├── api/
│   ├── components/
│   ├── forms/
│   ├── pages/
│   ├── queries/
│   └── schemas/
│
├── groups/
├── tags/
├── proxies/
├── extensions/
├── trash/
└── activity/
```

Không tạo một folder `profile-management` chứa tất cả.

---

# 5.38 — Task board cho agent

Bạn có thể đưa nguyên block này cho agent:

```text
PHASE 5 — ADSPOWER-LIKE PROFILE WORKSPACE

Context:

- Phase 0 Foundation complete.
- Phase 1 Profile Core complete.
- Phase 2 Proxy Core complete.
- Phase 3 CloakBrowser Configuration complete.
- Phase 4 Cloak Runtime Distribution complete.
- ProfileDock supports ONLY CloakBrowser.

Goal:

Transform ProfileDock from a technical browser launcher into a
desktop profile-management workspace with an information-dense UX
similar to AdsPower.

Important:

Do NOT introduce BrowserProvider abstractions.
Do NOT add Chrome/Firefox/browser selection.
Do NOT implement fingerprint spoofing, hardware identity spoofing,
canvas/WebGL manipulation, or anti-detection bypass features.

The AdsPower inspiration should apply to:
- layout
- profile organization
- profile creation UX
- groups
- tags
- proxies
- extensions
- profile lifecycle
- search/filter/sort
- overview panels
- activity/history
- trash/restore
- bulk metadata management

Implementation order:

P5-01 Redesign sidebar navigation.

P5-02 Replace Create Profile dialog with /profiles/new page.

P5-03 Build tabbed New Profile layout:
      General
      Proxy
      Platform
      Browser
      Advanced.

P5-04 Build live Overview side panel.

P5-05 Add profile_groups migration/model/repository/service.

P5-06 Add tags and profile_tags migrations.

P5-07 Implement GroupService.

P5-08 Implement TagService.

P5-09 Add group_id, remark and notes support to profiles.

P5-10 Add human-readable profile display IDs.

P5-11 Implement complete ProfileCreationService orchestration.

P5-12 Integrate existing ProxyService into profile creation.

P5-13 Integrate existing browser settings into profile creation.

P5-14 Implement profile list query model.

P5-15 Implement backend search.

P5-16 Implement group/tag/status/proxy filters.

P5-17 Implement typed sorting.

P5-18 Implement pagination.

P5-19 Build AdsPower-style Profiles table.

P5-20 Add configurable columns.

P5-21 Add compact/comfortable density preference.

P5-22 Add row quick actions.

P5-23 Add multi-select.

P5-24 Implement bulk group updates.

P5-25 Implement bulk tag updates.

P5-26 Implement safe bulk proxy assignment.

P5-27 Implement Trash page.

P5-28 Implement Restore Profile.

P5-29 Implement Permanent Delete with explicit confirmation.

P5-30 Ensure permanent delete is impossible while profile runs.

P5-31 Add Profile Duplicate (configuration-only MVP).

P5-32 Build Groups page.

P5-33 Build Tags management.

P5-34 Upgrade Proxies page integration.

P5-35 Implement global Activity page.

P5-36 Add profile Notes UI.

P5-37 Add profile storage overview.

P5-38 Add safe Clear Cache action.

P5-39 Evaluate CloakBrowser extension-loading support.

P5-40 If officially supported, implement Extensions Library.

P5-41 Add cookie import/export abstraction.

P5-42 Add frontend TanStack Form schemas.

P5-43 Add React Query query keys/mutations.

P5-44 Add New Profile draft recovery without persisting secrets.

P5-45 Add keyboard shortcuts for New/Search.

P5-46 Add backend transaction tests.

P5-47 Add profile list/filter/pagination tests.

P5-48 Add group/tag tests.

P5-49 Add Trash/Restore/Permanent Delete tests.

P5-50 Run Windows E2E with large profile dataset.
```

---

# UI cuối Phase 5

Mục tiêu trực quan:

```text
┌──────────────────────────────────────────────────────────────────┐
│ ProfileDock                                                      │
├───────────────┬──────────────────────────────────────────────────┤
│               │ Profiles                         + New Profile   │
│ + New Profile │                                                  │
│               │ Search...  Group ▼ Tag ▼ Status ▼ Proxy ▼      │
│ Profiles      │                                                  │
│ Groups        │ □ Name     Group   Proxy    Status       Action │
│ Tags          │ ──────────────────────────────────────────────── │
│ Proxies       │ □ QA 001   QA      SG-01    ● Ready      Open   │
│ Extensions    │ □ QA 002   QA      SG-02    ● Running    Stop   │
│ Trash         │ □ Dev 01   Dev     None     ● Ready      Open   │
│               │                                                  │
│ Activity      │                                                  │
│ Settings      │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

Create:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ New Browser Profile                                                │
├─────────────────────────────────────────────────────────────────────┤
│ General | Proxy | Platform | Browser | Advanced                    │
│                                                                     │
│ Profile Name                         │ Overview                     │
│ [ QA Profile 01                  ]  │                              │
│                                    │ Name       QA Profile 01     │
│ Group                              │ Group      QA                │
│ [ QA ▼ ]                           │ Tags       VN, Regression    │
│                                    │ Proxy      SG Proxy 01       │
│ Tags                               │ Browser    CloakBrowser      │
│ [VN] [Regression] [+]              │ Version    146.x             │
│                                    │                              │
│ Remark                             │ Status     Ready             │
│ [ Regression QA profile         ]  │                              │
│                                                                     │
│                                         Cancel       Create        │
└─────────────────────────────────────────────────────────────────────┘
```

# Definition of Done

Phase 5 chỉ nên coi là complete khi:

```text
Fresh ProfileDock
       ↓
Create groups
       ↓
Add tags
       ↓
Add proxies
       ↓
New Profile
       ↓
General
Proxy
Browser
Advanced
       ↓
live Overview
       ↓
Create
       ↓
Profile appears in table
       ↓
search/filter/sort
       ↓
Launch
       ↓
Running
       ↓
Stop
       ↓
bulk move group/tag
       ↓
Trash
       ↓
Restore
       ↓
Permanent Delete
```

Sau Phase 5, ProfileDock sẽ bắt đầu có cảm giác giống một **desktop profile manager thực thụ** thay vì một UI wrapper quanh Tauri/CloakBrowser.

Phase 6 mình sẽ đi theo hướng rất hợp với AdsPower: **Profile Operations & Local API/MCP layer** — cho phép các tool nội bộ quản lý profile lifecycle, query status, launch/stop profile, đọc profile metadata và integrate automation testing một cách có kiểm soát, nhưng không biến nó thành layer giả lập hành vi người dùng hay né kiểm soát nền tảng.
