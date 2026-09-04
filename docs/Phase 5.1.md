Có. **CloakBrowser hỗ trợ cấu hình khá nhiều browser/hardware signals tương tự phần Fingerprint của AdsPower**, nhưng không phải 1:1.

CloakBrowser có master fingerprint seed và cho override các giá trị như GPU vendor/renderer, `hardwareConcurrency`, `deviceMemory`, screen size, platform, timezone, locale, WebRTC IP…; chính repo `CloakBrowser-Manager` của CloakHQ cũng đang map các field `gpu_vendor`, `gpu_renderer`, `hardware_concurrency`, `screen_width`, `screen_height` thành các fingerprint flags khi launch profile. ([GitHub][1])

Điểm quan trọng là **đừng copy nguyên UI AdsPower và giả định mọi switch đều được Cloak hỗ trợ riêng biệt**. Canvas/WebGL render/audio/fonts/client rects chủ yếu được Cloak điều khiển bằng fingerprint seed/noise engine; tài liệu không cho thấy API ổn định để bật/tắt từng signal độc lập giống các toggle trong AdsPower. ([GitHub][1])

## Mình sẽ thêm một Phase 5.1 — Device Profile

New Profile của ProfileDock đổi thành:

```text
New Profile
│
├── General
├── Proxy
├── Platform
├── Device              ← NEW
├── Browser
└── Advanced
```

Tab `Device`:

```text
Device / Environment
─────────────────────────────────────────

Configuration
● Automatic
○ Custom

Fingerprint seed
[ 48273195 ]                 [ Regenerate ]

Platform
[ Windows ▼ ]

Hardware
CPU cores
[ 8 ▼ ]

Device memory
[ 8 GB ▼ ]

Screen
Resolution
[ 1920 × 1080 ▼ ]

Graphics
GPU
[ Automatic ▼ ]

WebGL Vendor
[ Google Inc. (Intel)              ]

WebGL Renderer
[ ANGLE (...)                      ]

Environment

Timezone
[ Based on proxy ▼ ]

Locale
[ Based on proxy ▼ ]

WebRTC IP
[ Based on proxy ▼ ]
```

Và bên phải giống AdsPower:

```text
Overview
────────────────────────

CloakBrowser      146.x
Platform          Windows

CPU               8 cores
RAM               8 GB

Screen            1920×1080

GPU               Intel ...
WebGL             ANGLE ...

Timezone          Asia/Bangkok
Locale            th-TH

Proxy             TH Proxy #01
WebRTC            Proxy IP

Fingerprint
Seed              48273195
```

## Quan trọng nhất: fingerprint phải persistent theo profile

Không nên tạo seed mới mỗi lần Launch.

Sai:

```text
Profile A
  ↓
Launch #1 → seed 18273
Launch #2 → seed 82712
Launch #3 → seed 47361
```

Nên:

```text
Create Profile A
       ↓
generate seed
       ↓
48273195
       │
       ├── Launch #1
       ├── Launch #2
       ├── Launch #3
       └── ...
```

README của CloakBrowser mô tả cùng seed sẽ tạo configuration xác định và explicit flags có thể override các giá trị được sinh từ seed. ([GitHub][1])

---

# Database

Tạo migration tiếp theo, ví dụ:

```text
006_profile_device_settings.sql
```

Mình sẽ **không nhét tất cả vào `profiles`**.

```sql
CREATE TABLE profile_device_settings (
    profile_id TEXT PRIMARY KEY,

    mode TEXT NOT NULL DEFAULT 'automatic',

    fingerprint_seed INTEGER NOT NULL,

    platform TEXT,

    hardware_concurrency INTEGER,
    device_memory INTEGER,

    screen_width INTEGER,
    screen_height INTEGER,

    gpu_mode TEXT NOT NULL DEFAULT 'automatic',
    gpu_vendor TEXT,
    gpu_renderer TEXT,

    timezone_mode TEXT NOT NULL DEFAULT 'proxy',
    timezone TEXT,

    locale_mode TEXT NOT NULL DEFAULT 'proxy',
    locale TEXT,

    webrtc_mode TEXT NOT NULL DEFAULT 'proxy',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY(profile_id)
        REFERENCES profiles(id)
        ON DELETE CASCADE
);
```

