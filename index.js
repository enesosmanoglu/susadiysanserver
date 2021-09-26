const path = require("path");
const fs = require("fs");
const sanitize = require("sanitize-filename");
const express = require("express");
const upload = require('./upload');
const ffmpeg = require('fluent-ffmpeg');
const twitch = require("twitch-m3u8");

const app = express();
//# use alternate localhost and the port Heroku assigns to $PORT
const _host = '0.0.0.0';
const _port = process.env.PORT || 3000;
let host, port;

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
app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); // to support URL-encoded bodies
//app.use(express.static("./public/"));

let vodPrototype = [
    {
        quality: '1080p60 (source)',
        resolution: '1920x1080',
        url: 'https://...'
    },
    {
        quality: '720p60',
        resolution: '1280x720',
        url: 'https://...'
    },
]
let videoPrototype = {
    streamer: "",
    name: "",
    vodId: "",
    url: "",
    startTime: "",
    duration: "",
    path: "",
}

let vods = { vodId: Object.assign({}, vodPrototype) }

app.get('/:streamer/:name/:vodId/:startTime/:duration', async function (req, res) {
    let vod = Object.assign({}, vodPrototype);
    let video = Object.assign({}, videoPrototype, req.params);

    if (vods.hasOwnProperty(video.vodId)) {
        vod = vods[video.vodId];
    } else {
        try {
            vod = await twitch.getVod(video.vodId);
            vods[video.vodId] = vod;
        } catch (error) {
            console.log("VOD ERROR:", error.message);
            res.status(404).send(error.message);
            res.end();
            return;
        }
    }

    console.log("VOD found! Selected:", vod[0].quality)
    video.url = vod[0].url;
    video.path = path.join('.', 'videos', video.streamer, sanitize(video.name) + ".mp4");
    console.log(video);

    createVideo(video)
        .then(videoPath => {
            res.sendFile(videoPath, { root: __dirname });
            res.end();
        })
        .catch(err => {
            res.status(404).send(err.message);
            res.end();
        })
})

// assuming POST: name=foo&color=red            <-- URL encoding
// or       POST: {"name":"foo","color":"red"}  <-- JSON encoding
app.post('/', async function (req, res) {
    let vod = Object.assign({}, vodPrototype);
    let video = Object.assign({}, videoPrototype);
    Object.assign(video, req.body);

    if (vods.hasOwnProperty(video.vodId)) {
        vod = vods[video.vodId];
    } else {
        try {
            vod = await twitch.getVod(video.vodId);
            vods[video.vodId] = vod;
        } catch (error) {
            console.log("VOD ERROR:", error.message);
            res.status(404).send(error.message);
            res.end();
            return;
        }
    }

    console.log("VOD found! Selected:", vod[0].quality)
    video.url = vod[0].url;
    video.path = path.join('.', 'videos', video.streamer, sanitize(video.name) + ".mp4");
    console.log(video);

    createVideo(video)
        .then(videoPath => {
            res.redirect(`${encodeURIComponent(video.streamer)}/${encodeURIComponent(sanitize(video.name))}.mp4`)
            res.end();
        })
        .catch(err => {
            res.status(404).send(err.message);
            res.end();
        })
});
app.get('/', async function (req, res) {
    console.log(req.query);
    let vod = Object.assign({}, vodPrototype);
    let video = Object.assign({}, videoPrototype);
    Object.assign(video, req.query);
    if (!video.streamer) return res.status(404).send("Need query: 'streamer'");
    if (!video.vodId) return res.status(404).send("Need query: 'vodId'");
    if (!video.name) video.name = new Date().getTime();

    video.streamer = decodeURIComponent(video.streamer);
    video.name = decodeURIComponent(video.name);

    if (vods.hasOwnProperty(video.vodId)) {
        vod = vods[video.vodId];
    } else {
        try {
            vod = await twitch.getVod(video.vodId);
            vods[video.vodId] = vod;
        } catch (error) {
            console.log("VOD ERROR:", error.message);
            res.status(404).send(error.message);
            res.end();
            return;
        }
    }

    console.log("VOD found! Selected:", vod[0].quality)
    video.url = vod[0].url;
    video.path = path.join('.', 'videos', video.streamer, sanitize(video.name) + ".mp4");
    console.log(video);

    createVideo(video)
        .then(videoPath => {
            res.redirect(`${encodeURIComponent(video.streamer)}/${encodeURIComponent(sanitize(video.name))}`);
            res.end();
        })
        .catch(err => {
            res.status(404).send(err.message);
            res.end();
        })
});

