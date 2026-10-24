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
