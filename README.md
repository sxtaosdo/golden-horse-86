# 黄金赛马86 · 本地复刻工程

**当前版本：`v0.3.0.16`**

状态：开发中。750×1334手机竖屏与r02美术已接入并完成多局实跑；Web Mobile正式构建与本地单局产物Smoke通过，完整原版复刻尚未验收。

Owner：当前用户；引擎：Cocos Creator 3.8.8 + TypeScript strict。所属目录：shidai3/P4000。

## 项目背景

产品定位：《霓虹荒野：黄金赛马》，世界内赛事为补给驿站举办的“驿站杯”。玩家是普通旅人，以活动积分预测六匹马的前二组合。完整背景、玩法映射及P0001引用边界见[产品背景](docs/BACKGROUND.md)。该方向已获Owner接受，仅用于本产品，未晋级共享Canon。场景现已加入补给棚、货车、货箱与观众。

## 打开运行

通过Cocos-MCP/Dashboard打开本目录，再打开 `assets/GoldenHorseGame.scene` 并预览。Canvas、正交相机和游戏组件已保存，无需手工挂载。遗留 `Main.scene` 仍是原型3D场景，不作为入口。

本机工程：D:/code/shidai3/P4000/golden-horse-86；Cocos-MCP projectId：9d8a0041f7873b81；Creator安装：C:/ProgramData/cocos/editors/Creator/3.8.8。所有Creator操作统一通过Cocos-MCP；禁止手改.scene、.prefab和.meta。

750×1334手机设计基准，上方比赛、下方15组合三角倍率表。触摸组合押1分，打开“撤销”后触摸减1分；独立清空、历史、开跑/下一场按钮。准备起跑和比赛中倍率表保留并锁定押分。点击右侧“选择赛事”，按本场可用积分选择驿站赛（0）、地区赛（1000）或冠军赛（3000），对应4/8/12类设备（冠军赛含六格动态闸箱）；不收参赛费，下一场重新定档。手动或自动开跑均有3秒准备；冠军赛的大屏转播当前赛场并显示本场冠亚军。桌面仍支持右键撤销、C清空、Enter/空格开跑及下一局；F8+F9添加测试积分。加载完成前不开放比赛。全部为本地虚拟积分。

## 本轮验证

2026-10-24优化轮：按[执行记录](docs/UPGRADE_PLAN.md)分切片推进；V1连续争位已通过种子/帧率/冲线回归与73步真实Preview，后续切片与阶段构建按实际状态记录。[优化验收](tests/UPGRADE.md)。

2026-10-24赛前演出轮：每场三选一广角、六马独立待机/准备、旗手动作、加注回弹、设备扫视和分档氛围音已接入；准备前2秒收回原近景、最后1秒稳定。三镜头×三手机尺寸、手动/自动开跑、四局真实冲线、正式Web Mobile同包Smoke与同页尺寸切换通过。音频触发与清理通过，听感未验。[验收记录与三镜头实录](tests/PRE_RACE.md)，[美术与提示词](art/final/gameplay/r09/README.md)。本地未发布。

2026-10-24遮挡轮：修复起跑闸箱与马匹的前后关系，近侧栏杆遮挡对应马匹下肢，更近车道的马覆盖后方栏杆；七条共享边界与马匹按脚点统一排序，开门时序保持。验收见[起点遮挡记录](tests/GATE_OCCLUSION.md)。

2026-10-24节奏轮：重新查看86版连续实录，比赛改为出闸提速、弯道控制节奏、出弯再加速；步态随实际路程连续变频。近景布局、原定完成时刻、排名及返分保持；观察与演出参数见[节奏合同](docs/RACE_PACE.md)，本地实跑与构建见[节奏验收](tests/RACE_PACE.md)。

2026-10-24近景轮：按Owner反馈把马匹与赛道放大约2～2.67倍，只取当前赛道与两侧近邻环境；起跑/弯道保留六马，终点逐匹显示过线。当前版本画面与构建记录见[近景验收](tests/CLOSE_RACE_VIEW.md)。

2026-10-24动态设备轮：静态基座与动态部件分离；摄像机方向帧跟随赛中真实领跑者，警灯状态帧按阶段切换，冠军赛六格起跑闸箱随开跑同步打开。三个手机尺寸实际Preview、完整冠军赛实录及正式产物Smoke通过。资源分层与验收见[动态设备记录](tests/DYNAMIC_EQUIPMENT.md)。

2026-10-24设备轮：赛事分级、11类独立PNG、准备倒计时与同世界直播屏接入；三档×三手机尺寸、四局真实Preview及最终Web Mobile产物Smoke通过，运行诊断错误0；实现合同见[赛事与设备](docs/EVENT_EQUIPMENT.md)，资源与最终运行记录见[设备验收](tests/EVENT_EQUIPMENT.md)。本地未发布，产品远端仍未配置。

