#### 一个调用 TinyPNG 接口做图片压缩的小工具

图片压缩里面 TinyPNG 压缩的是非常好的，然而这里每次让前端拿到设计的图片之后，手动到网上压缩，实在太恶心和浪费时间了，这种事情就应该工程化解决。



#### 使用方式

```shell
npm install --save-dev mini-image
```

package.json中加入

```javascript
"scripts": {
    "image":"IMAGE_CONFIG=./config.js node ./node_modules/mini-image"
  },
```

此处 **IMAGE_CONFIG** 环境变量代表配置文件的路径。

执行 `npm run image` 。即可开始压缩。



####config.js配置文件

```javascript
module.exports = {
  // 这里是入口，代表你要扫描哪个文件夹下面的图片，只支持png和jpg
  // 相对于项目的根路径
  enter:"./z",
  // 这里是图片路径和图片md5的映射文件
  // 相对于项目的根路径
  configPath: "./pathToMD5.js",
  // apikey，可以是多个，第一个的次数用完了会自动去第二个拿。
  tinifyKeys: [
    "你的key",
  ]
}
```

**enter**：这里指需要压缩哪个目录下的图片。工具会扫描该目录下的所有jpg或者png的图片，然后将图片生成对应md5，将该md5和以前图片的md5做比较，如果相同，则证明图片不需要压缩，如果md5不同，则可能是你添加了一个同名的图片覆盖了或者是添加了新的图片，所以会重新压缩。

**configPath**：这里是将图片的路径和它对应的md5保存起来，方便下一次压缩图片的时候做diff参照，注意这个config非常重要，会作为下一次是否压缩该图片的依据。这个config应该传到git仓库，所有开发同步。

**tinifyKeys**：这里是TinyPNG的apikey，每个key每个月有500次免费的压缩次数，可以让公司的同事都帮忙注册一下，这样就有十几个号，一般来说也就够用了。



开始的时候 **configPath** 的文件是空的，所以需要一次初始化，初始化就是执行工具来打包当前项目里面的所有图片，打包一次之后**configPath**文件里面就会有图片路径对应的md5了，**但是要注意的是：第一次初始化会压缩项目里面的所有图片，所以第一次会消耗的压缩次数特别多，请注意好apikey的次数是否足够**



图片压缩这种东西本来就应该作为工程化的一部分，你可以在任何你觉得需要压缩的时候去压缩