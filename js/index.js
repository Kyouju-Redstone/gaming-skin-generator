// 変数宣言
var alphaIndexes = [];
var skinSize = 0;

// 各Elementを取得
const skinImageInput = document.getElementById("skin_input");
const sliderInput = document.getElementById("slider");
const alphaValueInput = document.getElementById("alpha");
const canvasOriginal = document.getElementById("canvas_original");
const canvasGaming = document.createElement("canvas");
const canvasResult = document.getElementById("canvas_result");
const downloadButton = document.getElementById("download");


// 画像選択のListener
skinImageInput.addEventListener("change", async () => {

    // Formで選択した画像を取得する
    const file = skinImageInput.files[0];
    if (file == undefined) {
        return;
    }

    const skinImage = await loadInputtedImage(file).catch((e) => console.log(e));

    // 画像サイズが64x64かを確認
    if (skinImage.width != 64 || skinImage.height != 64) {
        // 画像サイズが128x128かを確認
        if (skinImage.width != 128 || skinImage.height != 128) {
            // 画像サイズが64x64または128x128以外の場合は終了
            alert("64x64または128x128の画像を選択してください")
            return;
        }
    }

    skinSize = skinImage.width;
    setOriginalCanvas(skinImage);
});


// スライダーのリスナー
sliderInput.addEventListener("input", (event) => {
    alphaValueInput.value = event.target.value;
    setGamingCanvas();
});


// アルファ値Formのリスナー
alphaValueInput.addEventListener("input", (event) => {
    var value = event.target.value;
    if (0 <= value && value <= 1) {
        sliderInput.value = value;
        setGamingCanvas();
    }
});


// ダウンロードボタンのListener
downloadButton.hidden = true;
downloadButton.onclick = (event) => {
    const file = skinImageInput.files[0];
    const isNotExistsImage = file == undefined;
    if (isNotExistsImage) {
        return;
    }

    const fileName = file.name.match(/([^/]*)\./)[1];

    const link = document.createElement("a");
    link.href = canvasResult.toDataURL("image/png");
    link.download = fileName + "_gaming.png";
    link.click();
}


async function setOriginalCanvas(skinImage) {

    // Canvasのサイズを設定
    canvasOriginal.width = skinSize;
    canvasOriginal.height = skinSize;
    const context = canvasOriginal.getContext("2d");

    // Canvasをクリアする
    context.clearRect(0, 0, skinSize, skinSize);

    // Canvasに画像をセットする
    context.drawImage(skinImage, 0, 0);

    // 画像データ・画像サイズを取得
    const imageData = context.getImageData(0, 0, skinSize, skinSize);

    // アルファ値が0のindexを取得
    alphaIndexes = [];
    for (var i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] == 0) {
            // indexをリストに追加
            alphaIndexes.push(i);
        }
    }

    setGamingCanvas();
}


async function setGamingCanvas() {
    if (skinSize == 0) {
        return;
    }

    // 画像を取得する
    const gamingImage = await loadImage("./image/gaming_128.png");

    // Canvasのサイズを設定
    canvasGaming.width = skinSize;
    canvasGaming.height = skinSize;
    var context = canvasGaming.getContext("2d");

    // Canvasをクリアする
    context.clearRect(0, 0, skinSize, skinSize);

    // Canvasに画像をセットする
    context.drawImage(gamingImage, 0, 0, gamingImage.width, gamingImage.height, 0, 0, skinSize, skinSize);

    // // スキンの透過部分と同じ箇所を切り取る
    const imageData = context.getImageData(0, 0, skinSize, skinSize);
    const alpha = sliderInput.value * 255;
    for (var i = 3; i < imageData.data.length; i += 4) {
        imageData.data[i] = alphaIndexes.includes(i) ? 0 : alpha;
    }

    // Canvasに再び画像をセットする
    context.putImageData(imageData, 0, 0);

    generateGamingSkin();
}


async function generateGamingSkin() {

    canvasResult.width = skinSize;
    canvasResult.height = skinSize;

    const contextOriginal = canvasOriginal.getContext("2d");
    const contextGaming = canvasGaming.getContext("2d");
    const contextResult = canvasResult.getContext("2d");

    for (var i = 0; i < 2; i++) {
        const gamingSkinImage = await loadImage([
            contextOriginal.canvas.toDataURL(),
            contextGaming.canvas.toDataURL(),
        ][i]);
        contextResult.drawImage(gamingSkinImage, 0, 0, skinSize, skinSize);
    }
    downloadButton.hidden = false;
}


async function loadImage(path) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(e);
        image.src = path;
    });
}


async function loadInputtedImage(file) {
    const imageUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    }).catch((e) => console.log(e));

    return loadImage(imageUrl);
}
