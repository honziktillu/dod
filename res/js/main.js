const song = new Audio();
const songs = [
  { path: "./res/songs/inzenyrska.mp3", name: "Rangers - Inženýrská" },
  { path: "./res/songs/enemy.mp3", name: "Imagine Dragons - Enemy" },
  { path: "./res/songs/3.mp3", name: "Gigi D'Agostino - L'Amour Toujours" },
  { path: "./res/songs/4.mp3", name: "Foster the People - Pumped Up Kicks" },
  { path: "./res/songs/5.mp3", name: "ТРИ ПОЛОСКИ" },
];
let songIndex = 0;
let currentSong = "";

const config = {
  video: { width: 640, height: 480, fps: 60 },
};

const landmarkColors = {
  thumb: "red",
  indexFinger: "blue",
  middleFinger: "yellow",
  ringFinger: "green",
  pinky: "pink",
  palmBase: "white",
};

const gestureStrings = {
  thumbs_up: "👍🏿",
  victory: "✌🏻",
  RockSign: "🤘",
  PointLeft: "👈",
  PointRight: "👉",
};
let firstRun = true;

async function main() {
  const title = document.getElementById("title");
  const video = document.querySelector("#pose-video");
  const canvas = document.querySelector("#pose-canvas");
  const ctx = canvas.getContext("2d");

  const resultLayer = document.querySelector("#pose-result");

  // configure gesture estimator
  // add "✌🏻" and "👍" as sample gestures
  const knownGestures = [
    fp.Gestures.VictoryGesture,
    fp.Gestures.ThumbsUpGesture,
    fp.Gestures.RockSignGesture,
    fp.Gestures.PointLeftGesture,
    fp.Gestures.PointRightGesture,
  ];
  const GE = new fp.GestureEstimator(knownGestures);

  // load handpose model
  const model = await handpose.load();
  console.log("Handpose model loaded");

  let changed = false;

  // main estimation loop
  const estimateHands = async () => {
    // clear canvas overlay
    ctx.clearRect(0, 0, config.video.width, config.video.height);
    resultLayer.innerText = "";

    // get hand landmarks from video
    // Note: Handpose currently only detects one hand at a time
    // Therefore the maximum number of predictions is 1
    const predictions = await model.estimateHands(video, true);

    for (let i = 0; i < predictions.length; i++) {
      // draw colored dots at each predicted joint position
      for (let part in predictions[i].annotations) {
        for (let point of predictions[i].annotations[part]) {
          drawPoint(ctx, point[0], point[1], 12, landmarkColors[part]);
        }
      }

      // estimate gestures based on landmarks
      // using a minimum score of 9 (out of 10)
      // gesture candidates with lower score will not be returned
      const est = GE.estimate(predictions[i].landmarks, 9);

      if (est.gestures.length > 0) {
        // find gesture with highest match score
        let result = est.gestures.reduce((p, c) => {
          return p.score > c.score ? p : c;
        });
        let delay = 2000;
        resultLayer.innerText = gestureStrings[result.name];
        if (result.name === "RockSign" && !changed) {
          if (firstRun) {
            firstRun = false;
            song.src = songs[songIndex].path;
            currentSong = songs[songIndex].name;
          }
          changed = true;
          if (song.paused) {
            song.play();
            title.innerText = `Zrovna hraje: ${currentSong}`;
            setTimeout(() => (changed = false), delay);
          } else {
            song.pause();
            title.innerText = "Hand Pose Detection";
            setTimeout(() => (changed = false), delay);
          }
        } else if (result.name === "PointLeft" && !changed) {
          if (songIndex > 0) {
            changed = true;
            songIndex--;
            song.src = songs[songIndex].path;
            currentSong = songs[songIndex].name;
            title.innerText = `Zrovna hraje: ${currentSong}`;
            song.play();
            setTimeout(() => (changed = false), delay);
          }
        } else if (result.name === "PointRight" && !changed) {
          if (songIndex < songs.length - 1) {
            changed = true;
            songIndex++;
            song.src = songs[songIndex].path;
            currentSong = songs[songIndex].name;
            title.innerText = `Zrovna hraje: ${currentSong}`;
            song.play();
            setTimeout(() => (changed = false), delay);
          }
        } else if (result.name === "victory" && !changed) {
          changed = true;
          document.body.style.background = "url(./res/img/havel.jpg)";
          document.body.style.backgroundSize = "cover";
          setTimeout(() => {
            document.body.style.background = "white";
            changed = false;
          }, delay * 2);
        } 
      }
    }

    // ...and so on
    setTimeout(() => {
      estimateHands();
    }, 1000 / config.video.fps);
  };

  estimateHands();
  console.log("Starting predictions");
}

async function initCamera(width, height, fps) {
  const constraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: width,
      height: height,
      frameRate: { max: fps },
    },
  };

  const video = document.querySelector("#pose-video");
  video.width = width;
  video.height = height;

  // get video stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

function drawPoint(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

window.addEventListener("DOMContentLoaded", () => {
  initCamera(config.video.width, config.video.height, config.video.fps).then(
    (video) => {
      video.play();
      video.addEventListener("loadeddata", (event) => {
        console.log("Camera is ready");
        main();
      });
    }
  );

  const canvas = document.querySelector("#pose-canvas");
  canvas.width = config.video.width;
  canvas.height = config.video.height;
  console.log("Canvas initialized");
});
