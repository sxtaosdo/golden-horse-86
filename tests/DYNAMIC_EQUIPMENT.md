# 动态设备与冠军赛起跑闸箱

状态：Accepted；2026-10-24。落实Owner关于静态/动态资源的修正，以及将起跑闸箱放入二/三级赛事的追加要求。本轮选冠军赛，设备档位现为4/8/12类；未发布。

本记录保留紧凑取景前的动态设备验证；Owner随后要求放大赛道，当前取景及最终构建以[近景验收](CLOSE_RACE_VIEW.md)为准。

## 行为与素材

- 摄像机由固定支架和八向机头组成，按当前`progress`选实时领跑马，再用赛道坐标计算朝向；以180°/秒上限转向，换方向帧时安装点固定。新场次在下一表现更新复位；不读取预抽名次、不推进模拟、不改变主比赛视点或排名/返分。
- 警示灯只切换灯头的灭/亮帧，灯柱固定；准备期按0.5秒周期闪烁，比赛亮灯，其他阶段灭。大屏继续使用静态屏框与动态内容。
- 冠军赛加入六格起跑闸箱，对应六匹马的初始脚点，栏架固定；押分/准备关闸，比赛开始后约0.3秒同步打开，下一场关回。静态设施与驻车车辆继续使用单图。
- [r06资源分层](../art/final/gameplay/r06/README.md)登记五张独立PNG、原图/final/Runtime副本与SHA-256，完整提示词保存在`art/work/gameplay/r06/`。摄像机NE由NW源格镜像；门扇不采用生成稿的倾斜中间格，以闭门侧缘和严格侧视开门格形成四个水平投影状态，固定铰链与门高。没有编辑原图像素或把整座闸箱做平面旋转。
- 新部件JSON在Loading校验，包含帧数量、尺寸/裁切、安装点和唯一资源名；失败不创建玩法模型或测试桥。设备换档/销毁清理表现节点，图片帧由既有资源Owner统一持有。

## 自动验证

`npm test`及最终`npx tsc -p tsconfig.json --noEmit --skipLibCheck`通过。镜头位置为适配小屏上移后，仅补跑受影响资源边界测试与以下实际画面验证，未重复未变化的玩法全量验证。

新增`EquipmentMotion.test.cjs`覆盖八个朝向、跨0°最短转向、有限转速、新场次复位、真实领跑getter不调用RNG、警灯阶段/闪烁、门扇四帧时序和复位、坏帧/重复资源拒绝、原图/final/Runtime哈希及alpha。既有事件、排名/返分、单弯轨迹、生命周期和旧网页Smoke均通过。

## 实际Creator Preview

绑定工程`D:/code/shidai3/P4000/golden-horse-86`，projectId `9d8a0041f7873b81`，Creator3.8.8，session `f8eeb444-cc5e-4768-9b63-cf1825b747cc`。本机Creator关闭后，经绑定CLI从Dashboard重新打开并显式打开GoldenHorseGame.scene；没有操作其他工程。以下为最终位置配置下的报告，校准probe不计最终覆盖。

| 报告 | 实跑范围 | 步数 |
|---|---|---:|
| dynamic-equipment-360-result.json | 360×640地区赛；无大屏时摄像机和警灯正常更新，闸箱缺席 | 31 |
| dynamic-equipment-390-result.json | 390×844完整冠军赛；闭闸、准备闪灯、同步开门、实时领跑者切换、结算、下一场闭闸、降为静态档清理 | 90 |
| dynamic-equipment-430-result.json | 430×932冠军赛；六格位置、准备和开门、方向帧 | 53 |

共174步通过，四类console/page/request/HTTP诊断计数均为0。[机械核对摘要](dynamic-equipment-summary.json)确认：

