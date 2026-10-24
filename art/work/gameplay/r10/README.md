# r10 弯道过渡帧

状态：已选用并接入，本地验收中。Owner当前用户批准UPGRADE_PLAN V3；沿用r02像素身份，不替换原144帧。

先以h01的侧面/斜面/正面为身份参考，通过built-in image_gen生成4列4行16帧：前两行22.5°、后两行67.5°，各8步态。prototype.json保存先行脚点/方向校准；主会话目视且确认16个独立姿态、全身和透明间隔后，逐匹image_gen生成h02～h06配色版本。

[production.json](production.json)及[palette-production.json](palette-production.json)包含完整提示词、参考角色、原始输出与项目副本。calibrate.cjs仅按实际alpha间隔定位行列、计算脚点/尺寸并复制原始字节；行并非机械等分。两方向高度最多108，横向投影因子.90/.85，足点anchor.y=0；不编辑原图像素，不手写meta。原图及本批元数据保留以便追溯。
