// 定数宣言
const ALPHA_TRANSPARENT = 0;

// 各Elementを取得
const elSkinImageInput = document.getElementById("skin_input");
const elDropzone = document.getElementById("dropzone");
const elFileStatus = document.getElementById("file_status");
const elErrorMessage = document.getElementById("error_message");
const elSliderInput = document.getElementById("slider");
const elAlphaValueInput = document.getElementById("alpha");
const elCanvasOriginalSkin = document.getElementById("canvas_original");
const elCanvasGamingSkin = document.getElementById("canvas_gaming");
const elCanvasGamingImage = document.createElement("canvas");
const elCanvasLayerEditing = document.createElement("canvas");
const elDownloadButton = document.getElementById("download");

const elCanvas3d = document.getElementById("canvas_3d");
const elViewerPlaceholder = document.getElementById("viewer_placeholder");
const elModelTypeSelect = document.getElementById("model_type");
const elAnimationTypeSelect = document.getElementById("animation_type");
const elAutoRotateCheckbox = document.getElementById("auto_rotate");
const elResetCameraButton = document.getElementById("reset_camera");

// 変数宣言
let skinImage;
let gamingImage;
let skinNonAlphaIndexList = [];
let alphaIndexes = [];
let skinViewer = null;
let orbitControls = null;
let initialZoom = 0.85;

function main() {
    // 初期化を行う
    initialize();
}

function initialize() {
    // ゲーミング画像を読み込んでおく
    readGamingImage();

    // 3Dビューアーは先に生成しておく
    // (スキン選択直後にビューアー生成とloadSkinを同時に行うと
    //  初回だけ描画されないことがあるため、あらかじめ生成しておく)
    ensureSkinViewer();

    // 画像選択のListener
    elSkinImageInput.addEventListener("change", async () => {
        // ファイル選択後の処理を実行
        await handleSelectedFile(elSkinImageInput.files[0]);
    });

    // ドラッグ＆ドロップ対応
    ["dragenter", "dragover"].forEach((eventName) => {
        elDropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            elDropzone.classList.add("is-dragover");
        });
    });

    ["dragleave", "drop"].forEach((eventName) => {
        elDropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            elDropzone.classList.remove("is-dragover");
        });
    });

    elDropzone.addEventListener("drop", async (event) => {
        const file = event.dataTransfer.files[0];
        if (file == undefined) {
            return;
        }
        // input要素にも反映させておく（ダウンロード時のファイル名取得のため）
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        elSkinImageInput.files = dataTransfer.files;

        // ファイル選択後の処理を実行
        await handleSelectedFile(file);
    });

    // アルファ値スライダーのリスナー
    elSliderInput.addEventListener("input", async (event) => {
        // アルファ値Inputへ値を反映
        elAlphaValueInput.value = event.target.value;

        // ゲーミングCanvasへ反映
        cutGamingImageFromCanvas();
        changeGamingImageAlphaToCanvas();
        await setGamingSkinToCanvas();

        // 3Dプレビューにも反映
        updateSkinViewerTexture();
    });

    // アルファ値Inputのリスナー
    elAlphaValueInput.addEventListener("input", async (event) => {
        var value = event.target.value;
        if (value === "" || isNaN(value)) {
            return;
        }
        // 最小値0、最大値1になるように設定
        value = Math.min(1, Math.max(0, Number(value)));
        elSliderInput.value = value;

        // ゲーミングCanvasへ反映
        cutGamingImageFromCanvas();
        changeGamingImageAlphaToCanvas();
        await setGamingSkinToCanvas();

        // 3Dプレビューにも反映
        updateSkinViewerTexture();
    });

    elAlphaValueInput.addEventListener("blur", (event) => {
        // 0.00フォーマットに変換する
        event.target.value = Number(elSliderInput.value).toFixed(2);
    });


    // ダウンロードボタンのListener
    elDownloadButton.onclick = (event) => {
        // ファイルを取得
        const file = elSkinImageInput.files[0];
        if (undefined == file) {
            return;
        }

        // ファイル名を取得
        const fileName = file.name.match(/([^/]*)\./)[1];

        // ダウンロード用リンクを作成
        const link = document.createElement("a");
        link.href = elCanvasGamingSkin.toDataURL("image/png");
        link.download = fileName + "_gaming.png";

        // クリック判定を行いダウンロードさせる
        link.click();
    }

    // 3Dビューアーの操作Listener
    elModelTypeSelect.addEventListener("change", () => {
        updateSkinViewerTexture();
    });

    elAnimationTypeSelect.addEventListener("change", () => {
        applyAnimation();
    });

    elAutoRotateCheckbox.addEventListener("change", (event) => {
        if (skinViewer) {
            skinViewer.autoRotate = event.target.checked;
        }
    });

    elResetCameraButton.addEventListener("click", () => {
        resetCamera();
    });
}

