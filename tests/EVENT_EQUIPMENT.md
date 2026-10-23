# 赛事分级与设备验收

状态：Accepted；2026-10-24。本切片已接入并完成下述本地验证，未发布，不代表完整原版复刻验收。

## 实现与资源

赛事门槛为0/1000/3000积分，对应驿站赛4类、地区赛8类、冠军赛11类设备；不扣参赛费。押分仍计本场资格，结算后的下一场先清旧押分再重新定档。准备阶段固定3秒，手动/自动开始共用入口，准备结束才调用原随机排名逻辑。

[资源目录](../art/final/gameplay/r05/README.md)包含11个独立透明PNG、SHA-256及运行副本登记；工作稿、完整提示词和生成来源保存在`art/work/gameplay/r05/`。原图未做像素编辑。大屏v01过矮，最终选用开口扩大的v02；源开口约2.29:1，16:9直播等比居中并留黑边，不拉伸。

静态选择面板、关闭按钮及组件引用经绑定工程的Creator语义工具保存。主赛场、马匹和设备共用一个U形世界；仅马匹容器内排序。大屏使用512×288 RenderTexture、目标15Hz、独立正交相机，取当前赛场中心16:9区域；排除屏框/屏幕自身及HUD，离屏停采并保留纹理，离开冠军赛或销毁时释放。准备期直播叠加倒计时，结算前5秒展示本场冠亚军，随后恢复离场直播。

## 验证

`npm test`与`npx tsc -p tsconfig.json --noEmit --skipLibCheck`通过。新增单测覆盖999/1000、2999/3000边界、押分资格、免费选档、准备期输入锁、重复开始、手动/自动准备期、延迟随机数调用、原排名/返分一致、下一场大额损失降档、错误配置拒绝、加载失败无模型/测试桥回退，以及11图透明度、独立性、裁切/摆放与屏幕5秒边界。

实际Creator Preview projectId为`9d8a0041f7873b81`，Creator 3.8.8。以下六份原始报告共305步，均通过，console/page/request/HTTP四类诊断计数均为0。没有改写模拟时间、随机名次或结算的测试步骤。

| 报告 | 覆盖 | 步数 |
|---|---|---:|
| equipment-390-result.json | 首轮三档、锁定选择、完整冠军赛、降档释放；使用v01屏框/取景 | 81 |
| equipment-360-result.json | 360×640驿站赛完整一局、面板触控、Enter起跑 | 28 |
| equipment-430-result.json | 430×932地区赛完整一局、30秒自动开始、降为驿站赛 | 38 |
| equipment-screen-v02-result.json | 最终v02屏框/取景完整冠军赛、屏幕各状态、离屏停采与释放 | 58 |
| equipment-matrix-360-result.json | 360×640三档及最终准备/直播画面 | 50 |
| equipment-matrix-430-result.json | 430×932三档及最终准备/直播画面 | 50 |

[摘要](equipment-verification-summary.json)由原始观察机械核对：三尺寸全部触控矩形均≥44 CSS px（关闭按钮在360宽下为45.12）；四局均六马真实可见冲线顺序与模型顺序一致；worldId保持、赛道绘制一次、世界替换0；下一场按实际积分降档。最终v02离屏两次观察采样数均为126，纹理保留；下一场地区赛广播已释放。四局押注均未命中，运行中奖返分不在本轮新增实跑样本中，中奖及单次结算由确定性单测覆盖。

最终截图： [360直播](evidence/event-equipment/matrix-live-360.png)、[390直播](evidence/event-equipment/equipment-v02-live-390.png)、[430直播](evidence/event-equipment/matrix-live-430.png)、[赛事面板](evidence/event-equipment/equipment-picker-360.png)、[冠军结果](evidence/event-equipment/equipment-v02-result-390.png)。早期spike/probe仅保留为技术过程，不能替代最终v02证据。小屏跟随窗口会自然裁掉部分远处布景或设备支脚；六马、号码、直播内容与押分区域未被新设备覆盖。

## 正式构建

[构建状态](equipment-build-status.json)：非debug Web Mobile，仅GoldenHorseGame.scene，builderFinished=true、state=passed、runnerExitCode=36。构建使用本次未提交工作树，记录的sourceRevision为此前HEAD `24d9892e2179dff9f78d8956fa33b20d9497ee84`，不能把该SHA单独当作本次源码版本。

- packageHash：`d2c3635a1c69d415eecd6a93371cc7ffc0d67f97670795595bfba048f9c8935c`
- indexHash：`67d08b08cd642885d41d5e55142fdc0aceedda9d017578c9fab7363430d93661`
- 构建配置：[build-web-mobile.json](build-web-mobile.json)
- 最终输入及原始结果：[build-smoke-equipment.json](build-smoke-equipment.json)、[equipment-build-smoke-result.json](equipment-build-smoke-result.json)

最终产物Smoke为47步，46步执行、无步骤失败，最后可选runtime_snapshot因正式产物不注册Preview测试桥而跳过；gameTestReady=false。四类诊断均0，Smoke与构建packageHash一致。肉眼核对真实产物截图确认3000分冠军赛、准备倒计时、直播、冠亚军6/4、返分0、下一场2999分地区赛及屏幕消失。正式产物未自动断言冲线排序、返分或桥状态。

初次Smoke虽工具返回PASSED，但截图显示画布未聚焦、F8+F9未生效，步骤停在锁定面板，因此未采纳为流程通过。查阅本机3.8.8的keyboard-input.js确认键盘监听在GameCanvas；最终脚本先真实点击画布聚焦后重跑，核对上述完整画面，不修改产品代码。

产物截图：[开跑前](evidence/event-equipment/build-equipment-betting.png)、[直播](evidence/event-equipment/build-equipment-live.png)、[结果](evidence/event-equipment/build-equipment-result.png)、[下一场](evidence/event-equipment/build-equipment-next-round.png)。未部署；未验证其他平台、音效听感或干净检出重建。原有未跟踪h01样稿及框架派生meta仍在原工作区，本轮不混入提交；既有检出重建限制沿用[此前构建记录](WEB_MOBILE_BUILD.md)。

## 审查与交付边界

真实命名角色`reviewer`会话`/root/horse_build_review`完成只读审查及相机/摆放/最终资源增量复核；有效权限隔离未核验。OCR使用Delegation preview/rule并显式加载父仓共享规则，宿主审查首轮20/20实现/配置/测试/合同/场景项及22/22新增meta，906项场景引用无悬空；11张原图/final/Runtime副本哈希一致（屏幕后续v02另核对）。后续输入与六份运行报告也已复核。发现的P2关闭按钮86高已通过Creator修为94并在实际360尺寸核验。无剩余确定代码缺陷；图片与运行截图由主会话另行目视验收。

原有assets/.meta、r02未跟踪h01图与meta、cocos-service、框架脏meta、旧continuous-course两图均范围外，未修改其业务内容或纳入本次提交。产品没有配置Git远端，本轮仅本地提交，不能声称已推送。
