// 上这个网站去注册，然后将apikey填入下方
// https://tinypng.com/developers

module.exports = {
  // 这里是入口，代表你要扫描哪个文件夹下面的图片，只支持png和jpg
  enter:"./z",
  // 这里是图片路径和图片md5的映射文件
  configPath: "./pathToMD5.js",
  // apikey，可以是多个，第一个的次数用完了会自动去第二个拿。
  tinifyKeys: [
    "你的key",
  ]
}