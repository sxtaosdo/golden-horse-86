# 计划外界面与手感回退

状态：Accepted。Owner于2026-10-24要求撤销上一轮自行扩大的界面与交互改法。产品Cocos Creator3.8.8/TypeScript；回退参照v0.3.0.15（c44592f），本轮开发基线v0.3.0.29（68a3f59）。

## 回退范围

- 结束面板恢复62号数字组合、原倍率与返分一行；恢复原位置/尺寸/字号，不再在该面板塞入净变化和六马名次。
- 马号恢复40宽纯数字，赛中HUD恢复“比赛中·押分锁定”；保留原阶段及计划内末5秒提醒。
- 历史恢复RaceHost内原610×420小窗，取消历史的整屏遮罩，仍按原方式再点历史收起。保留20场、每页5条和冻结账目；每场15组合在原小窗分3个押分页，上一/下一条可访问所有场次。窗内文字/按钮按分页需要排布，不宣称内部像素完全等同旧版。
- Credits/Message/Legend/EventButton恢复原位置和字号，Message恢复固定赛事说明，Legend仅保留计划内黄色倍率/红色押分，不再承载操作或存档消息。源语义测试同时确认RaceHost/HUD/Footer/BettingPage没有移动或缩小。
- 单击恢复松手提交，取消/滑出不提交；长按仍400ms首笔、其后120ms，松手不额外加笔；右键固定撤1。

计划内连续争位、96方向帧、阴影/尘、环境/设备、档位/沿用、存档与暂停、音量/减少动态、帮助/里程碑均保留。为不侵占原信息区，仅在原空白格保留“更多”入口，档位/沿用/设置/帮助均收在其中，存档模式也在新入口显示。原赛事按钮与新增档位触控区重叠，故隐藏旧新增档位/设置/帮助独立按钮。

## 实现与定向验证

主会话独占功能与测试修改，code-mapper `/root/horse_map`只读定位回退边界，reviewer `/root/horse_build_review`按显式父OCR Delegation规则复核输入、More路由、分页完整性及基线语义，无确定缺陷。角色实际Git根为本产品；硬只读隔离未核验。

场景只经绑定Creator project9d8a0041f7873b81、session f8eeb444-cc5e-4768-9b63-cf1825b747cc修改。`tools/restore_upgrade_ui.cjs`从Git基线读取指定属性并调用官方patch，未手改scene/prefab/meta；最新保存重开revision rev-5cdcf865。脚本热导入后曾出现修订号冲突，改为两次真实读回一致后执行，未强制覆盖变化中的版本。

完整npm test和strict --skipLibCheck通过，日志restore-scope-test.log。QuickInput覆盖松手/取消/滑出/指针归属、长按不补笔、固定1分右键及面板转场；History覆盖20场与所有组合分页、快照不受当前赔率污染；RestoreScope逐项比较Git基线场景属性和新入口，TurnArtwork继续验证96帧并断言纯数字40宽马号。保留原存档、设置、玩法与资源回归。

## 真实三尺寸

restore-scope-{360,390,430}-result.json分别97/100/120步，共317步PASSED、四类诊断0。覆盖驿站/地区/冠军、原布局、5/10/1档位、真实长按、历史暂停/小窗、三页15组合、原结束画面、沿用幂等、帮助/里程碑和下场减少动态。三局六马过线顺序匹配结算，裁切0、worldChanges0；历史暂停前后模型/镜头/设备/环境相同。汇总restore-scope-preview-summary.json，原图在evidence/restore-scope，主会话已目视旧结束样式、窗口遮罩范围与三档场景。

## 正式同包

operation horse-restore-scope-web-20261024-r12-v1：passed、builderFinished=true、runnerExit36，非debug。packageHash `4d07aba332293204dba44bc21cbf11f8668cfbceaa6448dd473550ef74baeb12`；build sourceRevision为此前HEAD68a3f59，实际回退工作树40项SHA全部匹配restore-scope-source.json，构建/正式验收期间未改生产输入。

restore-scope-build-smoke-result.json同包88步全部执行、0跳过、四类诊断0，gameTestReady=false。主会话目视正式原结束数字3—2、倍率12返12、497分；两次结果恢复仍497/押15，下一场497/押0。More保留5分档位，整套沿用两次仍482/押15，完整15组合在原小窗分3页，设置/帮助/里程碑仍可达。四阶段恢复面板间隔800ms的全图RGBA SHA相同。25张正式截图SHA、可见观察与4组像素对比见restore-scope-build-observations.json。

BuiltAudio.test直接加载本次编译模块，12源stop/dispose通过。短按起止、右键固定1分由实际组件事件测试覆盖，原生脚本工具没有单独右键/按下/抬起步骤，未冒充已原生观测。reviewer /root/horse_build_review 对最终代码、基线语义、三尺寸及同包证据只读复核，无确定缺陷；硬只读权限隔离未核验。

本轮不改其他任务未提交文件，不发布；远端未配置。音效听感仍未验。