Không cần lưu:

```text
canvas hash
audio hash
client rect hash
```

vì đó nên là output được Cloak sinh từ fingerprint configuration, không phải domain state của ProfileDock.

---

# Rust domain model

Tạo:

```text
domain/device/
├── mod.rs
├── settings.rs
├── platform.rs
└── repository.rs
```

Model:

```rust
pub struct ProfileDeviceSettings {
    pub profile_id: String,

    pub mode: DeviceConfigurationMode,

    pub fingerprint_seed: u64,

    pub platform: Option<DevicePlatform>,

    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,

    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,

    pub gpu: GpuSettings,

    pub timezone: EnvironmentSetting<String>,
    pub locale: EnvironmentSetting<String>,

    pub webrtc_mode: WebRtcMode,
}
```

Mode:

```rust
pub enum DeviceConfigurationMode {
    Automatic,
    Custom,
}
```

GPU:

```rust
pub struct GpuSettings {
    pub mode: GpuMode,

    pub vendor: Option<String>,
    pub renderer: Option<String>,
}

pub enum GpuMode {
    Automatic,
    Custom,
}
```

---

# Automatic mode

Đây nên là default.

```text
Automatic
   │
   ▼
fingerprint seed
   │
   ▼
CloakBrowser
   │
   ├── GPU
   ├── CPU cores
   ├── RAM
   ├── screen
   ├── Canvas-derived signals
   ├── WebGL-derived signals
   ├── Audio-derived signals
   └── ClientRects-derived signals
```

CloakBrowser document rằng seed được dùng để tạo GPU, hardware concurrency, device memory và screen dimensions, bên cạnh các fingerprint/noise signals khác. ([GitHub][1])

Vì vậy lúc Create Profile:

```text
Default:

Device mode
= Automatic

fingerprint_seed
= generated once

Platform
= Windows

GPU
= Auto

CPU
= Auto

RAM
= Auto

Screen
= Auto

Timezone
= Proxy

Locale
= Proxy

WebRTC
= Proxy
```

Đây nên là **recommended configuration**.

---

# Custom mode

Chỉ khi user bật:

```text
○ Custom
```

thì mới enable:

```text
CPU
RAM
Screen
GPU
Timezone
Locale
```

Ví dụ:

```text
CPU           8
RAM           8GB
Screen        1920×1080
GPU           Intel UHD Graphics
Timezone      Asia/Bangkok
Locale        th-TH
```

---

# Mapping CloakBrowser

Đây là responsibility của:

```text
CloakLaunchBuilder
```

Không phải frontend.

Pipeline:

```text
ProfileDeviceSettings
        │
        ▼
DeviceConfigResolver
        │
        ▼
ResolvedDeviceConfig
        │
        ▼
CloakLaunchBuilder
        │
        ▼
Cloak-specific configuration
```

Cloak có các controls tương ứng:

```text
fingerprint_seed
        ↓
--fingerprint

platform
        ↓
--fingerprint-platform

gpu_vendor
        ↓
--fingerprint-gpu-vendor

gpu_renderer
        ↓
--fingerprint-gpu-renderer

hardware_concurrency
        ↓
--fingerprint-hardware-concurrency

device_memory
        ↓
--fingerprint-device-memory

screen_width
        ↓
--fingerprint-screen-width

screen_height
        ↓
--fingerprint-screen-height
```

Các flag GPU, CPU, RAM và screen này được document trong CloakBrowser; official Manager cũng sử dụng các override tương ứng cho profile launch. ([GitHub][1])

Ngoài ra Cloak có timezone/locale và WebRTC-IP controls. ([GitHub][2])

---

# Nhưng đừng truyền arbitrary args

Đừng làm:

```rust
pub struct ProfileDeviceSettings {
    pub cloak_args: Vec<String>,
}
```

và:

```ts
{
	args: ['--fingerprint-...'];
}
```

từ React.

Phải là:

