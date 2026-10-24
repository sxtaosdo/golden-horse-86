# 观众与旗帜微动

状态：Accepted。用于本产品 V6；生成及裁切记录在 `art/work/gameplay/r11/`。

两张原始透明 RGBA 图由 built-in image_gen 生成，每张四帧；完整提示词和原始输出路径见 production.json。work/generated、final、runtime 三份像素原样保留，manifest.json 记录 SHA256 和透明像素计数。无外部来源图，不覆盖旧资源。

calibrate.cjs 仅生成 SpriteFrame 裁切与脚点元数据。旗杆/底座保持第一帧静态，旗面四帧；观众栏杆和脚保持第一帧静态，上半身四帧。锚点可位于裁切外，保证分件共同脚点，不改原图。驿站/地区/冠军各1/2/3组旗帜与观众，比赛外仅作环境表现。减少动态固定首帧，离屏不推进动画时钟。