// ファイル選択後処理
async function handleSelectedFile(file) {
    // エラー文を削除
    hideError();

    if (undefined == file) {
        return;
    }

    if (file.type !== "image/png") {
        showError("PNG形式の画像を選択してください");
        return;
    }

    // 選択画像を読み込む
    skinImage = await loadInputtedImage(file).catch((e) => console.log(e));
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

    elFileStatus.textContent = file.name + "（" + skinImage.width + "×" + skinImage.height + "）を読み込みました";
    elFileStatus.classList.add("is-ready");

    // スキン画像をCanvasへ表示する
    await setOriginalSkinToCanvas();

    // ゲーミング画像をCanvasへ設定する
    cutGamingImageFromCanvas();
    changeGamingImageAlphaToCanvas();

    // ゲーミングスキン画像をCanvasへ表示する
    initGamingSkinCanvas();
    await setGamingSkinToCanvas();

    // 3Dプレビューを表示する
    updateSkinViewerTexture()
}

function showError(text) {
    elErrorMessage.textContent = text;
    elErrorMessage.hidden = false;
}

function hideError() {
    elErrorMessage.hidden = true;
    elErrorMessage.textContent = "";
}

// スキン画像をCanvasへセットする
async function setOriginalSkinToCanvas() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    // Canvasのサイズを設定
    elCanvasOriginalSkin.width = skinSize;
    elCanvasOriginalSkin.height = skinSize;

    // 各Canvasを取得
    const contextOriginalSkin = elCanvasOriginalSkin.getContext("2d");

    // Canvasをクリアする
    contextOriginalSkin.clearRect(0, 0, skinSize, skinSize);

    // 画像をセットする
    contextOriginalSkin.drawImage(skinImage, 0, 0);
}

function cutGamingImageFromCanvas() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    elCanvasGamingImage.width = skinSize;
    elCanvasGamingImage.height = skinSize;

    // 各Canvasを取得
    const contextOriginalSkin = elCanvasOriginalSkin.getContext("2d");
    const contextGamingImage = elCanvasGamingImage.getContext("2d");

    // Canvasをクリアする
    contextGamingImage.clearRect(0, 0, skinSize, skinSize);

    // 画像をセットする
    contextGamingImage.drawImage(gamingImage, 0, 0, gamingImage.width, gamingImage.height, 0, 0, skinSize, skinSize);

    // スキン画像の不透明部分に合わせてゲーミング画像を切り抜く
    // RGBAのアルファ部分のみをループする -> 配列の中身: [ 0:R, 1:G, 2:B, 3:A, 4:R, 5:G, 6:B, 7:A ... ]
    const skinImageRBGA = contextOriginalSkin.getImageData(0, 0, skinSize, skinSize);
    const gamingImageRGBA = contextGamingImage.getImageData(0, 0, skinSize, skinSize);
    skinNonAlphaIndexList = [];
    for (var i = 3; i < skinImageRBGA.data.length; i += 4) {
        // スキン画像の指定ピクセルが透明(Alpha=0)の場合
        if (ALPHA_TRANSPARENT == skinImageRBGA.data[i]) {
            // ゲーミング画像のピクセルを透明にする
            gamingImageRGBA.data[i] = ALPHA_TRANSPARENT;
        }
        else {
            // indexをリストに追加
            skinNonAlphaIndexList.push(i);
        }
    }

    // Canvasに切り取ったゲーミング画像をセットする
    contextGamingImage.putImageData(gamingImageRGBA, 0, 0);
}

function changeGamingImageAlphaToCanvas() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    // Canvasを取得
    const contextGamingImage = elCanvasGamingImage.getContext("2d");

    // Canvasから画像データ(RGBA)を取得
    const gamingImageRGBA = contextGamingImage.getImageData(0, 0, skinSize, skinSize);

    // アルファ値を適用する
    const alpha = elSliderInput.value * 255;
    for (var i = 0; i < skinNonAlphaIndexList.length; i++) {
        const nonAlphaIndex = skinNonAlphaIndexList[i];
        gamingImageRGBA.data[nonAlphaIndex] = alpha;
    }

    // アルファ値を適用させた画像をCanvasにセットする
    contextGamingImage.putImageData(gamingImageRGBA, 0, 0);
}

