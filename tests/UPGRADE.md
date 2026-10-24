# 表现与连续游玩优化验收

状态：Accepted。Owner当前用户；Cocos3.8.8 + TS strict。对应docs/UPGRADE_PLAN.md，按实际完成切片增量记录，不代表全部计划已完成。未发布。

## V1 连续争位

RaceChoreography使用独立演出种子，按实际归一化进度计算有界偏移，最大幅度起跑直道.012、弯道.006、终点直道.006；每段值与导数归零，终点前.94起使用原曲线。所有马和设备读取模型progress，不在Sprite另加前后位移。排名随机仍5次，24秒首马与.35秒名次间隔、返分保持。

核心测试与strict通过；新增RaceChoreography测试64种种子、六种领跑者、段边界连续、单调与幅度、30/60/120Hz过线和返分。首次新增测试误写押2分返800，纠正为原40倍返80后通过。reviewer `/root/horse_build_review`通过显式父仓规则OCR Delegation preview/rule发现遗留网页生成器未去掉新导入，已同步匹配并通过test:preview重生成与Smoke。角色实际cwd/Git根为产品目录，权限隔离未核验。

绑定Creator projectId9d8a0041f7873b81、session f8eeb444-cc5e-4768-9b63-cf1825b747cc，Preview http://192.168.31.100:7456。显式刷新三脚本；script_wait_compile返回compiled/errors[]，真实playtest生成新页且revision=upgrade-r10-v1。原始输入/报告为[390输入](upgrade-rivalry-390.json)/[73步报告](upgrade-rivalry-390-result.json)，4类诊断0，finishCount6、clippedFinishers0、可见顺序2/4/6/3/1/5等于结果，worldChanges0。截图在evidence/upgrade-rivalry，目视[开门](evidence/upgrade-rivalry/upgrade-rivalry-open-390.png)及下一场保持栏杆层次与取景。

本切片是阶段一中间交付；V2/V3完成后统一正式构建、三尺寸与同包Smoke，不宣称本切片独立产物已验收。当前声音听感未验。

## V2 软阴影与落蹄扬尘

马图前创建三层低透明椭圆阴影，随方向收窄；马、阴影子树与七栏保持同一排序。实际步态触发世界坐标尘点，.36秒淡出、最多48节点；换轮/减少动态清空，销毁隐藏并销毁。定向测试覆盖48上限、dt0冻结、到期、换轮与销毁；Lifecycle及strict通过。

同绑定Creator/session显式刷新presentation和GoldenHorseGame，编译errors[]。[实际58步报告](upgrade-ground-390-result.json)PASSED、四类诊断0，直道/弯道/终点/结果尘点6/12/10/13、allocated最多18，下一场active0；六马顺序6/3/1/4/5/2与结果一致、裁切0、worldChanges0。目视[弯道](evidence/upgrade-ground/upgrade-ground-bend.png)和[直道](evidence/upgrade-ground/upgrade-ground-straight.png)保持脚下阴影、号码与近景。reviewer `/root/horse_build_review`按显式父规则OCR复核无确定缺陷，实际cwd/Git根产品仓、权限隔离未核验。其他尺寸与正式构建随V3整合。

## V3 方向帧与阶段一最终验证

六张原图均由built-in image_gen生成，先h01原图/透视/16帧脚点验证，再逐匹配色；[资源记录](../art/final/gameplay/r10/README.md)保留完整提示词、原图、先行校准和SHA。运行配置强校验六马/96帧/唯一资源/源尺寸/裁切/脚点，Creator生成9个meta。TurnArtwork测试实际HorseSpriteView的九方向×八步态及镜像槽位，96帧各自像素不同、18份source/final/runtime哈希一致；原144帧保留。完整core与strict通过，遗留网页Smoke复用V1已通过结果，覆盖路径未再变化。

相同绑定Creator刷新turn、配置和presentation，编译compiled/errors[]。revision=upgrade-r10-v3；三尺寸[390](upgrade-visual-390-result.json)、[360](upgrade-visual-360-result.json)、[430](upgrade-visual-430-result.json)分别92/89/89步，共270步PASSED，四类诊断0；每尺寸均实际观测0～8九方向，三局六马过线、裁切0、可见顺序等于结算、世界未更换。目视[入弯](evidence/upgrade-visual/upgrade-visual-390-turn2.png)、[中弯](evidence/upgrade-visual/upgrade-visual-390-turn5.png)、[出弯](evidence/upgrade-visual/upgrade-visual-390-turn11.png)足点、号码和方向变化正常；[实际7.267秒弯道MP4](evidence/upgrade-visual/upgrade-visual-turn.mp4)为390×844、H264、无声，原WebM同目录，未合成/改速。

构建operation horse-upgrade-visual-web-20261024-r10，[状态](upgrade-visual-build-status.json)passed/builderFinished=true/runnerExitCode36，非debug；packageHash `5a65fb9da328b716afd33e8a13e7df411fd847d7d966d9411c83bf1f3bfe9da1`。[同包Smoke](upgrade-visual-build-smoke-result.json)51步中50执行、1可选runtime_snapshot跳过，gameTestReady=false、四类诊断0；产物截图在evidence/upgrade-visual/build-upgrade-visual-*。正式产物无Preview桥，不用Smoke证明自动排序/帧数。

构建sourceRevision为此前HEAD eed503e，来自本次工作树；[35项冻结源码哈希](upgrade-visual-source.json)记录阶段一实际字节，构建及三尺寸实跑期间未改Runtime。reviewer `/root/horse_build_review`执行显式父规则OCR资源/代码审查，无确定缺陷；有效权限隔离未核验。阶段一完成，后续功能按计划推进，声音听感仍未验。

## F0 不可变结算明细

RaceResult新增bets/odds/net，冻结完整名次、明细数组/各条和结果本体；结算时复制标量，下一场cells不能污染旧记录。RaceReceipt.test验证总押7/返80/净73、不可修改及跨场变更不污染，strict通过。reviewer `/root/horse_build_review`经显式父OCR审查无确定缺陷，未运行Creator或写入；cwd/Git根产品仓，权限隔离未核验。本切片不新增UI，真实消费随F1/F4整合验证。
