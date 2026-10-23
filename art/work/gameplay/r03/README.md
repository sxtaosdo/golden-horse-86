# r03 · 现代起跑闸箱资源样稿

日期：2026-10-23。状态：单格模块外观样稿已生成，待Owner评审；不进入Runtime，不晋级共享Canon。

本轮依据Owner“看一下现代赛马……能不能出相关资源”的请求，核对现代平地赛马的起跑设施。沿用本产品此前已接受的2D像素方向；不是为P0001创建新的共享美术规范。

## 真实结构与来源

现代平地赛马通常使用分格起跑闸箱（starting stalls / starting gates）：每马一格，由后方入闸，前门放开后向前跑出。钢架由接地支承和轮组承载；门扇铰接在竖直立柱上，门下有空间。顶部横梁属于结构，前门属于放行机构；两者不能画成地上供马跳越的横杆，也不能画成无支撑的悬浮栏杆。

- [BHA入闸流程](https://www.britishhorseracing.com/faqs/flat-races-what-happens-when-the-horses-arrive-at-the-start/)：发令员按档位安排马匹到闸箱后方，由闸务人员引导入闸。页面的具体奇偶入闸顺序是英国流程，不作为本作统一规则。
- [BHA闸箱起跑说明](https://www.britishhorseracing.com/press_releases/bha-rule-change-declaring-non-runners-in-races-from-the-starting-stalls/)：前门打开的速度异常会影响公平起跑，说明统一放闸是起跑的关键。
- [Steriline结构与机制](https://www.sterilineracing.com/our-products/starting-gates/)：前后门的机械组件、立柱隔板、上下部缓冲衬垫、电触发系统和移动轮组。
- [RaceTech实际设备](https://www.racetech.co.uk/starting-stalls/)：英国赛场使用可移动的Steriline闸箱，由牵引车辆移到不同起跑点，页面有实物照片。

以上网页于本轮实际检索和读取；只参考机械原理，不下载厂商图片作为运行素材，不复制商标。资源提示中的六格、色板、约90度开门角度是本产品的制作要求，不是对所有现实闸箱型号的测量结论。

## 本产品的资源设计

马匹起跑方向为屏幕向右，六条通道应沿画面远近排列；开口朝右，闸箱整体横跨六马的起跑位置。结构框架、门扇和可动态绘制的号码需区分，避免将一个正面朝观众的闸门贴在草地上冒充实际起跑设施。

本轮先制作同一六格结构的“关闭前门／打开前门”双状态透明样稿。闭门挡住各马胸前路径，开门后六条向右出口畅通；底部不画横穿蹄部路径的障碍。号码牌留空，后续由引擎绘制号码，防止图生文字错误。

[设计提示](prompt.md)记录初始整组方案；[v02实际编辑提示](repair-prompt.md)与[v03实际生成提示](module-prompt.md)保留修订输入。仅作资源评审；目前没有门扇切片、铰链动画、六马对齐或Creator导入验收。

## 输出与选择

全部使用内置image_gen，原图完整保留，无图像后处理。默认源文件位于 `C:/Users/33272/.codex/generated_images/01a16943-ca46-7a21-9fd6-fb8ef775f3b4/`。

| 项目内文件 | 默认源文件 | 评审结果 |
|---|---|---|
| generated/starting-gate-states-v01.png | exec-303c5de6-0c66-422d-a44b-d0056c3d1abf.png | 整组只有五格，未采用；保留为v02编辑输入 |
| generated/starting-gate-states-v02.png | exec-db2fd9f4-d5b4-4a6c-8fbb-4dcfb90bd32c.png | 修订后仍只有五格，未采用；停止重复整组生成 |
| [generated/starting-stall-module-v03.png](generated/starting-stall-module-v03.png) | exec-825e2795-79c1-4ac0-9eb7-49c040cc33e6.png | 一个模块的闭门／开门外观候选，待Owner确认 |

v03可见一对关闭前门、一对打开前门、接地支脚、顶部横梁和软垫隔板，马脚通路下方没有连续横杆；PNG带真实alpha。两态的隔板长度、局部支柱和透视仍有生成差异，不能直接切成两张整体Sprite替换后称为无漂移动画。后续接入应先选定固定框架，拆分门扇、统一铰链和脚点，再沿六个档位布置；还需实际核对向右跑出的马匹与门扇遮挡。本轮不声称六格成品、无缝动画或运行验收。

v03原图为2172×724、32位RGBA；角落及顶部中点alpha为0。全部PNG的尺寸、SHA256、来源输入及选择状态见[generation.json](generation.json)；本轮没有修改图像像素。来源文件与项目副本字节一致，本地文档链接和manifest.csv四列结构已检查。

OCR使用Delegation Mode并显式加载父仓共享规则：total_files=24，reviewed_files=11（8个文本/JSON/CSV及3张人工查看的PNG），skipped_files=13（范围外原有5个meta/服务配置和8张图片），全工作区coverage_rate=45.83%，本轮范围覆盖100%。CSV与二进制在工具默认过滤外由宿主检查；逐项清单/规则输出在本机临时目录horse-starting-gate-r03-review。未发现本轮阻断问题，生成缺陷均按上述未采用或待对齐状态记录。本轮为小范围资源任务，由主会话直接处理，子代理未调用。

上版游戏代码仍为已确认的0.3.0.8实现，本轮只新增美术候选与来源说明；不重复运行覆盖路径未变化的Creator构建。资源仍待Owner外观确认，当前运行素材不变。
