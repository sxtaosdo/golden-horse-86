# r10 六马转向过渡资源

状态：已选用接入，三尺寸实际运行与正式同包Smoke通过，未发布。六马各16帧，共96帧，补足22.5°/67.5°方向；镜像构成112.5°/157.5°，原144帧保持。

来源为built-in image_gen，原图、完整提示词和先行h01验证记录见[制作记录](../../../work/gameplay/r10/README.md)。[manifest.json](manifest.json)记录source/final/Runtime三份副本SHA-256；运行裁切为assets/resources/race/turn-art.json，由绑定Creator生成meta。

每帧的透明裁切、脚点、96个独立像素姿态、九方向和八步态映射已通过TurnArtwork.test；实际Creator三尺寸与正式产物验收见[优化验收](../../../../tests/UPGRADE.md)。
