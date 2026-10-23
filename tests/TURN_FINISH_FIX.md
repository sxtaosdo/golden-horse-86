# 转弯与游戏结束修复 · 2026-10-23

状态：本轮两项Bug修复已验证，未发布；整体原版复刻仍未最终验收。

## 原因与改动

旧背景按全局时间切段，各匹马却按不同完赛时间切自己的路段；弯道中点角度跳64–66度，脚点也未对齐跑道。现使用公共赛段时间，名次差在段内表现；最后直道按各马真实完赛时间穿线。弯道路面和脚点共用bendPoint几何，马匹以脚底锚定，并按脚点排序遮挡。侧面Sprite在方向切换时淡至不可见，由正/背面的2D图覆盖，消除猛翻。实际回看还发现Sprite透明度影响子转向图，已改为SideFacing与TurnFacing同级，并重录验证。

旧结果帧强制将全部progress置1，再按名次改x，导致瞬移；下局仍持有上局lastResult。现所有马实际越过终点后才结算，保留到达位置，结算后不再改位；下一场清空lastResult。面板显示冠亚军、六马全名次、组合、本局押分与返分，按钮在比赛中/结果分别显示「比赛中」/「下一场」。

## 身份与源码

- 工程：D:/code/shidai3/P4000/golden-horse-86；projectId：9d8a0041f7873b81。
- Creator 3.8.8；会话：185c944a-6ff0-4d27-9909-cc9fce8f654e。
- Preview：http://192.168.31.100:7456；场景：db://assets/GoldenHorseGame.scene。
- 基线提交：c3d1f415ed0e6cdd3a16070ff9618e9e1d666886；本轮实际运行源码身份见turn-finish-source-sha256.json。
- 全部Creator操作经Cocos-MCP，显式绑定本工程；由AssetDB刷新后官方Preview reload，再用Playtest实际输入。未手改scene/prefab/meta。
- 初始工作树已有assets/.meta删除，Creator刷新后自动再生为变更；本轮不暂存/提交该既有路径，不清理或覆盖它。

## 验证与观察

先新增RacePresentation回归，在旧代码上复现脚点不在跑道的失败，再修复。最终strict类型检查、RaceModel、TrackVisual、RacePresentation均通过。回归覆盖弯道内外边界、中点方向切换时侧图透明度、各马与背景同段、实际穿线次序、结算只返一次、结果位置保持和新局清空奖金。

实际运行使用turn-finish-playtest.json：首局15次真实点击押全部组合、Enter开跑，截图两处弯道中点和首次冲线，等待六匹马完成后观察结算，真实点击「下一场」，断言新局result=null、BET0/WIN0，再实际押分并跑完第二局。测试桥sampleFrame只观察真实节点，不改时间或赛果。

| 项目 | 第一局 | 第二局 |
|---|---|---|
| 可见冲线次序=结算全名次 | 1→6→3→4→2→5 | 1→5→6→3→2→4 |
| 实际穿线数 | 6 | 6 |
| 背景路段错配 | 0 | 0 |
| 切入结果时最大位移 | 0.3627px以内 | 0.3670px以内 |
| 结果停留漂移 | 0 | 0 |
| 本局押分/返分/余额 | 15 / 10 / 495 | 1 / 0 / 494 |

turn-finish-result.json为PASSED；控制台错误、页面错误、请求失败、HTTP错误均0。人工回看两处弯道中点，6匹马均可见；已查看结算、实际冲线和下一局截图，不以流程通过替代目视检查。

## 真实录像与证据

- actual-turn-finish-fix.webm：真实Preview Canvas的captureStream/MediaRecorder原始采集。
- actual-turn-finish-fix.mp4：原始录像转码，H.264，960×712，38.566667秒，无声；没有生成或补绘比赛帧。
- evidence/turn-finish-fix/：真实截图和从MP4解码的recorded-turn-frame.png，已目视确认内容。
- 首次录制发现透明度级联Bug，修复后重新录制，当前报告和录像均为修复后的结果。刷新后一次导航竞争使Playtest返回execution context destroyed；等待导航完成后从初始化页面重新运行通过。

## 审查

- code-mapper /root/map_local_project：只读定位两种进度、方向跳变、坐标基准及结算瞬移根因。
- reviewer /root/review_2d_runtime：首次发现新增模型import破坏遗留网页拼接生成器，已处理该唯一内部依赖并重生成，既有preview_smoke通过；复审核对代码、两处中点截图、实际报告和录像，无新增阻断项。
- 两角色均未操作Creator；有效运行隔离权限未核验。OCR Delegation Mode按父仓共享规则作宿主审查，含全部本轮源码/测试/生成器改动；未审既有工具bundle等范围外内容。

原版逐帧一致性、完整框架/静态UI接入及正式Build/Smoke仍属于整体项目未完成项，不以本轮Bug修复通过替代。
