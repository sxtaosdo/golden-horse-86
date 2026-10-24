# r09赛前动作与音频

状态：已选用并接入，本地运行验证完成，未发布。Owner当前用户批准赛前氛围与随机广角方案；音频听感未验。

六张独立侧视待机图各10帧：呼吸/缰绳/尾部0～3，低头4～5，前蹄6～7，骑手压低准备8～9；旗手6帧为低旗微动0～1、举旗2～3、落旗4～5。原144帧奔跑图不覆盖。

所有PNG来自built-in image_gen。原图、完整提示词和参考路径见[production.json](../../../work/gameplay/r09/production.json)；h05修订提示词见[repair.json](../../../work/gameplay/r09/repair.json)，原版相邻图触碰，保留在work而不采用。读取alpha边界生成纯元数据裁切，统一足点和世界尺寸；不改原图像素。[calibrate.cjs](../../../work/gameplay/r09/calibrate.cjs)为本批资源的元数据/副本制作配方，从产品根目录运行。

五个WAV为本项目原创程序合成：8秒无可辨文字的柔和人群/环境音、倒数、电子广播、门锁、蹄点，22050Hz PCM16单声道。audio-recipe.py和manifest.json保留配方、哈希与波形指标；不使用真人口播或外部录音。当前工具不支持声音输入，不能将波形校验声明为听感验收。

原图、final与Runtime三份文件SHA-256见[manifest.json](manifest.json)；运行裁切在assets/resources/race/pre-race-art.json。实现合同见[赛前演出](../../../../docs/PRE_RACE_PRESENTATION.md)，最终运行记录见[验收](../../../../tests/PRE_RACE.md)。66帧均有独立裁切且通过透明边界与真实画面检查；保留所有选用资源原始像素。