function initGamingSkinCanvas() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    // Canvasのサイズを設定
    elCanvasGamingSkin.width = skinSize;
    elCanvasGamingSkin.height = skinSize;
    elCanvasLayerEditing.width = skinSize;
    elCanvasLayerEditing.height = skinSize;

    // Canvasを取得
    const contextGamingSkin = elCanvasGamingSkin.getContext("2d");

    // Canvasをクリアする
    contextGamingSkin.clearRect(0, 0, skinSize, skinSize);
}

async function setGamingSkinToCanvas() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    // 各Canvasを取得
    const contextGamingImage = elCanvasGamingImage.getContext("2d");
    const contextLayerEditing = elCanvasLayerEditing.getContext("2d");
    const contextGamingSkin = elCanvasGamingSkin.getContext("2d");

    // レイヤー編集用Canvasをクリアする
    contextLayerEditing.clearRect(0, 0, skinSize, skinSize);

    // ゲーミング画像を画像データとして取得
    const gamingImage = await loadImage(contextGamingImage.canvas.toDataURL());

    // スキン画像とゲーミング画像を重ねてレイヤー編集用Canvasへ表示
    contextLayerEditing.drawImage(skinImage, 0, 0, skinSize, skinSize);
    contextLayerEditing.drawImage(gamingImage, 0, 0, skinSize, skinSize);

    // レイヤー編集用Canvasからゲーミングスキン画像を取得してゲーミングスキンCanvasへ表示する
    const gamingSkinImageRGBA = contextLayerEditing.getImageData(0, 0, skinSize, skinSize);
    contextGamingSkin.putImageData(gamingSkinImageRGBA, 0, 0);
}

async function readGamingImage() {
    // スキンデータに重ねる用の画像を取得する
    if (!gamingImage) {
        // 取得した画像を保持する
        gamingImage = await loadImage("./image/gaming_128.png").catch((e) => {
            console.log(e);
            return null;
        });
        if (!gamingImage) {
            console.error("The gaming-image could not be loaded.");
            return;
        }
    }
}

// ゲーミング画像が読み込めない場合のフォールバック表示
function copyOriginalToResult() {
    elCanvasGamingSkin.width = skinSize;
    elCanvasGamingSkin.height = skinSize;
    const contextResult = elCanvasGamingSkin.getContext("2d");
    contextResult.clearRect(0, 0, skinSize, skinSize);
    contextResult.drawImage(elCanvasOriginalSkin, 0, 0);
    elDownloadButton.hidden = false;
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

function ensureSkinViewer() {
    if (skinViewer || typeof skinview3d === "undefined") {
        return;
    }

    skinViewer = new skinview3d.SkinViewer({
        canvas: elCanvas3d,
        width: 260,
        height: 340,
    });

    skinViewer.fov = 55;
    skinViewer.zoom = 0.85;
    skinViewer.autoRotate = elAutoRotateCheckbox.checked;
    skinViewer.autoRotateSpeed = 1.0;

    // 現在のskinview3dでは、OrbitControlsはSkinViewerが内部で生成し
    // skinViewer.controls として公開される（createOrbitControlsは存在しない）
    orbitControls = skinViewer.controls;
    orbitControls.enableRotate = true;
    orbitControls.enableZoom = true;
    orbitControls.enablePan = false;

    initialZoom = skinViewer.zoom;

    applyAnimation();
}

// sourceCanvas省略時は、直近で生成したゲーミング結果Canvasを使用する
async function updateSkinViewerTexture() {
    if (!skinImage) {
        return;
    }
    const skinSize = skinImage.width;

    const sourceCanvas = elCanvasGamingSkin;

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
            model: elModelTypeSelect.value,
        });
        elViewerPlaceholder.hidden = true;
    } catch (e) {
        console.log(e);
    }
}

function applyAnimation() {
    if (!skinViewer) {
        return;
    }

    switch (elAnimationTypeSelect.value) {
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

    // ズームを初期値に戻したうえで、SkinViewer組み込みの
    // resetCameraPose()でカメラの位置・向きを正面にリセットする
    skinViewer.zoom = initialZoom;
    skinViewer.resetCameraPose();
}

// メイン処理を実行
main();
