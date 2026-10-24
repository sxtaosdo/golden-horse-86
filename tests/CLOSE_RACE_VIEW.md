# 赛道近景验收

状态：Accepted；2026-10-24。本地实现及验收完成，未发布。Owner要求放大马匹，只显示当前赛道及两侧少量内容。本记录覆盖最终取景；此前[动态设备记录](DYNAMIC_EQUIPMENT.md)保留为前一阶段证据。

## 最终表现

比赛区改为按可用宽高计算近景倍率，并上移视线；390×844、430×932的赛场比例为2.08333，较此前0.78125放大2.67倍；360×640为1.55214，放大约1.99倍。倍率表、按钮与玩法保持原尺寸。只取当前赛道和邻近草边、栏杆与设备；远处设施及大屏可以部分或全部移出窗口。

起跑与弯道六马完整入镜；返程直道保留近景，队列拉开时马匹自然进出画面，每匹实际冲线时完整可见，之后继续跑离。没有为了显示全场而在终点缩回远景。摄像机位置调为(330,625)，安装点(330,565)，距离柱缩小并移到边缘。冠军赛仍有六格闸箱，押分及准备闭门、开跑同步打开、下一场关闭。

## 代码与自动验证

`RaceTrackView`与`MobileLayout.raceFraming`共同使用同一投影；模型轨迹、排名、返分没有更改。`MobileArtwork.test.cjs`按实际马匹帧尺寸、脚点和镜像覆盖四种设计高度的起跑、弯道与六匹冲线边界。Preview桥新增只读clippedFinishers计数，以保守的左右100、脚点上方150世界单位检查真实冲线时是否被比赛窗口或顶部HUD截断。

最终`npm run test:core`与严格TypeScript检查通过；此前动态设备阶段的`npm test`已通过，未变化的旧网页Smoke结果复用。新增方向帧、门扇时序、实时领跑getter及非法资源校验见动态设备记录。

## 实际Creator Preview

工程`D:/code/shidai3/P4000/golden-horse-86`，projectId `9d8a0041f7873b81`；Creator3.8.8，revision `close-track-r06-v2`。三种尺寸都完整跑至结算、自然离场和下一场。

| 尺寸 | 赛事 | 步数 | 实际冲线 | 裁切计数 |
|---|---|---:|---:|---:|
| 360×640 | 地区赛 | 45 | 6 | 0 |
| 390×844 | 冠军赛 | 90 | 6 | 0 |
| 430×932 | 冠军赛 | 67 | 6 | 0 |

共202步通过，console/page/request/HTTP四类诊断均0。三个报告的可见冲线顺序与模型结果一致，worldId保持且paintBuilds为1。赛中更新后的get_state采样确认机头目标等于实时进度最大者、实际SpriteFrame与方向状态一致；六格门同步且阶段正确，390/430下一场重新关闭。390还验证降档后动态节点及广播清理。即时命令快照可落在下一表现更新之前，因此机械核对只使用更新后的get_state。

[机械核对摘要](close-race-summary.json)包含截图、状态与结果；原始报告为close-race-360/390/430-result.json。截图：[近景起跑](evidence/close-race/close-open-390.png)、[近景弯道](evidence/close-race/close-bend-390.png)、[360尺寸](evidence/close-race/close-betting-360.png)、[430尺寸](evidence/close-race/close-open-430.png)。

实际Canvas录屏：[6.55秒MP4](evidence/close-race/close-preview.mp4)，[原始WebM](evidence/close-race/close-preview.webm)，390×844、无声，覆盖准备至开门初期；仅转码，没有插入示意动画，不作为整局或音效证据。

## 最终Web Mobile构建

[构建状态](close-race-build-status.json)：非debug，state=passed、builderFinished=true、runnerExitCode=36。packageHash：`fd6f9e1619f65ec5ee883c6d436c88489a7752f3d8bd881b60bafd3d16ec8cfc`。

[实际产物Smoke](close-race-build-smoke-result.json)绑定同一packageHash，49步中48执行，最后可选runtime_snapshot跳过；gameTestReady=false，四类诊断0。生产产物未注册Preview测试桥，因此自动排序、目标与冲线断言来自上述Preview，不归于产物Smoke。

主会话目视核对产物截图：3200分冠军赛六格闭门；准备倒计时后开门起跑，马匹近景填满赛道，栏杆与花边只保留少量；本局结果1/2、返分0，赛马继续向左跑离，下一场3199分六格重关。终点大屏部分进入窗口，屏内显示冠军1；紧凑取景不要求整块屏同时完整可见。

产物截图：[闭闸](evidence/close-race/build-close-betting.png)、[比赛](evidence/close-race/build-close-live.png)、[结算](evidence/close-race/build-close-result.png)、[下一场](evidence/close-race/build-close-next-round.png)。当前构建来自未提交工作树；构建报告的旧HEAD不能代表本次改动，26项关键源文件字节SHA-256记录在[源码记录](close-race-source.json)，构建开始后未再修改Runtime源码。

## 审查与边界

真实reviewer任务`/root/horse_build_review`已对近景增量执行只读OCR Delegation及宿主审查，未报告阻断项；核对投影一致性、实际帧最大包围盒、真实冲线计数与四高度边界。此前动态设备审查发现的重复资源名问题已修复并复测。有效权限隔离未核验。该任务收尾复核202步原始报告、26项源码哈希、同包Smoke、七张产物截图及录屏，无新增发现；确认范围外脏项未暂存。

本地无远端，交付为本地提交；未部署，其他平台、音效听感、干净检出构建未验收。既有h01样稿、框架派生meta、cocos-service、旧continuous-course两图与assets/.meta脏项不纳入本次提交，没有手写scene/prefab/meta。资源原图、完整提示词与分类见[r06资源目录](../art/final/gameplay/r06/README.md)。