- 赛中更新后的定向采样中，摄像机目标均等于该次六马实际进度的最大值；样本目标包含1、2、3、6号，实际绑定的SpriteFrame索引包含0、1、2、4、5，均与表现状态一致。其余朝向由八向边界单测覆盖。
- 摄像机固定脚点始终为(330,580)，安装点为(330,520)；警灯灯柱位置固定，准备期实测灯头0/1均出现。摄像机上移后，小屏开跑前及初期能看到机头；跟随赛场后设备自然移出窗口。
- 六格脚点为x390、y320/280/240/200/160/120，门扇始终同帧；押分/准备为0、开跑后为3、结果保持打开，下一场仍在冠军档时全部复位0。降为驿站赛后camera/signal/gate集合均为空，广播释放。nextRound指令的即时快照可以保留上一表现帧；下一更新及本轮100ms后采样已完成相机和门的复位。
- 完整冠军赛六马可见冲线顺序与模型结果一致，赛道worldId保持，没有重建赛场。此局押注未命中；中奖及单次返分由确定性单测覆盖。

实际截图：[闭闸](evidence/dynamic-equipment/r06-closed-390.png)、[开闸](evidence/dynamic-equipment/r06-open-390.png)、[下一场关回](evidence/dynamic-equipment/r06-reset-390.png)、[360地区赛](evidence/dynamic-equipment/r06-open-360.png)。

完整无声Canvas实录：[35.35秒MP4](evidence/dynamic-equipment/r06-preview.mp4)，原始录制[WebM](evidence/dynamic-equipment/r06-preview.webm)。录制来自实际Preview，MP4仅转码，未改时间或插入示意动画；不证明音效听感。门扇中间过程较短，以实录和定向时序单测共同验证。

## 正式Web Mobile产物

[构建状态](dynamic-equipment-build-status.json)：非debug，builderFinished=true、state=passed、runnerExitCode=36。构建记录的sourceRevision为此前HEAD `43cf9688d6b4bf4a5c5afcc3233367842570a406`；本次构建来自未提交工作树，关键源文件字节哈希见[源码记录](dynamic-equipment-source.json)，不能只用此前HEAD代表本次功能。

产物packageHash：`7d3c0f37619eef9396d71d67c55ddadce123ccfbb465389201b2298d5e870719`。最终[Smoke原始报告](dynamic-equipment-build-smoke-result.json)与构建哈希一致，49步中48步执行、最后可选runtime_snapshot跳过，gameTestReady=false，四类诊断均0。脚本先真实点击画布聚焦再使用既有F8+F9测试积分键。

主会话目视实际产物确认：3200分冠军赛有六格闭闸，准备倒计时，开跑后开门、机头朝向变化、实时大屏；本局冠亚军4/3且返分0，下一场3199分仍为冠军赛，六门重新闭合。正式产物未注册Preview桥，不声称自动排序、返分或目标编号断言。

产物截图：[闭闸](evidence/dynamic-equipment/build-r06-betting.png)、[开跑](evidence/dynamic-equipment/build-r06-live.png)、[下一场](evidence/dynamic-equipment/build-r06-next-round.png)。未部署；其他平台、音效听感、干净检出重建仍未验收。已有未跟踪h01样稿及框架派生meta的检出限制沿用[此前记录](WEB_MOBILE_BUILD.md)，本轮不混入这些文件。

## 审查

真实角色`code-mapper`任务`/root/horse_map`从根工作区只读定位；产品独立Git根由主会话和`reviewer`确认。`reviewer`任务`/root/horse_build_review`执行显式父仓规则的OCR Delegation rule与宿主审查，首轮16/16核心文本项；发现P2部件资源名重复会覆盖帧表，已增加Loading唯一性检查及拒绝测试并复审关闭。新部件的更新位于无屏提前返回之前，换档与新轮状态均已复核。收尾又核对8份meta、五图15份副本、25项源码哈希和最终产物截图；复审要求将“所有快照始终一致”的表述收窄为赛中采样与下一表现更新，已修正。有效权限隔离未核验，不以只读声明作为沙箱证据。

框架脏meta、r02裸h01图及meta、cocos-service、旧continuous-course两图保持范围外。assets/.meta为进入任务前已脏的遗留条目，Creator刷新期间曾显示删除、收尾仍为修改状态，未手写内容或纳入提交。更新日志、资源/行为合同与本地验证同步；产品尚无远端，只能本地提交。