```text
React

hardwareConcurrency: 8
deviceMemory: 8
screen:
  width: 1920
  height: 1080

          ↓

Rust typed model

          ↓

CloakLaunchBuilder

          ↓

actual Cloak args
```

FE không bao giờ biết implementation flags.

---

# DeviceConfigResolver

Tạo service:

```text
application/services/
└── device_config_resolver.rs
```

Output:

```rust
pub struct ResolvedDeviceConfig {
    pub fingerprint_seed: u64,

    pub platform: DevicePlatform,

    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,

    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,

    pub gpu_vendor: Option<String>,
    pub gpu_renderer: Option<String>,

    pub timezone: Option<String>,
    pub locale: Option<String>,

    pub webrtc_ip_mode: WebRtcIpMode,
}
```

Resolver phải xử lý:

```text
                         Proxy
                           │
                           ▼
ProfileDeviceSettings → DeviceConfigResolver
                           │
                ┌──────────┼──────────┐
                ▼          ▼          ▼
             timezone    locale     WebRTC
```

Ví dụ:

```text
timezone_mode = proxy
      ↓
Proxy exit geo
      ↓
Asia/Bangkok
```

Nếu không có proxy:

```text
proxy mode
     +
no proxy
     ↓
system/default
```

Không fake một giá trị ngẫu nhiên.

---

# Không nên cho user nhập GPU raw ngay MVP

AdsPower có database preset.

ProfileDock cũng nên làm preset model:

```rust
pub struct HardwarePreset {
    pub id: &'static str,

    pub label: &'static str,

    pub platform: DevicePlatform,

    pub hardware_concurrency: u8,
    pub device_memory_gb: u8,

    pub screen_width: u32,
    pub screen_height: u32,

    pub gpu_vendor: &'static str,
    pub gpu_renderer: &'static str,
}
```

UI:

```text
Hardware Preset

[ Windows Desktop - Intel ▼ ]

Windows Desktop - Intel
Windows Desktop - NVIDIA
Windows Laptop - Intel
Custom
```

Nhưng preset nên phục vụ **configuration consistency/testing**, không quảng bá là “undetectable”.

---

# Consistency validation

Đây là phần rất đáng làm.

Không cho config kiểu:

```text
Platform: macOS
GPU: NVIDIA RTX 4090
Screen: 1366×768
RAM: 2GB
CPU: 64
```

mà không warning.

Tạo:

```text
DeviceConsistencyValidator
```

Output:

```rust
pub struct DeviceValidationResult {
    pub valid: bool,
    pub warnings: Vec<DeviceWarning>,
}
```

Ví dụ:

```text
⚠ GPU preset is inconsistent with selected platform.

⚠ CPU/RAM combination is outside the supported preset set.

⚠ Screen dimensions do not belong to the selected preset.
```

Quan trọng là **warning dựa trên preset bạn định nghĩa**, không cần cố đoán “có bị site detect không”.

---

# Fingerprint regenerate

UI có thể có:

```text
Fingerprint Seed

48273195           [ Regenerate ]
```

Nhưng khi user click:

```text
Regenerate fingerprint configuration?

This changes the device configuration associated with
this profile.

[ Cancel ] [ Regenerate ]
```

Không regenerate tự động mỗi launch.

Và không cho regenerate nếu browser đang running:

```text
PROFILE_RUNNING
```

---

# Snapshot khi launch

Phase 3 đã có:

```text
browser_instances.config_snapshot_json
```

Thêm:

```json
{
	"configVersion": 2,

	"device": {
		"fingerprintSeed": 48273195,
		"platform": "windows",

		"hardwareConcurrency": 8,
		"deviceMemoryGb": 8,

		"screen": {
			"width": 1920,
			"height": 1080
		},

		"gpuPresetId": "windows-intel-desktop",

		"timezoneMode": "proxy",
		"localeMode": "proxy",
		"webrtcMode": "proxy"
	}
}
```

Nếu custom GPU thì không nhất thiết lưu string dài vào activity log; snapshot kỹ thuật thì có thể lưu nếu không chứa secret.

---

# UI Overview

Right panel của New Profile nên tổng hợp:

