# 本轮本地运行验证 · 2026-10-23

历史记录：本次首次接入检查后来被发现没有覆盖弯道显示、脚点贴合和结算瞬移，不能作为这些行为正确的证据。用户反馈后的修复与新验收以 [TURN_FINISH_FIX.md](TURN_FINISH_FIX.md) 为准。

状态：运行修复切片通过；完整复刻未验收。

## 身份与源码

- 工程：D:/code/shidai3/P4000/golden-horse-86。
- Cocos-MCP projectId：9d8a0041f7873b81。
- Creator：3.8.8；Dashboard：2.2.2；启动来源：dashboard。
- Creator sessionId：185c944a-6ff0-4d27-9909-cc9fce8f654e；PID：23028。
- Preview：http://192.168.31.100:7456。
- 场景：db://assets/GoldenHorseGame.scene；MCP事务1792734813814-6ac5cb3a8ab51；保存回读revision：rev-5c4d534d。
- 本轮验证时为新导入的本地工作树，尚无产品commit；assets及tsconfig内容身份见source-sha256.json。验证后建立本地初始提交，远端尚未配置。

Creator生命周期、场景操作、资源刷新、Preview启动/刷新、截图和Playtest全部经Cocos-MCP Companion CLI，显式绑定本项目。未操作其他Creator工程，未手改scene/prefab/meta。没有依赖焦点切换自动刷新，而是执行官方MCP preview reload；资产刷新后才开始测试。

## 已通过

- TypeScript strict全量源码检查（使用本机已有TypeScript编译器和Creator生成的类型声明，skipLibCheck只跳过依赖声明检查）。
- RaceModel.test.cjs：押分、撤销、锁定押分、组合模式、倒计时与中奖结算。
- TrackVisual.test.cjs：600余路径采样、连续性、双弯道、对向直道和完整赛程。
- preview-probe.json：24帧马匹、5张赛道背景、7个音效全部加载；pendingAssets=0，loadErrors为空。
- three-rounds.json：实际鼠标点击押分，C清空退款，Enter开跑，比赛中追加押分被拒绝，两次弯道/对向直道截图，连续三局结果与下一局。最终round=3、historyLength=3、credits=497。
- winning-payout.json：页面重载初始化后，通过15次真实鼠标点击押全部组合，再Enter比赛；赛果2-3，赔率12，押分15，返分12；500-15+12=497，与真实UI及模型一致。
- 三局与独立中奖测试的consoleErrors、pageErrors、requestFailures、httpErrors均为0。

报告：three-rounds-result.json、winning-payout-result.json；截图：evidence/及creator-preview.png。

## 实际运行录像

- actual-preview-three-rounds.webm：直接使用真实Preview的canvas.captureStream与MediaRecorder采集，12,241,698字节，VP8，960×711。
- actual-preview-three-rounds.mp4：从上述原始视频转码，H.264，960×712，54.9秒，11,233,038字节；仅补齐偶数高度，没有生成或补绘比赛画面。
- 录像没有音轨。7个音效的资源加载通过，但未完成可听音轨/听感验收。
- 没有推进模拟时间、修改赛果或把遗留preview-web当Creator运行证据。

## 发现与修复

初次真实截图发现Canvas缺失、倾斜透视相机和3D节点层；通过MCP创建Canvas并修复。第二次发现PNG仅存在texture子资源，旧spriteFrame加载路径导致空白；改为Texture2D创建SpriteFrame并通过36项加载观察验证。开启strict后发现私有start与Component生命周期冲突，已改名。

独立中奖补测首次失败是测试依赖已关闭页面的round=4状态，报告说明reusedPage=false；改为页面重载初始化后独立运行通过（reusedPage=true、pageReset=reload），未修改游戏来迎合测试。

## 审查与未验证项

- code-mapper：/root/map_local_project，只读定位P4000和MCP入口，已返回。
- reviewer：/root/review_2d_runtime，只读检查本轮2D场景、加载、strict与测试桥，无确认阻断代码问题；要求补实际输入与新截图，本轮已完成。有效隔离权限未核验，不冒称已证明运行隔离。
- OCR Delegation Mode已解析父仓共享规则并用于宿主审查；规则解析不等于代码验收。对本轮两个TS、tsconfig和场景共4个改动文件进行审查；既有原型及资源并非本轮全部重审。
- 原版逐帧画面/音轨仍不可访问；原版规则、赔率和外观一致性未验收。相关路径、框架与静态UI合规整改、遗留Main场景及正式Build/Smoke均未验收。
- 右键撤销的模型测试通过，实际右键事件未单独实测；当前Playtest输入协议未提供右键按钮参数。

这些通过项不代表完整复刻完成，也不构成发布验收。
