# r05 赛场设备

状态：Accepted（Owner批准方案；本轮资源接入与运行证据见[设备验收](../../../../tests/EVENT_EQUIPMENT.md)）。每种设备一个透明PNG，原图未经像素编辑。

| 文件 | 设备 | 首次出现 |
|---|---|---|
| rail.png | 直道护栏模块 | 驿站赛 |
| distance.png | 距离牌，数字由Label显示 | 驿站赛 |
| finish-post.png | 终点立柱 | 驿站赛 |
| toolbox.png | 维修工具箱 | 驿站赛 |
| camera.png | 终点摄像机布景 | 地区赛 |
| mirror.png | 终点镜布景 | 地区赛 |
| speaker.png | 场内广播 | 地区赛 |
| warning.png | 警示灯 | 地区赛 |
| screen.png | 实时转播大屏 | 冠军赛 |
| tractor.png | 维护牵引车 | 冠军赛 |
| ambulance.png | 马匹救护拖车 | 冠军赛 |

`manifest.json`登记尺寸、选用原图、运行副本和SHA-256；`assets/resources/race/equipment-catalog.json`登记SpriteFrame裁切与脚点摆放。图片不含玩法状态，设备均放在道路外，弯道继续使用原曲线护栏，不旋转整块直栏图片。

生成工具为内置`image_gen.imagegen`。工作稿与完整提示词保存在`art/work/gameplay/r05/`，包括大屏v01和开口扩大的v02。v02开口实际约2.29:1，运行时在其中等比容纳16:9直播，留黑边；没有拉伸、伪造原图比例或用离线合成画面替代实时转播。原始输出外缘的轻微半透明像素保留，运行裁切取主体范围。

摄像机、终点镜和车辆为环境设备，不参与随机排名或返分判定；旧r04起跑闸箱样稿仍独立保留，本轮不把它当成六格开门动画。

后续r06已将摄像机与警示灯拆为固定基座和动态部件，并在冠军赛追加起跑闸箱；当前运行配置见`assets/resources/race/equipment-motion.json`。本目录保留v0.3.0.11静态原型及来源，不代表当前机头仍是单图。
