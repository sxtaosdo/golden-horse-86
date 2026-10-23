# 黄金赛马86 · 本地复刻工程

**当前版本：`v0.3.0.1`**

状态：开发中。本轮 Creator 2D运行修复已验证，完整原版复刻尚未验收。

Owner：当前用户；引擎：Cocos Creator 3.8.8 + TypeScript strict。所属目录：shidai3/P4000。

## 打开运行

通过Cocos-MCP/Dashboard打开本目录，再打开 `assets/GoldenHorseGame.scene` 并预览。Canvas、正交相机和游戏组件已保存，无需手工挂载。遗留 `Main.scene` 仍是原型3D场景，不作为入口。

本机工程：D:/code/shidai3/P4000/golden-horse-86；Cocos-MCP projectId：9d8a0041f7873b81；Creator安装：C:/ProgramData/cocos/editors/Creator/3.8.8。所有Creator操作统一通过Cocos-MCP；禁止手改.scene、.prefab和.meta。

左键押1分，右键撤销；C清空；Enter/空格开跑，结算后Enter下一局；F8+F9添加测试积分。加载完成前不开放比赛。全部为本地虚拟积分。

## 本轮验证

修复倾斜透视相机、缺少Canvas、错误UI层和画面裁切；修复PNG被导入为Texture但代码按SpriteFrame加载造成的空白赛道/马匹；增加加载进度及失败提示。strict类型检查通过，并修复start方法与引擎生命周期冲突。

真实Creator Preview加载24帧马匹、5张背景、7个音效；通过真实鼠标点击、C清空、Enter开跑连续完成三局，经历直道、两次弯道、对向直道与终点，运行诊断无错误。

[三局真实运行MP4](tests/actual-preview-three-rounds.mp4)：54.9秒，无声。原始采集为 tests/actual-preview-three-rounds.webm。录像直接来自Creator Preview Canvas，不是独立HTML原型或示意动画。报告：tests/three-rounds-result.json；证据与限制：tests/VERIFICATION.md。

## 未完成条件

原型参考视频 https://www.youtube.com/watch?v=CEoERPo_cg4 当前无法访问；没有取得逐帧画面或音轨。15组组合、赔率、时长、美术与演出仍沿用原型假设，不能称为原版1:1。现有PNG/WAV来自既有generate_assets.py，本轮没有伪称重新制作或原版资源。

框架/状态流程、外置规则配置与静态UI组装仍需按工作区规范接入；遗留Main场景、正式构建及产物Smoke未验收。音效加载成功不等于听感通过，当前录像没有音轨。

本轮为真实运行修复切片，不作为完整复刻项目最终交付。后续需要可访问的原版视频才能校对具体规则及表现。

## 来源与仓库

接续自 C:/Users/33272/Downloads/golden_horse_86_cocos388_v0.3.0/golden_horse_86_cocos388，保留原目录。本地独立Git已初始化；远端等待Owner提供，不向父仓提交产品源码。

主要代码：assets/scripts/RaceModel.ts（规则）、TrackVisual.ts（路径）、GoldenHorseGame.ts（表现与输入）。assets/tests/GoldenHorseTestBridge.ts仅在PREVIEW注册，不推进模拟时间或改写结果。tests/保存测试与真实运行证据；docs/RESEARCH.md记录原型假设；preview-web/是遗留独立浏览器原型，不作为Creator验收证据。

npm install后可运行npm run test:core。Creator生成temp类型配置后，用npx tsc -p tsconfig.json --noEmit --skipLibCheck执行strict检查。更新见CHANGELOG.md。
