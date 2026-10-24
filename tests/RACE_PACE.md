# 起步、弯道和出弯加速验收

状态：Accepted；2026-10-24。本地实现及验证完成，未发布。Owner当前用户；Cocos Creator3.8.8。此前近景保持，本轮只调整速度节奏及其步态表现。

## 原版观察与实现界线

重新下载并抽帧查看[搜狐86版实录](https://tv.sohu.com/v/dXMvMzM4OTE1NTY2LzM4NzUxMjEwOS5zaHRtbA==.html)，283.157秒、960×540、30fps；重点24～49秒与72～97秒两局。起跑和出弯密集取样分别4fps、2fps，连续两局1fps。来源SHA-256与抽样时段见[参考登记](../art/reference/race/r07-timing.json)，抽帧保持发布者字幕，不进入Runtime。

[起跑抽帧](../art/reference/race/r07-launch.png)、[出弯抽帧](../art/reference/race/r07-exit.png)说明出闸建立速度、转向后恢复侧向奔跑并继续加速。相机运动、字幕和透视使屏幕位移不等于世界速度，未把观察估算当作原机公式；完整观察边界见[节奏合同](../docs/RACE_PACE.md)。

原实现courseFraction按elapsed/24匀速，前两段只有小幅相对扰动，出弯后仍线性；8帧步态固定10fps。现RacePace以连续Hermite距离曲线控制统一赛程，首直道约9.6秒、弯道至15.84秒，之后加速到首马24秒。起步零速度建立，约3.6秒达到正常全程平均速度的1.4倍，弯道出口约0.75倍，首马冲线约1.3倍；全部为本产品演出拟合。各马仍按原24+rank×0.35秒到达，出弯及冲线速度连续，随后同速度自然离场。

共享镜头沿同一距离曲线移动，未新增平行模拟；步态时钟=0.25×elapsed+0.75×progress×24，按实际路程连续提频，身体起伏使用相同时钟。已有首直道相对进度波动幅度从0.008调为0.010；不声称复现原版每匹马的途中策略。排名抽序、赔率、准备3秒与返分保持。

## 自动验证与审查

`npm test`、strict TypeScript检查通过；新增RacePace测试覆盖起步提速、弯道节奏、出弯再加速、全部时间接点速度连续、1/30、1/60、1/120秒步长的六马冲线时刻/顺序、RNG仍仅5次抽样及返分一次。原路径几何连续、持续世界、生命周期、设备与近景边界测试保留；MobileArtwork按新的strideTime选择真实马匹帧。

真实code-mapper任务`/root/horse_map`只读定位本轮时钟/位移/相机/步态链；cwd与Git根为shidai3根目录，产品Git根由主会话及reviewer另行确认。真实reviewer任务`/root/horse_build_review`执行显式父仓规则的OCR Delegation preview/rule与宿主审查，核心8/8文本项，并额外核对网页生成工具与产物。发现P2：旧网页Smoke读取陈旧匀速game.js，重生成又因导入未处理出现exports依赖。已精确处理拼接依赖及纯类型导入，renderer消费strideTime，重生成game.js，并将test:preview改为先生成再测；定向Smoke及4文件复审通过，P2关闭，无剩余确定发现。该任务最终又核对230步报告、29项源码哈希、同包Smoke、七张产物截图及视频元数据，未发现新增确定缺陷；未逐帧审看完整视频。角色有效权限隔离未核验。

## 实际Creator Preview

绑定工程D:/code/shidai3/P4000/golden-horse-86、projectId `9d8a0041f7873b81`，session `f8eeb444-cc5e-4768-9b63-cf1825b747cc`；revision `race-pace-r07-v1`。编译通过并重新载入本工程Preview，没有操作其他产品。

| 视口 | 赛事 | 步数 | 实际冲线数 | clippedFinishers |
|---|---|---:|---:|---:|
| 360×640 | 地区赛 | 45 | 6 | 0 |
| 390×844 | 冠军赛 | 118 | 6 | 0 |
| 430×932 | 冠军赛 | 67 | 6 | 0 |

共230步通过，四类console/page/request/HTTP诊断全部0；每局冲线顺序等于模型结果，worldId保持、绘制次数1。更新后的赛中采样机头目标等于实时进度最大者，实际方向帧一致；闸箱同步、下一场关回。390完整记录raceElapsed、courseFraction与strideTimes：1.051秒进度0.01182，3.386秒0.11061，9.625秒已入弯，15.913秒进入返程直道，23.219秒0.95828。未用固定截图秒数代替实际状态判断。

原始输入和报告为race-pace-{360,390,430}.json及对应-result.json；[机械摘要](race-pace-summary.json)保留采样时钟、结果和裁切计数。实际截图：[起步](evidence/race-pace/pace-sample-00-390.png)、[弯道](evidence/race-pace/pace-sample-10-390.png)、[出弯直道](evidence/race-pace/pace-sample-16-390.png)、[430弯道](evidence/race-pace/pace-bend-430.png)。

整局实际Canvas录制：[35.862秒MP4](evidence/race-pace/pace-preview.mp4)、[原始WebM](evidence/race-pace/pace-preview.webm)。录制来自390×844浏览器视口，Canvas原始像素390×794，完整保留界面；只做H.264转码，未改速、未补帧或合成游戏画面。覆盖准备、起步、单弯、出弯、冲线、结果2/4及自然离场；无音轨，不证明音效听感。主会话查看全过程抽帧及原尺寸代表帧；最终主观手感仍由Owner看实录判断，不声称原机逐帧一致。

## 正式Web Mobile产物

[构建状态](race-pace-build-status.json)：passed、builderFinished=true、runnerExitCode=36，非debug。

packageHash：`31bdb9038aef71a144d7081b9b54578473d4f54d1c6406bbbdb4aaf20ad18556`。[同包Smoke](race-pace-build-smoke-result.json)49步中48执行，最后可选runtime_snapshot跳过，gameTestReady=false，四类诊断0。正式产物未注册Preview桥，不把模型排序、目标和真实过线的自动断言归到此Smoke。

目视实际产物截图：3200积分冠军赛六格闭门，准备后同步开门、起跑初期仍在建立位移；本局结果5/3、返分0，自然离场后3199积分下一场关回。截图：[闭门](evidence/race-pace/build-pace-betting.png)、[起跑](evidence/race-pace/build-pace-live.png)、[结果](evidence/race-pace/build-pace-result.png)、[下一场](evidence/race-pace/build-pace-next-round.png)。

构建来自未提交工作树，报告sourceRevision是此前46426b4，不单独代表本次实现；29项源文件SHA-256见[源码记录](race-pace-source.json)，Runtime源码在构建开始后未改。未部署，无远端。原有脏meta、h01样稿、cocos-service、旧continuous-course两图范围外；未手写scene/prefab/meta。其他平台、原机精确算法/像素、音效听感与干净检出构建仍未验收。
