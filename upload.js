require('dotenv').config();
const { upload } = require('./upload_module.js');
const sanitize = require("sanitize-filename");
const fs = require('fs');
const fetch = require('node-fetch');

var downloadAsync = function (url, filename) {
    return new Promise(async (resolve, reject) => {
        const response = await fetch(new URL(url).href);
        const buffer = await response.buffer();
        fs.writeFile(filename, buffer, resolve);
    })
};

//     \ / : * ? " < > |
let streamerName = process.argv.slice(2)[0];
let videoName = process.argv.slice(2)[1];
let watchUrl = process.argv.slice(2)[2];
let keywords = process.argv.slice(2)[3];
let hashtags = process.argv.slice(2)[4];
let shareAfterHD = process.argv.slice(2)[5] == 'true';
let thumbnailPath = process.argv.slice(2)[6];

module.exports = (streamerName, videoName, watchUrl, keywords, hashtags, shareAfterHD, thumbnailPath) => {
    let filePath = sanitize(`${videoName}`) + ".mp4";

    let videoPath = "./videos/" + streamerName + "/" + filePath;
    if (!fs.existsSync(videoPath))
        return console.log("Video can't found:", videoPath);

    let _thumbnailPath = "./thumbnails/" + streamerName + "/" + sanitize(`${videoName}`) + '.png';


    (async () => {
        if (thumbnailPath && thumbnailPath.startsWith('http')) {
            if (!fs.existsSync("./thumbnails/"))
                fs.mkdirSync("./thumbnails/")
            if (!fs.existsSync("./thumbnails/" + streamerName))
                fs.mkdirSync("./thumbnails/" + streamerName)
            console.log(fs.existsSync(_thumbnailPath), _thumbnailPath);
            if (!fs.existsSync(_thumbnailPath)) {
                await downloadAsync(thumbnailPath, _thumbnailPath);
                console.log("Thumbnail downloaded!")
            } else {
                console.log("Thumbnail found!")
            }
            thumbnailPath = _thumbnailPath;
        }

        let description = watchUrl ? `┌──╢ İzlenen Video ╟──●\n└─› ${watchUrl}\n\n` : "";

        if (fs.existsSync("./descriptions/" + streamerName + ".txt")) {
            let lines = fs.readFileSync("./descriptions/" + streamerName + ".txt", "utf8").replace(/\r/g, '').split("\n");

            let streamerSocialMedia = [];
            if (lines.length > 1) {
                streamerSocialMedia.push(`──╢ ${lines[0].trim()} ╟──●`);

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];
                    const site = lines[i].split(' ')[0];
                    const url = lines[i].replace(site, "").trim();
                    streamerSocialMedia.push(`─${site}─› ${url}`);
                }
            }

            streamerSocialMedia.forEach((v, i, a) => {
                if (i == 0) {
                    a[i] = "┌" + a[i];
                } else if (i == a.length - 1) {
                    a[i] = "└" + a[i];
                } else {
                    a[i] = "├" + a[i];
                }
            });

            if (streamerSocialMedia.length)
                description += streamerSocialMedia.join('\n') + '\n';
        }

        let hashtagsArr = hashtags.split(',').map(h => h.trim()).filter(h => h);
        if (hashtagsArr.length) {
            let hashtagsDescArr = [
                "──╢ Hashtag'ler ╟──●",
            ];

            hashtagsArr.forEach(hashtag => {
                hashtagsDescArr.push("─› #" + hashtag);
            });

            hashtagsDescArr.forEach((v, i, a) => {
                if (i == 0) {
                    a[i] = "┌" + a[i];
                } else if (i == a.length - 1) {
                    a[i] = "└" + a[i];
                } else {
                    a[i] = "├" + a[i];
                }
            });

            description += `\n${hashtagsDescArr.join('\n')}\n`;
        }
        //description += fs.existsSync("./descriptions/" + streamerName + ".txt") ? fs.readFileSync("./descriptions/" + streamerName + ".txt", "utf8") : "";

        description += `
    ┌──╢ Susadıysan Twitch ╟──●
    ├─› En Hızlı ve En Kaliteli Yayın Kesitleri
    ├─› Kaldırılmasını istediğiniz videolar için lütfen mail üzerinden ulaşınız.
    └─› susadiysandwitch@gmail.com
    `;

        let playlist = "Susadıysan " + streamerName;

        console.log(streamerName);

        // Returns uploaded video links in array 
        let { email, pass, recoveryemail } = process.env;
        upload({ email, pass, recoveryemail }, [
            {
                path: videoPath,
                title: `${videoName}`,
                description,
                privacy: "Draft",
                playlist,
                addCartPlaylist: playlist,
                shareAfterHD,
                tags: keywords.split(',').map(k => k.trim()).filter(k => k),
                thumbnail: thumbnailPath,
            }
        ], { args: ['--no-sandbox'], headless: true, userDataDir: "./UserData" }).then(console.log)
    })();
}