```text
Overview

General
────────────────────
Name               TH-001
Group              Thailand

Network
────────────────────
Proxy              TH Proxy 01
Proxy IP           1.2.3.4

Device
────────────────────
Platform           Windows
CPU                8 cores
RAM                8 GB
Screen             1920×1080
GPU                Intel

Environment
────────────────────
Timezone           Based on proxy
Locale             Based on proxy
WebRTC             Proxy

Browser
────────────────────
CloakBrowser       146.x
Fingerprint        Fixed
```

Rất giống UX AdsPower nhưng phù hợp architecture ProfileDock.

---

# Đừng implement một số phần AdsPower lúc này

Ảnh của bạn có:

```text
Canvas          toggle
WebGL Image     toggle
AudioContext    toggle
Media device    toggle
ClientRects     toggle
SpeechVoices    toggle
```

**Đừng tạo 6 toggle này chỉ để UI giống AdsPower.**

CloakBrowser hiện mô tả master seed/noise layer cho canvas, WebGL, audio, fonts và client rects, và có global `--fingerprint-noise=false`; mình chưa thấy contract ổn định chính thức cho six independent per-signal modes như AdsPower. ([GitHub][1])

Do đó Phase này nên hiển thị:

```text
Fingerprint Engine

● Cloak managed
```

thay vì:

```text
Canvas       Noise
Audio        Noise
ClientRects  Noise
...
```

Sau này Cloak expose stable API thật thì thêm.

---

# Không thêm Android/iOS vào Platform

Trong screenshot AdsPower bạn có:

```text
Windows
macOS
Linux
Android
iOS
```

Với ProfileDock + CloakBrowser hiện tại, **đừng copy Android/iOS**.

Tài liệu mà mình kiểm tra tập trung vào desktop platform fingerprinting; mình không thấy API chính thức đảm bảo một Windows Cloak runtime có thể tạo full coherent iOS/Android browser environment tương đương AdsPower.

Phase 5.1 nên dùng:

```text
Windows
```

là primary vì ProfileDock target Windows.

Nếu sau này Cloak chính thức support mobile profiles thì mới mở:

```text
Android
iOS
```

---

# Một lưu ý riêng cho Windows

Có các issue upstream của CloakBrowser về fingerprint behavior trên Windows, bao gồm báo cáo seed không làm thay đổi một số canvas/WebGL/audio/client-rect outputs ở một số version. Vì vậy đừng assume “khác seed = mọi signal chắc chắn khác” trong code hoặc UI; treat capability theo version và E2E-test runtime bạn đang pin. ([GitHub][3])

Bạn đã có `CloakCapabilities` từ Phase 3, nên thêm:

```rust
pub struct CloakCapabilities {
    // existing

    pub fingerprint_seed: bool,

    pub hardware_concurrency_override: bool,
    pub device_memory_override: bool,

    pub screen_override: bool,

    pub gpu_override: bool,

    pub timezone_override: bool,
    pub locale_override: bool,

    pub webrtc_ip_override: bool,
}
```

UI chỉ enable field nếu active Cloak runtime support.

---

# Prompt hoàn chỉnh để giao AI Agent

Bạn có thể đưa nguyên block dưới đây cho agent:

