const path = require("path");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const express = require("express");
const app = express();
const Busboy = require("busboy");
const upload = require('./upload');
const ffmpeg = require('fluent-ffmpeg');

app.use(function (req, res, next) {
    // Anti-cors
    req.header("Access-Control-Allow-Origin", "*");
    req.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});
app.use(express.static("./public/"));

app.get('/:streamerName/:videoName/:videoUrl/:startTime/:duration', function (req, res) {
    let { streamerName, videoName, videoUrl, startTime, duration } = req.params;
    videoUrl = decodeURIComponent(videoUrl);
    //thumbnailName = decodeURIComponent(thumbnailName).split('\\n').join('\n');
    let data = { streamerName, videoName, videoUrl, startTime, duration, videoPath: path.join('.', 'videos', streamerName, sanitize(videoName) + ".mp4") };
    console.log(data)

    if (!fs.existsSync(path.join('.', 'videos')))
        fs.mkdirSync(path.join('.', 'videos'));
    if (!fs.existsSync(path.join('.', 'videos', streamerName)))
        fs.mkdirSync(path.join('.', 'videos', streamerName));

    //return upload(streamerName, sanitize(videoName), "", "", "", false, "");
    let video = ffmpeg()
        .input(videoUrl)
        .setStartTime(startTime)
        .setDuration(duration)
        //.input("https://media.discordapp.net/attachments/883282447758934076/883286405776834600/ust_logo.png")
        /* .complexFilter([
            "[0:v]scale=1920:-1[bg];[bg][1:v]overlay=W/2-w/2:30"
        ]) */
        .addOption('-vcodec', 'copy')
        .addOption('-acodec', 'copy')
        .addOption('-crf', 23)
        .addOption('-aspect', '1920:1080')
        .addOption('-q:a', '1')
        .addOption('-q:v', '1')
        .addOption('-b:v', '5000k')
        .addOption('-minrate', '6000k')
        .addOption('-maxrate', '6000k')
        .addOption('-bufsize', '5000k')
        .output(data.videoPath)
        .on('start', function (commandLine) {
            console.log('Query : ' + commandLine);
            console.log("\n");
        })
        .on('error', function (err) {
            console.log('\nError: ' + err.message);
        })
        .on('progress', function (progress) {
            process.stdout.write('Processing: ' + JSON.stringify(progress) + '\r');
        })
        .on('end', function () {
            console.log('\nFinished processing.');
            upload(streamerName, sanitize(videoName), "", "", "", false, "");
        })
        .run()

    res.send(JSON.stringify(data, null, 4))
    res.end();
})

//# use alternate localhost and the port Heroku assigns to $PORT
const host = '0.0.0.0';
const port = process.env.PORT || 3000;
let server = app.listen(port, host, function () {
    let host = server.address().address;
    let port = server.address().port;

    console.log("Example app listening at http://%s:%s", host, port);
});
