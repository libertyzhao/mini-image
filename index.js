const tinify = require("tinify");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
function resolve(dir) {
  return path.resolve(process.cwd(), dir);
}
const config = require(resolve(process.env.IMAGE_CONFIG));

var enter = resolve(config.enter) || "";
var configPath = resolve(config.configPath) || "";
var tinifyKeys = config.tinifyKeys || [];
var tinifyKeyIndex = 0;
// 记录因为错误而需要重新压缩的图片队列，errEndImgIndex为终点
var errImg = false; // 出现错误的img的开关
var errEndImgIndex = -1; // 出现错误的img的队尾的下标
var oldPathToMD5 = require(configPath);

tinify.key = tinifyKeys[tinifyKeyIndex];

init();

async function init() {
  //检查是否需要优化, newPathToMD5只包含旧的图片md5映射，未压缩的图片映射会在压缩之后再注入。
  var { updateImgs, newPathToMD5 } = checkOptimize(enter, oldPathToMD5);
  // 分批进行图片压缩，10个为一组
  if (updateImgs.length > 0) {
    console.log("有新的img");
    var i = 0,
      imgs = updateImgs.slice(i * 10, 10 * (i + 1));
    for (i++; imgs.length > 0; i++) {
      console.log(`压缩${imgs.length}个`);
      await chunkOptimize(imgs, newPathToMD5);
      imgs = updateImgs.slice(i * 10, 10 * (i + 1));
    }
    console.log("压缩结束");
  } else {
    console.log("没有新的img");
  }
}

async function chunkOptimize(updateImgs, newPathToMD5) {
  await optimize(updateImgs, (filePath, data) => {
    const md5 = crypto.createHash("md5");
    newPathToMD5[filePath] = md5.update(data).digest("hex");
  });
  //将新的路径对应的md5写入文件
  fs.writeFileSync(
    configPath,
    `module.exports = ${JSON.stringify(newPathToMD5)}`,
    "utf8"
  );
}

function optimize(updateImgs, cb) {
  return new Promise((rs, rj) => {
    var finishIdx = 0;
    updateImgs.forEach((filePath, index) => {
      fs.readFile(filePath, async (err, data) => {
        if (err) throw err;
        // 记录因为错误而需要重新压缩的图片队列，errEndImgIndex为终点
        if (errImg) {
          errEndImgIndex = index;
          errImg = false;
        }
        // 存在第三张图片比第一张图片先压缩完的情况，所以如果直接用index不准确。
        // 上传图片压缩
        await updateImg(data, filePath, index, cb, updateImgs.length);
        if (finishIdx++ === updateImgs.length - 1) {
          rs();
        }
      });
    });
  }).catch(err => {
    console.log(err);
  });
}

let updateIdx = 0;
// 上传图片压缩
function updateImg(data, filePath, index, cb, length) {
  return new Promise((rs, rj) => {
    console.log(`开始压缩：${filePath}`);
    updateIdx++;
    //这里说是toBuffer，其实也是一包就把数据给出了。
    tinify.fromBuffer(data).toBuffer(async (err, resultData) => {
      if (err) await tinifyErrorHandler(err, data, filePath, index, cb, length);
      else {
        console.log(`写入：${filePath}`);
        let writeStream = fs.createWriteStream(filePath, "utf8");
        writeStream.write(resultData);
        cb(filePath, resultData);
      }
      rs();
    });
  }).catch(err => {
    console.log(err);
  });
}

function tinifyErrorHandler(err, data, filePath, index, cb, length) {
  if (err instanceof tinify.AccountError) {
    if (tinifyKeyIndex < tinifyKeys.length) {
      if (index >= errEndImgIndex) {
        console.log("当前key用光了，打算换一个key重试");
        tinifyKeyIndex++;
        tinify.key = tinifyKeys[tinifyKeyIndex];
        errEndImgIndex = length - 1;
        errImg = true;
      }
      return updateImg(data, filePath, index, cb, length);
    }
    console.log("请注意：你的所有的key的次数都已经用完了。");
  } else if (err instanceof tinify.ClientError) {
    console.log(
      "由于提交的数据存在问题，请求无法完成。异常消息将包含更多信息。您不应该重试请求。"
    );
  } else if (err instanceof tinify.ServerError) {
    console.log(
      "由于Tinify API的暂时性问题，请求无法完成。几分钟后重试请求是安全的。"
    );
    console.log("正在重试。。。");
    return updateImg(data, filePath, index, cb, length);
  } else if (err instanceof tinify.ConnectionError) {
    console.log(
      "该请求无法发送，因为连接到Tinify API时出现问题。你应该验证你的网络连接。重试请求是安全的。"
    );
    console.log("正在重试。。。");
    return updateImg(data, filePath, index, cb, length);
  } else {
    console.log("是不是kinso又写了什么懵逼代码。。");
    console.log(err);
  }
}

/**
 *  PathToMD5 = {img1_path:img1_md5,img2_path:img2_md5}
 */
function checkOptimize(enter, oldPathToMD5) {
  var newPathToMD5 = createPathToMD5(enter),
    updateImgs = [];
  for (var p in newPathToMD5) {
    if (newPathToMD5[p] !== oldPathToMD5[p]) {
      updateImgs.push(p);
      delete newPathToMD5[p];
    }
  }
  return { updateImgs, newPathToMD5 };
}

// 遍历入口文件，找到png、jpg和其对应的md5
function createPathToMD5(enter) {
  let PathToMD5 = {};
  dfsReadDir(enter, filePath => {
    const key = filePath.replace(process.cwd(),'');
    const md5 = crypto.createHash("md5");
    PathToMD5[key] = md5.update(fs.readFileSync(filePath)).digest("hex");
  });
  return PathToMD5;
}

function dfsReadDir(dirPath, cb) {
  var files = fs.readdirSync(dirPath, "utf-8");
  files.forEach(file => {
    var filePath = path.resolve(dirPath, file);
    var stats = fs.statSync(filePath);
    if (stats.isFile()) {
      if (filePath.match(/((jpe?g)|(png))$/)) {
        cb(filePath);
      }
    } else if (stats.isDirectory()) {
      dfsReadDir(filePath, cb);
    }
  });
}
