# 黄金赛马86 · 本地复刻工程

**当前版本：`v0.3.0.7`**

状态：开发中。750×1334手机竖屏与r02美术已接入并完成多局实跑；完整原版复刻尚未验收。

Owner：当前用户；引擎：Cocos Creator 3.8.8 + TypeScript strict。所属目录：shidai3/P4000。

## 项目背景

产品定位：《霓虹荒野：黄金赛马》，世界内赛事为补给驿站举办的“驿站杯”。玩家是普通旅人，以活动积分预测六匹马的前二组合。完整背景、玩法映射及P0001引用边界见[产品背景](docs/BACKGROUND.md)。该方向已获Owner接受，仅用于本产品，未晋级共享Canon。场景现已加入补给棚、货车、货箱与观众。

## 打开运行

通过Cocos-MCP/Dashboard打开本目录，再打开 `assets/GoldenHorseGame.scene` 并预览。Canvas、正交相机和游戏组件已保存，无需手工挂载。遗留 `Main.scene` 仍是原型3D场景，不作为入口。

本机工程：D:/code/shidai3/P4000/golden-horse-86；Cocos-MCP projectId：9d8a0041f7873b81；Creator安装：C:/ProgramData/cocos/editors/Creator/3.8.8。所有Creator操作统一通过Cocos-MCP；禁止手改.scene、.prefab和.meta。

750×1334手机设计基准，上方比赛、下方15组合三角倍率表。触摸组合押1分，打开“撤销”后触摸减1分；独立清空、历史、开跑/下一场按钮。比赛中倍率表保留并锁定押分。桌面仍支持右键撤销、C清空、Enter/空格开跑及下一局；F8+F9添加测试积分。加载完成前不开放比赛。全部为本地虚拟积分。

## 本轮验证

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

页面StateMachine已接入，手机固定UI已保存到场景；完整框架表现能力与外置玩法规则配置仍需完善。遗留Main场景、正式构建及产物Smoke未验收。音效加载成功不等于听感通过，当前录像没有音轨。

本轮为真实运行修复切片，不作为完整复刻项目最终交付。后续继续依据已取得的录像校对玩法与表现，未从视频推断原机赔率算法。

## 来源与仓库

接续自 C:/Users/33272/Downloads/golden_horse_86_cocos388_v0.3.0/golden_horse_86_cocos388，保留原目录。本地独立Git已初始化；远端等待Owner提供，不向父仓提交产品源码。

主要代码：assets/scripts/RaceModel.ts（规则）、TrackVisual.ts（路径）、GoldenHorseGame.ts（表现与输入）。assets/tests/GoldenHorseTestBridge.ts仅在PREVIEW注册，不推进模拟时间或改写结果。tests/保存测试与真实运行证据；docs/RESEARCH.md记录原型假设；preview-web/是遗留独立浏览器原型，不作为Creator验收证据。

npm install后可运行npm run test:core。Creator生成temp类型配置后，用npx tsc -p tsconfig.json --noEmit --skipLibCheck执行strict检查。更新见CHANGELOG.md。
