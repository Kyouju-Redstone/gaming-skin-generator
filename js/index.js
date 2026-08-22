// 変数宣言
var alphaIndexes = [];
var skinSize = 0;
var skinViewer = null;
var orbitControls = null;

// 各Elementを取得
const skinImageInput = document.getElementById("skin_input");
const dropzone = document.getElementById("dropzone");
const fileStatus = document.getElementById("file_status");
const errorMessage = document.getElementById("error_message");
const sliderInput = document.getElementById("slider");
const alphaValueInput = document.getElementById("alpha");
const canvasOriginal = document.getElementById("canvas_original");
const canvasGaming = document.createElement("canvas");
const canvasResult = document.getElementById("canvas_result");
const downloadButton = document.getElementById("download");

const canvas3d = document.getElementById("canvas_3d");
const viewerPlaceholder = document.getElementById("viewer_placeholder");
const modelTypeSelect = document.getElementById("model_type");
const animationTypeSelect = document.getElementById("animation_type");
const autoRotateCheckbox = document.getElementById("auto_rotate");
const resetCameraButton = document.getElementById("reset_camera");


// 画像選択のListener
skinImageInput.addEventListener("change", async () => {
    await handleSelectedFile(skinImageInput.files[0]);
});


// ドラッグ＆ドロップ対応
["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragover");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragover");
    });
});

dropzone.addEventListener("drop", async (event) => {
    const file = event.dataTransfer.files[0];
    if (file == undefined) {
        return;
    }
    // input要素にも反映させておく（ダウンロード時のファイル名取得のため）
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    skinImageInput.files = dataTransfer.files;

    await handleSelectedFile(file);
});


// スライダーのリスナー
sliderInput.addEventListener("input", (event) => {
    alphaValueInput.value = event.target.value;
    setGamingCanvas();
});


// アルファ値Formのリスナー
alphaValueInput.addEventListener("input", (event) => {
    var value = event.target.value;
    if (value === "" || isNaN(value)) {
        return;
    }
    value = Math.min(1, Math.max(0, Number(value)));
    sliderInput.value = value;
    setGamingCanvas();
});

alphaValueInput.addEventListener("blur", (event) => {
    event.target.value = Number(sliderInput.value).toFixed(2);
});


// ダウンロードボタンのListener
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


// 3Dビューアーの操作Listener
modelTypeSelect.addEventListener("change", () => {
    updateSkinViewerTexture();
});

animationTypeSelect.addEventListener("change", () => {
    applyAnimation();
});

autoRotateCheckbox.addEventListener("change", (event) => {
    if (skinViewer) {
        skinViewer.autoRotate = event.target.checked;
    }
});

resetCameraButton.addEventListener("click", () => {
    resetCamera();
});


async function handleSelectedFile(file) {
    hideError();

    if (file == undefined) {
        return;
    }

    if (file.type !== "image/png") {
        showError("PNG形式の画像を選択してください");
        return;
    }

    const skinImage = await loadInputtedImage(file).catch((e) => console.log(e));
    if (!skinImage) {
        showError("画像の読み込みに失敗しました");
        return;
    }

    // 画像サイズが64x64かを確認
    if (skinImage.width != 64 || skinImage.height != 64) {
        // 画像サイズが128x128かを確認
        if (skinImage.width != 128 || skinImage.height != 128) {
            // 画像サイズが64x64または128x128以外の場合は終了
            showError("64×64または128×128の画像を選択してください（選択された画像: " + skinImage.width + "×" + skinImage.height + "）");
            return;
        }
    }

    skinSize = skinImage.width;
    fileStatus.textContent = file.name + "（" + skinImage.width + "×" + skinImage.height + "）を読み込みました";
    fileStatus.classList.add("is-ready");

    setOriginalCanvas(skinImage);
}


function showError(text) {
    errorMessage.textContent = text;
    errorMessage.hidden = false;
}

function hideError() {
    errorMessage.hidden = true;
    errorMessage.textContent = "";
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

    // 3Dプレビューは、ゲーミング加工の成否を待たずに
    // 読み込んだ元スキンでまず表示する
    updateSkinViewerTexture(canvasOriginal);

    setGamingCanvas();
}


async function setGamingCanvas() {
    if (skinSize == 0) {
        return;
    }

    // 画像を取得する
    const gamingImage = await loadImage("./image/gaming_128.png").catch((e) => {
        console.log(e);
        return null;
    });

    if (!gamingImage) {
        // ゲーミング画像が読み込めない場合は、元スキンをそのまま
        // 結果プレビューとして表示し、ユーザーにエラーを伝える
        showError("ゲーミング画像（image/gaming_128.png）を読み込めませんでした。ファイル構成をご確認ください。");
        copyOriginalToResult();
        return;
    }

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

    updateSkinViewerTexture(canvasResult);
}


// ゲーミング画像が読み込めない場合のフォールバック表示
function copyOriginalToResult() {
    canvasResult.width = skinSize;
    canvasResult.height = skinSize;
    const contextResult = canvasResult.getContext("2d");
    contextResult.clearRect(0, 0, skinSize, skinSize);
    contextResult.drawImage(canvasOriginal, 0, 0);
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


/* ------------------ 3Dプレイヤープレビュー ------------------ */

function ensureSkinViewer() {
    if (skinViewer || typeof skinview3d === "undefined") {
        return;
    }

    skinViewer = new skinview3d.SkinViewer({
        canvas: canvas3d,
        width: 260,
        height: 340,
    });

    skinViewer.fov = 55;
    skinViewer.zoom = 0.85;
    skinViewer.autoRotate = autoRotateCheckbox.checked;
    skinViewer.autoRotateSpeed = 1.0;

    orbitControls = skinview3d.createOrbitControls(skinViewer);
    orbitControls.enableRotate = true;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = false;

    applyAnimation();
}


// sourceCanvas省略時は、直近で生成したゲーミング結果Canvasを使用する
async function updateSkinViewerTexture(sourceCanvas) {
    if (skinSize == 0) {
        return;
    }

    sourceCanvas = sourceCanvas || canvasResult;

    ensureSkinViewer();
    if (!skinViewer) {
        // ライブラリの読み込みが間に合っていない場合は少し待って再試行
        setTimeout(() => updateSkinViewerTexture(sourceCanvas), 200);
        return;
    }

    // 3Dモデルは標準の64x64テクスチャを前提とするため、
    // 128x128の場合は縮小してから読み込む
    let textureCanvas = sourceCanvas;
    if (skinSize == 128) {
        const downscaled = document.createElement("canvas");
        downscaled.width = 64;
        downscaled.height = 64;
        const downscaledContext = downscaled.getContext("2d");
        downscaledContext.imageSmoothingEnabled = false;
        downscaledContext.drawImage(sourceCanvas, 0, 0, 64, 64);
        textureCanvas = downscaled;
    }

    try {
        await skinViewer.loadSkin(textureCanvas.toDataURL("image/png"), {
            model: modelTypeSelect.value,
        });
        viewerPlaceholder.hidden = true;
    } catch (e) {
        console.log(e);
    }
}


function applyAnimation() {
    if (!skinViewer) {
        return;
    }

    switch (animationTypeSelect.value) {
        case "walk":
            skinViewer.animation = new skinview3d.WalkingAnimation();
            break;
        case "run":
            skinViewer.animation = new skinview3d.RunningAnimation();
            break;
        default:
            skinViewer.animation = new skinview3d.IdleAnimation();
            break;
    }
}


function resetCamera() {
    if (!skinViewer) {
        return;
    }
    skinViewer.zoom = 0.85;
    if (orbitControls) {
        orbitControls.reset();
    }
}