2026-10-23构建轮：经本工程Companion完成非debug Web Mobile构建，仅打包GoldenHorseGame.scene；修复本机派生导入缓存损坏后，390×844实际产物通过触摸押分、比赛、结算、离场及下一局Smoke，页面诊断四类错误计数均为0。正式产物未注册Preview测试桥，本轮未自动断言冲线排序与单次返分。配置、产物哈希、截图和限制见[构建验收记录](tests/WEB_MOBILE_BUILD.md)。未发布。

2026-10-23手机与素材轮：固定UI经Cocos-MCP组装保存并重开，144帧马匹（三种原画方向×8步态×六色）与12类场景道具已加载。号码独立显示；方向图保持不透明，避免斜向与正面叠图重影。一个持续U形世界保留起跑直道、唯一弯道、反向终点与冲线后离场；最终多局报告、实录及手机尺寸结果见[手机验收记录](tests/MOBILE_R02.md)。

下述960×660布局与旧素材录像为历史验证，不代表当前手机版本。

2026-10-23：按新取得的实机录像将赛程改为向右起跑→唯一弯道→向左冲线。押分采用三角组合表；开跑后隐藏押分表并显示960×660完整比赛区域，结束叠加大号冠亚军号码，下一场返回押分与历史记录。

本轮真实鼠标/键盘完成两局，冲线顺序均与结算一致、返分一次、六马离场、新局清空通过，运行错误0。[完整65.2秒实录](tests/actual-single-bend.mp4)（无声）；关键截图保存在tests/evidence/single-bend，详见 [本轮验证](tests/SINGLE_BEND.md)。上一轮两弯录像仅保留为历史，不能证明原版赛程正确。

页面消费extensions/shidai3正式submodule中的StateMachine，钉住39f168e；首次检出需初始化子模块。当前工程已本地初始化并经Creator重新打开验证。

以下是首次运行接入的历史验证；当时只确认流程，没有覆盖弯道显示和结算瞬移，不能用来证明这两项正确。

修复倾斜透视相机、缺少Canvas、错误UI层和画面裁切；修复PNG被导入为Texture但代码按SpriteFrame加载造成的空白赛道/马匹；增加加载进度及失败提示。strict类型检查通过，并修复start方法与引擎生命周期冲突。

真实Creator Preview加载24帧马匹、5张背景、7个音效；通过真实鼠标点击、C清空、Enter开跑连续完成三局，经历直道、两次弯道、对向直道与终点，运行诊断无错误。

[三局真实运行MP4](tests/actual-preview-three-rounds.mp4)：54.9秒，无声。原始采集为 tests/actual-preview-three-rounds.webm。录像直接来自Creator Preview Canvas，不是独立HTML原型或示意动画。报告：tests/three-rounds-result.json；证据与限制：tests/VERIFICATION.md。

## 未完成条件

原YouTube参考仍未取得；已取得并查看搜狐86版实机录像，画面差异与来源见docs/RESEARCH.md。当前固定赔率、独立随机排名、特殊奖励规则、比赛精确节奏、音轨与原版像素仍未完成一致性验证。既有PNG/WAV为原型自制，新赛道及起跑元素为本项目代码绘制，仍不能称为原版1:1。

页面StateMachine已接入，手机固定UI已保存到场景；完整框架表现能力与外置玩法规则配置仍需完善。遗留Main场景不作为入口；Web Mobile本地产物已完成上述单局Smoke，其他平台和发布仍未验收。音效加载成功不等于听感通过，当前录像没有音轨。

本轮为真实运行修复切片，不作为完整复刻项目最终交付。后续继续依据已取得的录像校对玩法与表现，未从视频推断原机赔率算法。

## 来源与仓库

接续自 C:/Users/33272/Downloads/golden_horse_86_cocos388_v0.3.0/golden_horse_86_cocos388，保留原目录。本地独立Git已初始化；远端等待Owner提供，不向父仓提交产品源码。

主要代码：assets/scripts/RaceModel.ts（规则）、TrackVisual.ts（路径）、GoldenHorseGame.ts（表现与输入）。assets/tests/GoldenHorseTestBridge.ts仅在PREVIEW注册，不推进模拟时间或改写结果。tests/保存测试与真实运行证据；docs/RESEARCH.md记录原型假设；preview-web/是遗留独立浏览器原型，不作为Creator验收证据。

npm install后可运行npm run test:core。Creator生成temp类型配置后，用npx tsc -p tsconfig.json --noEmit --skipLibCheck执行strict检查。更新见CHANGELOG.md。
