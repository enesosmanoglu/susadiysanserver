require('dotenv').config();
const { upload } = require('youtube-videos-uploader');
let { email, pass, recoveryemail } = process.env;
upload({ email, pass, recoveryemail }, [
    {
        path: "./videos/Elraenn/Elraenn - Demo.mp4",
        title: `Demo`,
        description: "deneme"
    }
], { args: ['--no-sandbox'], headless: true, userDataDir: "./UserData" }).then(console.log)