```text
PHASE 5.1 — PROFILE DEVICE / ENVIRONMENT CONFIGURATION

Context

ProfileDock:
- Tauri + Rust + React.
- Supports ONLY CloakBrowser.
- Phase 0-5 architecture already exists.
- Cloak launch pipeline currently is:

  CloakPreflight
    -> CloakConfigResolver
    -> CloakLaunchBuilder
    -> ProcessManager

- Profiles use persistent isolated user-data directories.
- Proxy Core already exists.
- Browser instance config snapshots already exist.
- Do NOT reintroduce BrowserProvider or multi-browser support.

Goal

Add an AdsPower-inspired Device/Environment configuration section
to New Profile and Profile Edit.

This feature must model typed profile configuration and translate it
to supported CloakBrowser configuration inside Rust.

Do not allow arbitrary Cloak/Chromium CLI arguments from the frontend.

Architecture

Profile
  -> ProfileDeviceSettings
  -> DeviceConfigResolver
  -> ResolvedDeviceConfig
  -> CloakConfigResolver
  -> CloakLaunchBuilder
  -> ProcessManager
  -> CloakBrowser


P5.1-01

Create migration:

006_profile_device_settings.sql

Create table profile_device_settings containing:

- profile_id
- mode
- fingerprint_seed
- platform

- hardware_concurrency
- device_memory

- screen_width
- screen_height

- gpu_mode
- gpu_vendor
- gpu_renderer

- timezone_mode
- timezone

- locale_mode
- locale

- webrtc_mode

- created_at
- updated_at


P5.1-02

Create Rust domain:

domain/device/

Models:

ProfileDeviceSettings
DeviceConfigurationMode
DevicePlatform
GpuSettings
GpuMode
EnvironmentSetting
WebRtcMode


P5.1-03

Implement DeviceSettingsRepository.

Do not expose SQL to application services.


P5.1-04

Implement automatic fingerprint seed generation.

The seed MUST:

- be generated once when the profile is created
- be persisted
- remain stable across launches
- never regenerate automatically on application restart
- never regenerate automatically on browser launch


P5.1-05

Implement DeviceConfigResolver.

It resolves:

ProfileDeviceSettings
+
Proxy assignment
+
Proxy geo/environment information
+
Cloak runtime capabilities

into:

ResolvedDeviceConfig.


P5.1-06

Integrate resolved device configuration into CloakConfigResolver.


P5.1-07

Extend CloakLaunchBuilder.

Map supported typed settings internally to CloakBrowser.

Support:

fingerprint seed
platform
GPU vendor
GPU renderer
hardware concurrency
device memory
screen width
screen height
timezone
locale
WebRTC configuration

The frontend MUST NOT know or submit raw CLI flags.


P5.1-08

Automatic mode:

Default mode must be Automatic.

In Automatic mode:
- keep a persistent fingerprint seed
- let CloakBrowser derive supported hardware/browser values
- resolve timezone/locale/WebRTC using existing proxy configuration
  where supported
- do not generate arbitrary manual GPU/RAM/CPU values


P5.1-09

Custom mode:

Allow typed overrides for:

- hardware concurrency
- device memory
- screen size
- GPU preset
- timezone
- locale

Use validated values only.


P5.1-10

Create HardwarePreset model.

Do not initially accept arbitrary GPU strings from normal UI.

Use curated presets.

Structure:

HardwarePreset {
  id
  label
  platform
  hardware_concurrency
  device_memory_gb
  screen_width
  screen_height
  gpu_vendor
  gpu_renderer
}


P5.1-11

Implement DeviceConsistencyValidator.

Validate configuration coherence against our preset definitions.

Return typed warnings/errors.

Do not make claims that a configuration is "undetectable" or will
bypass third-party detection systems.


P5.1-12

Extend CloakCapabilities with:

fingerprint_seed
hardware_concurrency_override
device_memory_override
screen_override
gpu_override
timezone_override
locale_override
webrtc_ip_override

Only expose configuration supported by the active runtime version.


P5.1-13

Add Tauri commands:

profile_device_settings_get
profile_device_settings_update
profile_device_settings_regenerate
profile_device_settings_validate
device_presets_list


P5.1-14

Regenerate:

Fingerprint regeneration must require explicit user action.

Do not allow regeneration while the profile is running.


P5.1-15

Integrate device settings into ProfileCreationService.

Profile creation transaction must create:

Profile
Group/tags
Proxy assignment
Browser settings
Device settings
Filesystem

without leaving partial profile state.


P5.1-16

Extend New Profile route.

Tabs must become:

General
Proxy
Platform
Device
Browser
Advanced


P5.1-17

Build Device tab.

UI:

Configuration
  Automatic / Custom

Fingerprint
  Seed
  Regenerate

Platform

Hardware
  CPU cores
  Memory
  Screen

Graphics
  GPU preset
  WebGL summary

Environment
  Timezone
  Locale
  WebRTC


P5.1-18

Update live Overview side panel.

Show:

Platform
CPU
RAM
Screen
GPU
Timezone
Locale
WebRTC
Fingerprint mode


P5.1-19

For Automatic fields display resolved labels such as:

Auto
Based on proxy
Cloak managed

Do not display fake values before they are actually resolved.


P5.1-20

Do NOT add AdsPower-style individual toggles for:

Canvas
WebGL image noise
AudioContext noise
ClientRects noise
MediaDevices noise
SpeechVoices noise

unless the currently pinned CloakBrowser runtime exposes a documented,
versioned, independently controllable API for that signal.

For now these remain Cloak-managed.


P5.1-21

Do NOT add Android/iOS profile options unless the pinned CloakBrowser
runtime officially supports coherent mobile device profiles.

ProfileDock's current target is Windows desktop.


P5.1-22

Extend browser instance config_snapshot_json with non-sensitive device
configuration.

Store:

fingerprint seed
platform
CPU
RAM
screen
GPU preset ID
timezone mode
locale mode
WebRTC mode
Cloak runtime/version

Never store proxy passwords or other secrets.


P5.1-23

Lock device settings while profile browser is running.


P5.1-24

Add activity events:

device_settings_updated
fingerprint_regenerated


P5.1-25

Add tests:

- seed generated on profile creation
- seed survives restart
- seed stays identical between launches
- explicit regenerate changes seed
- cannot regenerate while running

- automatic configuration resolution
- custom configuration resolution

- CPU validation
- RAM validation
- screen validation
- GPU preset validation

- proxy timezone resolution
- locale resolution
- WebRTC resolution

- CloakLaunchBuilder receives resolved values

- frontend cannot inject arbitrary command-line arguments

- config snapshot does not contain proxy credentials


P5.1-26

Windows E2E:

Create Profile A.
Capture exposed device/environment values.
Close browser.
Launch Profile A again.

Verify the configured stable fields remain consistent.

Create Profile B.
Verify it has its own profile configuration.

Test Automatic and Custom modes separately.


Definition of Done

Phase is complete only when:

- profile has persisted device settings
- fingerprint seed persists between launches
- automatic mode works
- custom typed overrides work
- hardware presets work
- consistency validation works
- timezone/locale integrate with Proxy Core
- Cloak capabilities gate unsupported controls
- New Profile Device tab works
- Overview updates live
- runtime launch receives resolved configuration
- device settings are locked while running
- snapshots include non-sensitive device configuration
- cargo test passes
- pnpm check-types passes
- Windows CloakBrowser E2E passes
```

