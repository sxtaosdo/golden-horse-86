# 连续赛道与结束验证

状态：本次修复已本地验证，未发布；完整原版复刻未验收。

日期：2026-10-23。工程：P4000/golden-horse-86；Owner：当前用户；Creator 3.8.8 + TypeScript。修复基线：b9bba2a9429ab004dcd2f1a030b03551e84999ae。

## 根因与修改

用户指出上一录像约第3秒至第5秒出现画面切换。旧代码按直道、弯道、对向直道切换背景图；此前“错段0”只能证明两者同时换段，无法证明画面连续。当前删除该路径，使用同一ContinuousRaceWorld，轨道只绘制一次，马匹、终点与轨道共用世界变换，通过固定960×334的2D Mask跟随观察。路径连接与参考车道速度连续，摄像跟随共同赛程。

旧实现将完赛者限制在终点附近，结果阶段停止推进，造成扎堆停住。当前按世界坐标马鼻穿过终点记录次序，结果阶段继续自然跑出窗口；结算面板放在押分区域，不遮挡跑道。结果返分仅一次，下一局清空旧结果。旧“resultDrift=0”不再作为验收标准，继续移动是预期行为。

## 实际Creator证据

所有Creator启动、Preview、测试和录制导出均经Cocos-MCP，未手改场景/Prefab/Meta。

- projectId：9d8a0041f7873b81；session：185c944a-6ff0-4d27-9909-cc9fce8f654e。
- Preview：http://192.168.31.100:7456；场景：db://assets/GoldenHorseGame.scene。
- 输入脚本：[continuous-course-playtest.json](continuous-course-playtest.json)；实际报告：[continuous-course-result.json](continuous-course-result.json)，PASSED，console/page/request/http错误均0。
- 两局均worldId=Node.940，worldPaintBuilds=1、worldChanges=0。
- 第一局实际穿线顺序3→1→5→6→2→4，等于结算；押15、返4、余额489。第二局5→6→2→1→3→4，等于结算；押1、返0、余额488。
- 每局结算后等待6秒，摄像保持终点位置(960,715)，六匹马均完全离开Mask，余额不重复增加；真实点击下一场后清空上一局结果并完成第二局。
- [完整实际录像](actual-continuous-course.mp4)：50.863秒，原始Canvas MediaRecorder文件为actual-continuous-course.webm。MP4只转码，未合成游戏画面。[前8秒](continuous-turn-first-8s.mp4)由同一真实录像截取。
- 主会话查看实际录像3秒、5秒截图与清场截图，见evidence/continuous-course。前后帧可见连续世界中不同位置的弯道；背景资源切换代码已删除。逐帧的艺术质量不由worldChanges计数单独证明。
- 录像无音轨，不能证明音效听感；目前转弯马匹正/背面仍是近似表现，不能宣称与原版1:1。

## 自动验证与审查

TypeScript strict无输出错误。RaceModel、TrackVisual、RacePresentation定向测试通过，覆盖连接位置/参考速度、六车道边界、马匹方向过渡、世界终点穿线顺序、结算继续跑动、6秒后清场、返分一次和新局重置。遗留网页重生成及Smoke通过；独立网页不作为Creator验收来源。

真实只读角色：/root/critic_turn_finish诊断旧背景换段/终点夹停问题；/root/review_2d_runtime审查当前源码与模型（60/30/10 FPS），未发现确认的阻断缺陷。该角色随后核对最终报告、3秒/5秒帧、清场截图及ffprobe，确认本次证据支持连续赛道与离场修复，无新增阻断发现。主会话负责最终验收判断。

OCR Delegation Mode显式使用父仓.opencodereview/rule.json执行preview/rule，并由宿主检查本次源码、测试、网页生成物及输入/报告。初始27项：12项本次文本全覆盖；assets/.meta为既有Creator变动，范围外跳过1项；14项视频/图片不适用文本规则，采用真实录制来源核对、ffprobe及代表帧人工检查。文本任务覆盖12/12=100%，不是27项均经文本审查。规则检查命令成功本身不算审查结论。新增文档和哈希清单另作交付核对；未发现本次范围内确认的阻断问题。

源码指纹：[continuous-course-source-sha256.json](continuous-course-source-sha256.json)，覆盖实际验证时assets内容，排除既有assets/.meta变动。历史验证保留供追溯，不能替代本记录。
