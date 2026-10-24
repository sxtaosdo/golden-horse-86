# 起点栏杆与马匹遮挡修复

状态：Accepted；2026-10-24，本地实现和验证完成，未发布。Owner当前用户；Cocos Creator3.8.8。

## 根因与修复

原六组闸箱均在EventEquipmentBack，而六匹马在独立horseLayer，运行时只排马的顺序；所以近侧栏杆也一律被马盖住。把整组放到前层又会压住更近车道的马。

现复用已有透明strict-side隔栏，不编辑PNG或meta：六条近侧栏架放入horseLayer，作为车道间共享边界，最远侧补一条固定后栏。马和隔栏按世界脚点y从远到近一起排序；起跑顺序为far@80→H6@100→near6@120→H5@140…H1@300→near1@320。近侧栏杆覆盖所属马的下肢，更近车道马匹覆盖后方栏杆；原透明缝隙继续可见马腿。

门扇保留在所属栏架子树中，按原四帧、0.3秒统一打开，下一场关闭。七条边界均由EquipmentScene持有，降档/销毁先隐藏再延迟销毁，无可见旧栏残留；马匹节点不被销毁。主视图与转播共用原Mask祖先、RACE_WORLD_LAYER和节点顺序，未增加其他Canvas。转播一致性依据共享树/层与源码审查，本轮未单独导出RT像素，不把主屏截图当作独立RT画面验证。

## 自动检查和真实角色审查

`npm test`与严格TypeScript检查通过，既有轨迹、近景边界、速度节奏、设备和生命周期测试保持通过。新GateOcclusion.test.cjs直接运行实际RaceTrackView/EquipmentScene，渲染组件用stub：验证七栏/六马交错、所有门状态及新场复位、实际脚点跨越后重排、降档/重建/销毁与延迟销毁残影。此测试不替代真实遮挡截图。

真实code-mapper任务`/root/horse_map`只读定位全组Back/Front与马内排序的根因；cwd/Git根为shidai3根目录，产品Git根由主会话及reviewer确认。真实reviewer任务`/root/horse_build_review`执行显式父仓规则的OCR Delegation preview/rule，6/6本轮文本项宿主审查，无确定缺陷；确认共享隔栏逻辑、门扇父子关系、Mask/世界层和清理。该任务最终复核224步报告、24个交错样本、29项源码哈希、同包Smoke、七张产物截图和短录元数据，未发现新增确定缺陷。角色有效权限隔离未核验。

## 实际Creator Preview

绑定工程D:/code/shidai3/P4000/golden-horse-86，projectId `9d8a0041f7873b81`，session `f8eeb444-cc5e-4768-9b63-cf1825b747cc`。初次reload仍返回旧revision race-pace-r07-v1，版本断言拒绝，未算成功；随后显式刷新三个改动脚本，AssetDB字节哈希与工作树一致，编译通过并reload。最终全部报告要求revision `gate-depth-r08-v1`。

| 视口 | 赛事 | 步数 | 真实冲线数 | 冲线裁切 |
|---|---|---:|---:|---:|
| 360×640 | 冠军赛 | 67 | 6 | 0 |
| 390×844 | 冠军赛 | 90 | 6 | 0 |
| 430×932 | 冠军赛 | 67 | 6 | 0 |

共224步通过，四类console/page/request/HTTP诊断均0。24份更新后的起点状态确认13个实际节点严格交错；全程depthOrder按脚点递增。各局可见冲线顺序等于结果，世界不更换、绘制次数1。390还确认下一场重关、降为驿站赛后七条边界全部移除；门扇实际绑定帧与状态一致。

[机械核对摘要](gate-depth-summary.json)记录实际节点顺序、门帧与结果；原始输入/报告为gate-depth-{360,390,430}.json及对应-result.json。主会话目视[闭闸](evidence/gate-depth/gate-depth-closed-390.png)、[开闸](evidence/gate-depth/gate-depth-open-390.png)、[360小屏](evidence/gate-depth/gate-depth-betting-360.png)、[下一场](evidence/gate-depth/gate-depth-reset-390.png)，确认栏杆遮挡腿部而头部/号码可读，开门后马匹从透明隔栏间跑出。

实际Canvas短录：[6.544秒MP4](evidence/gate-depth/gate-depth-preview.mp4)、[原始WebM](evidence/gate-depth/gate-depth-preview.webm)，390×844，无声；覆盖准备、开门及出栏初期，仅转码，未合成或改速。整局结果来自上述报告，不把短录当作整局证据。

## 正式Web Mobile产物

最终操作`horse-gate-depth-web-20261024-r08-v2`在显式刷新后构建；刷新前首次构建不作为最终证据。最终[构建状态](gate-depth-build-status.json)passed、builderFinished=true、runnerExitCode=36，非debug。

packageHash：`da3edd59fb595e2e5328b92aed8a0d03052002d19e0556b624edc8fa33c99459`。[同包Smoke](gate-depth-build-smoke-result.json)49步中48执行、1个可选runtime_snapshot跳过，gameTestReady=false，四类诊断0。正式产物不注册Preview桥，自动深度/排序/过线断言只归属于Preview。

目视实际产物：[闭闸](evidence/gate-depth/build-gate-depth-betting.png)中白马下肢被近栏正确遮挡，其他车道保持前后关系；[开跑](evidence/gate-depth/build-gate-depth-live.png)时门扇与栏架保持相应层次，本局[结果2/6返分0](evidence/gate-depth/build-gate-depth-result.png)，[3199分下一场](evidence/gate-depth/build-gate-depth-next-round.png)重新闭门。近景与此前节奏保持。

构建报告sourceRevision是此前HEAD 3fa7faa，本次来自未提交工作树；29项字节哈希见[源码记录](gate-depth-source.json)，最终构建开始后无Runtime改动。没有远端，未部署；其他平台、独立RT像素、音效与干净检出构建未验收。原有assets/.meta、框架派生meta、h01样稿、cocos-service和旧continuous-course两图范围外，未手写scene/prefab/meta。
