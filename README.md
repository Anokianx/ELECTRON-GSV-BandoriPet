# ELECTRON-GSV-BandoriPet
基于ELECTRON架构开发的BanG Dream 桌宠程序。该项目完全开源，可用于进行后续开发以及参考。（不包含GSV运行库）
## Features
- Node 模块整合
- Electron API 调用
- 系统脚本调度
- 子进程管理
- IPC 通信
- Live2D 渲染
- GSV 语音交互
- 桌面功能整合
## Requirements
- Windows 10/11
- Electron 20+
- Node.js 16+
- Python 3.10+
- C++ Runtime
- MSVC Runtime
- Visual Studio Build Tools
- GPT-SoVITS（GSV）
## Notes
在下载仓库文件后自行配置nodejs：`npm install`

如果你要继续使用GSV的TTS，建议的方案：

①在项目文件夹`GPT-SoVITS`自行添加你自己的GSV运行库。

配置角色的语音模型：在主源码开头的`voiceConfigs`常量里修改相对路径（注意此时你修改的路径必须和任何角色的模型文件路径相符）

例：模型路径：`GPT-SoVITS\GPT_weights_v2ProPlus\XXX.CKPT`
    主源码相对路径：`GPT-SoVITS\GPT_weights_v2ProPlus\XXX.CKPT`
    步数文件以及参考音频同上。
    
②修改GSV运行路径。

在主源码`startsovits`函数内，找到`sovitsDir`常量，把=之后的路径改为你的GSV运行库的绝对路径。

目前本程序的GSV运行效果尚有改进空间，可以自己试着优化。
作者完全支持并且鼓励任何开发者在此基础上进行的自主开发或者借鉴。

联系方式：
Discord:`https://discord.gg/YEaU3Fzq`

Telegram:`@caEloP`

QQ:`827677473`

Email:`caeloaukn@gmail.com/epta827677473@gmail.com`
    
