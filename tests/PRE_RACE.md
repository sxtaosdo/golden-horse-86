# 赛前演出与随机广角验收

状态：Accepted；2026-10-24，本地实现与验证完成，未发布。Owner当前用户；Cocos Creator3.8.8 + TypeScript strict。实现合同见[赛前演出](../docs/PRE_RACE_PRESENTATION.md)。

## 已实现行为

每场独立表现随机选择正中、左侧或上方三种广角，不连续重复；押分保持镜头稳定。准备3秒的前2秒smoothstep收回原近景，最后1秒固定，开跑接原比赛跟随。resize只重算基准尺寸，同场不重新选镜头。六马各10帧错峰待机、低头/刨蹄和准备压身，旗手6帧低旗/举旗/落旗；原144帧奔跑素材保持。成功加注有两马号码提亮与格子回弹，反馈不堆叠。

地区/冠军设备相机赛前扫视、比赛跟随真实当前领跑者；冠军大屏显示场次、参赛号码、准备倒数。新增五个可选音频由用户交互解锁，环境音按档位调整、最后1秒压低、比赛停循环；提示音使用可停止的独立AudioSource，销毁停止并清空clip。缺失音频只登记warning。原模型RNG、赔率/返分、速度节奏、七条闸箱边界排序不变。

## 自动检查与真实角色

`npm test`完整通过，包括新增PreRace.test.cjs和既有设备、生命周期、轨迹、节奏及遮挡测试；strict TypeScript通过。纯逻辑验证100种随机种子×10场不连续重复、同场稳定、准备插值、反馈寿命、三次倒数/一次门锁、模型随机源独立、66个独立帧的裁切/透明边界和跨镜头尺寸边界、音频解锁/缺失/销毁。音频生命周期修复后仅重跑受影响PreRace测试和strict，均通过。

真实code-mapper `/root/horse_map`只读定位原加载门、帧数和表现入口。真实reviewer `/root/horse_build_review`按显式父仓规则执行OCR Delegation preview/rule，对16/16文本项进行宿主审查：发现playOneShot不归AudioSource.stop管理，已改为五个可停止的独立AudioSource并补充延迟原生加载清理测试，复核关闭该P2。真实docs-researcher `/root/horse_resize_docs`依据本机3.8.8的view.ts和PAL源码确认Web resize路径，区分Preview固定外壳与浏览器真实视口。code-mapper与docs-researcher从shidai3根工作区读取，reviewer实际cwd/Git根为产品独立仓库，显式加载父仓规则；角色有效权限隔离未核验。最终reviewer核对17个meta、45项源码哈希、792步报告、同包Smoke、产物/缩放截图与视频，未发现新增确定缺陷；角色工作目录记录的P3文档问题已更正。

## 实际Creator Preview

绑定工程D:/code/shidai3/P4000/golden-horse-86，projectId `9d8a0041f7873b81`，session `f8eeb444-cc5e-4768-9b63-cf1825b747cc`。资源/脚本由绑定Creator刷新并编译，新增17个meta由Creator生成。所有成功报告要求revision `pre-race-r09-v1`、新66帧与原144帧同时加载；音频loaded=5且warnings为空。

| 检查 | 报告步数 | 覆盖 |
|---|---:|---|
| 390×844手动冠军赛 | 73 | 加注、收镜、末秒固定、六马冲线、下一场 |
| 390×844自动冠军赛 | 71 | 无手动开跑，自动准备、完整冲线、下一场 |
| 360×640地区赛 | 31 | .075环境音量、设备扫视转真实领跑 |
| 三镜头×三尺寸矩阵 | 617 | 10次自然随机抽样覆盖9种组合，含360/430各一完整局 |
| 合计 | 792 | 4局完整比赛，每局真实过线6、裁切0 |

