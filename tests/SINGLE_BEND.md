# 86版单弯赛程与整屏比赛验证

状态：本轮已本地验证，未发布；完整原版复刻仍未最终验收。日期2026-10-23，Owner当前用户，基线34c9d108526b915dd0c9fb5e18808003f40d3e4d。

## 依据与范围

实机参考为[搜狐86版录像](https://tv.sohu.com/v/dXMvMzM4OTE1NTY2LzM4NzUxMjEwOS5zaHRtbA%3D%3D.html)，实际播放并抽帧核对多局，参考截图在art/reference/race，未作为运行资源。本轮只验收单弯赛程、左向终点、押分/比赛页面、三角表及起跑/结果演出，不推断原机赔率生成算法、特殊奖励或音轨。

## 实现

TrackVisual定义向右起跑、向下转向的唯一弯道、向左完赛的开放U形路径；路面、马匹、围栏、门、旗帜、距离牌、终点同属持久世界。视口960×660，投影共用中心(480,330)。侧面马匹宽134，缩放1.05，按源图216宽和鼻尖x208校准鼻偏移65.1388889，世界终点x400，完赛脚点x465.1388889。测试桥要求前一帧鼻尖在右、本帧到线左且处于最终直道，起跑不计过线。

押分界面使用三角15组合格、黄色赔率/红色押分、右侧历史组合及赔率；比赛隐藏全部押分控件。结果以大号实际冠亚军组合叠加，返分仅一次，结果后继续离场；下一场回押分并清旧结果。RNG和固定DEMO_ODDS仍为原型假设。

页面使用正式Git submodule extensions/shidai3，SHA39f168e7abdac9215d0ea21f2a5a3585262e9970，来源git@github.com:sxtaosdo/ComposableGameFramework.git；不复制框架、不改框架源码。只消费既有StateMachine管理Loading/Betting/Racing，结果为比赛叠加层。异步切页防重入；销毁闭门并等待pending切页后release。Creator为该独立检出自动生成的未跟踪meta不属于框架源码提交。

## 真实运行

所有Creator操作经Cocos-MCP，工程9d8a0041f7873b81，Creator3.8.8，session c7eb2e3c-8edd-4805-a35d-0e91e42c5819。未手改场景/Prefab/Meta。

最初Preview仍缓存旧42像素鼻偏移；该次录制不作为最终证据。已显式asset_refresh三个脚本、script_wait_compile通过、preview_reload，AssetDB TrackVisual SHA256=59373fe5f00a8dc68028498302080266166f38aadf09d074d42f62bea194fea5与本地一致。最终脚本增加horseNoseOffset=65.13888888888889断言，避免旧缓存假通过。

[single-bend-playtest.json](single-bend-playtest.json)通过真实鼠标点击15格、开跑和下一场及键盘Enter连续完成两局。最终[single-bend-result.json](single-bend-result.json) PASSED：

- 第一局实际穿线顺序1→3→5→2→6→4，等于结算；押15，返4，余额489。
- 第二局1→3→5→4→6→2，等于结算；押1，返0，余额488。
- 两局世界不更换，路面绘制1次；结果与离场后余额一致，6秒后所有马匹屏幕x<-75，完整离开视口；镜头保持(465.1388889,800)。
- consoleErrors/pageErrors/requestFailures/httpErrors均0。桥的backgroundMismatches保留为历史字段，连续世界不再用它证明视觉正确；依据截图、源码和路径/边界测试判断。
- 主会话查看最终押分、起跑、单弯中段、左向直道、结果及清场截图；全程原始录制actual-single-bend.webm，MP4 actual-single-bend.mp4为65.202秒960×712 H264。原Canvas960×711，仅在转码底部补1行黑边满足编码要求，无游戏画面合成，无音轨。

## 验证与审查

strict检查通过；RaceModel、TrackVisual、RacePresentation通过（单弯接点/速度、车道边界、可见范围、鼻尖过线、一次返分、自然离场、下一局）。新增RacePageLifecycle使用真实组件和钉住框架的状态机覆盖重复切页、异步退出时销毁；通过。遗留网页重生成、道路坐标断言及Smoke通过；它不作为Creator证据。

真实角色记录：/root/map_local_project只读定位测试桥与输入；/root/critic_turn_finish复核单弯/左向冲线/异步页面边界；/root/review_2d_runtime发现鼻偏移、异步销毁和遗留网页漏直道，主会话均修复。该reviewer复核并独立通过Presentation、Smoke和Lifecycle，无新增阻断问题。角色未操作Creator，权限隔离未核验。

OCR Delegation preview/rule显式使用父仓.opencodereview/rule.json；最终清单47项，其中27项本次文本全部审查（27/27），1项框架gitlink核对pin，16项本次非文本规则项（15个图片/视频、1个CSV）人工核对；既有assets/.meta和2张旧截图共3项范围外跳过。宿主审查当前源码、配置、测试、生成物和报告，未发现本轮范围内新增阻断问题。gitlink目录不作文本文件，人工核对pin/只消费API；二进制参考图与实际截图/视频按来源及代表帧检查。assets/.meta和此前两张continuous-course未跟踪截图为既有范围外改动，不纳入本次提交。

源码指纹见single-bend-source-sha256.json。运行通过只覆盖本轮切片；原版精确像素、多方向马匹动画、赔率算法、STARTER/FINISHER/SPRINTER奖励与原声音频仍未完成，不宣称完整1:1交付。