### Thứ tự mình khuyên làm

Đừng bắt đầu từ UI. Cho agent đi:

```text
Migration
   ↓
Domain model
   ↓
Repository
   ↓
Seed generation
   ↓
DeviceConfigResolver
   ↓
Consistency Validator
   ↓
CloakCapabilities
   ↓
CloakLaunchBuilder
   ↓
ProfileCreationService
   ↓
Tauri API
   ↓
React Query
   ↓
Device UI
   ↓
Overview
   ↓
Windows E2E
```

Một điểm mình sẽ **chốt cứng cho ProfileDock**: `Automatic + persistent seed` nên là default; Custom chỉ là advanced configuration. Như vậy bạn tận dụng engine của Cloak thay vì phải tự xây một “fingerprint generator database” khổng lồ như AdsPower, trong khi vẫn có UI quản lý CPU/RAM/screen/GPU/environment gần với trải nghiệm AdsPower. ([GitHub][1])

[1]: https://github.com/CloakHQ/CloakBrowser?ref=genaisecretsauce.com&utm_source=chatgpt.com 'GitHub - CloakHQ/CloakBrowser at genaisecretsauce.com · GitHub'
[2]: https://github.com/CloakHQ/CloakBrowser/blob/main/js/README.md?utm_source=chatgpt.com 'CloakBrowser/js/README.md at main · CloakHQ/CloakBrowser · GitHub'
[3]: https://github.com/CloakHQ/cloakbrowser/issues/40?utm_source=chatgpt.com '[Bug] Fingerprint seed has no effect on Windows — canvas, WebGL, audio, client rects identical across seeds · Issue #40 · CloakHQ/CloakBrowser · GitHub'