输入/原始报告为pre-race-390、pre-race-auto、pre-race-regional及pre-race-{360,390,430}-caseN对应JSON。[机械摘要](pre-race-summary.json)逐报告保留采样时间线：同场镜头固定、下一场不重复；实际zoom与投影位置一致；10种马姿态均观测到；准备末秒为原近景并压身；比赛循环音停止、倒数3次/门锁1次；设备赛前targetHorse=0、比赛目标为真实领跑者；四局可见冲线顺序等于模型结果，世界节点稳定且绘制次数1。矩阵自然随机多抽1次，没有强制镜头或改写比赛状态。

主会话目视[广角](evidence/pre-race/pre-race-wide-390.png)、[准备收镜](evidence/pre-race/pre-race-close-middle-390.png)、[末秒固定](evidence/pre-race/pre-race-hold-390.png)、[开门](evidence/pre-race/pre-race-open-390.png)及三尺寸实际画面，六马号码/头部可读，栏杆与马腿层次保留。

[三镜头12.386秒实录合集](evidence/pre-race/pre-race-three-shots.mp4)为三个独立实际Preview片段按正中→左侧→上方拼接，390×844、H264、无声；不是一局连续切三镜头。每段原始WebM及单独MP4一并保留。第一次较长采集遇Companion暂态上下文丢失，未取到完整录像，不计视频证据；矩阵在同一调用内停止并导出原始采集数据成功，原始390-case报告保留该数据。

## 正式Web Mobile与同页缩放

最终构建操作`horse-pre-race-web-20261024-r09`，[状态](pre-race-build-status.json)passed、builderFinished=true、runnerExitCode=36，非debug。packageHash：`3a620a711ff7b264c4ca3600ec51af9d421631414b76bb7495efa3d2d0b06985`；[同包Smoke](pre-race-build-smoke-result.json)51步中50执行、1个可选runtime_snapshot跳过，gameTestReady=false，四类console/page/request/HTTP诊断0。

实际产物[广角押分](evidence/pre-race/build-pre-race-betting.png)、[准备](evidence/pre-race/build-pre-race-preparing.png)、[末秒近景](evidence/pre-race/build-pre-race-near-hold.png)、[开跑](evidence/pre-race/build-pre-race-live.png)、[6/5返分0结果](evidence/pre-race/build-pre-race-result.png)、[3199分下一场](evidence/pre-race/build-pre-race-next-round.png)均保留；正式产物无Preview桥，不把Smoke当作自动帧数、排序或音频断言。

Preview同页外壳resize的17步报告虽执行成功，内层Canvas保持390设备尺寸，430/360图出现边框/裁切，因此不计真实适配通过。随后用正式产物在同一个浏览器页面、不reload，依次390×844→430×932→360×640；[DOM记录](pre-race-build-live-resize.json)确认Canvas像素与边界均等于当前视口、原点为0，无旧尺寸边框。[390](evidence/pre-race/build-live-resize-390.png)、[430](evidence/pre-race/build-live-resize-430.png)、[360](evidence/pre-race/build-live-resize-360.png)目视UI与六马完整。该DOM证据不读取游戏隐藏状态；镜头选择保留另由纯测试与同页无重载操作支持。

构建报告sourceRevision为此前HEAD `fa750d1ed929006fa6ecd08af2fa9a5302391d56`，产物来自本次未提交工作树。[源码SHA-256](pre-race-source.json)记录实际字节，最终构建开始后无Runtime改动。

## 资源与限制

资源来源、原图、完整提示词、修订稿、帧裁切、音频原创配方及三份副本SHA见[r09资源记录](../art/final/gameplay/r09/README.md)。36份选用source/final/runtime文件哈希一致；PNG原始像素保留，未手改scene/prefab/meta。

音频PCM格式、峰值/无裁切、加载与实际触发/音量/清理已验。工具不支持音频输入，本轮没有完成听感验收；所有实录无声，不能据此证明音质或原版音轨一致。其他平台、独立转播RT像素、干净检出构建未验；项目无远端，未部署。范围外assets/.meta、框架派生meta、h01样稿、cocos-service和旧continuous-course两图保留，未纳入本次提交。