app.get('/:streamerName/:videoName.mp4', function (req, res) {
    let { streamerName, videoName } = req.params;
    streamerName = decodeURIComponent(streamerName);
    videoName = decodeURIComponent(videoName);

    let filePath = sanitize(`${videoName}`) + ".mp4";
    let videoPath = "./videos/" + streamerName + "/" + filePath;
    console.log(streamerName, '|', videoName);

    if (fs.existsSync(videoPath)) {
        res.sendFile(path.resolve(__dirname, videoPath));
    } else {
        res.sendStatus(404);
    }
});
app.get('/:streamerName/:videoName', function (req, res) {
    let { streamerName, videoName } = req.params;
    streamerName = decodeURIComponent(streamerName);
    videoName = decodeURIComponent(videoName);

    let filePath = sanitize(`${videoName}`) + ".mp4";
    let videoPath = "./videos/" + streamerName + "/" + filePath;
    console.log(streamerName, '|', videoName);

    if (fs.existsSync(videoPath)) {
        res.send(`<title>${videoName} | ${streamerName}</title><video controls style="position:absolute;left:0px;top:0px;width:-webkit-fill-available;height:-webkit-fill-available;background:#000" src="${filePath}"></video>`);
    } else {
        res.sendStatus(404);
    }
});
app.get('/:streamerName/:videoName.mp4/upload', function (req, res) {
    let { streamerName, videoName } = req.params;
    streamerName = decodeURIComponent(streamerName);
    videoName = decodeURIComponent(videoName);

    let filePath = sanitize(`${videoName}`) + ".mp4";
    let videoPath = "./videos/" + streamerName + "/" + filePath;
    console.log(streamerName, '|', videoName);

    if (fs.existsSync(videoPath)) {
        upload(streamerName, sanitize(videoName), "", "", "", false, "");
        res.send("OK");
    } else {
        res.sendStatus(404);
    }
});
app.get('/:streamerName/:videoName/upload', function (req, res) {
    let { streamerName, videoName } = req.params;
    streamerName = decodeURIComponent(streamerName);
    videoName = decodeURIComponent(videoName);

    let filePath = sanitize(`${videoName}`) + ".mp4";
    let videoPath = "./videos/" + streamerName + "/" + filePath;
    console.log(streamerName, '|', videoName);

    if (fs.existsSync(videoPath)) {
        upload(streamerName, sanitize(videoName), "", "", "", false, "");
        res.send("OK");
    } else {
        res.sendStatus(404);
    }
});

function createVideo(data = Object.assign({}, videoPrototype)) {
    return new Promise((resolve, reject) => {
        mkdirPath(data.path);

        let video = ffmpeg()
            .input(data.url);

        if (typeof data.startTime == "string" && data.startTime.includes(':')) {
            data.startTime = convertTime(data.startTime);
        }
        data.startTime = parseInt(data.startTime) || 0;

        if (data.startTime)
            video.setStartTime(data.startTime);
        if (data.duration)
            video.setDuration(data.duration);
        else if (data.endTime) {
            if (typeof data.endTime == "string" && data.endTime.includes(':')) {
                data.endTime = convertTime(data.endTime);
            }
            data.endTime = parseInt(data.endTime) || 0;

            data.duration = data.endTime - data.startTime;
            video.setDuration(data.duration);
        }

        video
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
            .output(data.path)
            .on('start', function (commandLine) {
                console.log(data);
                console.log('Query : ' + commandLine);
                console.log("\n");
            })
            .on('error', function (err) {
                console.log('\nFFMPEG Error: ' + err.message);
                reject(err);
            })
            .on('progress', function (progress) {
                process.stdout.write('Processing: ' + JSON.stringify(progress) + '\r');
            })
            .on('end', function () {
                console.log('\nFinished processing.');
                resolve(data.path);
            })
            .run();
    });
}
function uploadVideo(video = Object.assign({}, videoPrototype)) {
    upload(video.streamer, sanitize(video.name), "", "", "", false, "");
}

let server = app.listen(_port, _host, function () {
    host = server.address().address;
    port = server.address().port;

    console.log("App listening | http://%s:%s | https://%s:%s", host, port, host, port);
});

function mkdirPath(p) {
    let dirs = p.split(path.sep).slice(0, -1).map((v, i, a) => a[i] = path.join(a[i - 1] || '.', v));
    for (let i = 0; i < dirs.length; i++) {
        const dir = dirs[i];
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
            console.log("Directory created:", dir)
        }
    }
}

function convertTime(str) {
    let arr = str.split(':');
    let total = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
        const n = Number(arr[i]);
        if (!n) continue;

        total += n * (Math.pow(60, arr.length - 1 - i))
    }
    return total;
}