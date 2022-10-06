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
    // const gamingImage = await loadImage("./image/gaming_128.png");
    const gamingImage = await loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFNUExURf8JANX/AP8cAP8bAP4vAP8vAP9DAP5DAP9WAP5WAP9VAP9pAP9oAP97AP98AP+OAP+PAP6OAP+iAP+jAP+1AP/IAP/bAP/uAP/vAPr+APv+AOj/AL7/AABz/wBY/wA//6X/AAAm/4v/AAAN/3H/AHL/AAwA/1j/AFn/ACUA/iUA/yQA/yYA/z//AD7/AD4A/z8A/z4A/j8A/iX/AFcA/1gA/1cA/g3/AHIA/3EA/wD/DAD/DYsA/4wA/wD/JqQA/6UA/wD/PwD/QL4A/wD/WQD/WNgA/wD/cgD/cwD+cgD+c/AA/gD/iwD/jP0A8f4A8QD/pf8A1wD/vwD/vv8AvgD/2AD/1/8ApQD/8QD/8v4Ai/8AiwDy/wDx/wDy/v8Acv8AcQDZ/wDY/wDY/v8AWf8AWAC+//8APwCl/wCk//8AJv8AJQCM//8ADAAAAKmtNgYAAABvdFJOU///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AP5WdtUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAATWSURBVHhe7dj7V1tFEAfwkVLflPiuD6pVtCWgCTUgPqpVq4GKRsVXpRUfoCLW//9H5/HduXtvEjfc3EOO5+yH5u7M7Obu/tbs0D8VVHFfBZaNha85fM1hmcsHyAfIB8gHyAfIB8gHmP0BZm5u7hybUxqc4z/UQt1I4itDpE/9ik5q1d4gleINtgDVGM2fn58/z+aFjMi1ork+OLa/MPio6xFozb6vgcxIpjP6T2f8yXW6v+QBjJM7/TfK6EHzEIaHMXIePvzALOMwZEVkJB83py/hSlENC+mRwqP+aFTxxlHvpoWFCwvykacEFyy1xJ5WswhZabSFYQ0SVHk+KpbYClpcXGwttlr8bD3WElyQRGsWSqyJPGyNpTIit5oEFutQBDraal0luaX0uHkC41nx/ejJGaOnZoyenjF6Ju0iRnExTppAz6rnwGItqVArV81wZVwtQKGEnp+xof+vz9rQD5JxXqhYqsAyh2W+DuUh+QD5APkAsz/ApQS8pzHY19GLCS81DPs6upzwcsOwr6NXEpaXXy0LebXOlocWD8O+jl5LuHLlKrOnBsrGKA+quUJRYV9HKyvtdnu13V5b4w+H7dVVjrlg1l4XbzANNFJxhlFLKuT2LMG+jjqdbrfTWedh/ZpEknb5s76uxe6bDcO+jnq9DbbJwyaPPUml0uOKFDbeahj2dbTF3hY2ylNKiLe23ql4VyAW1XykaBH2dfReyfXrCNz7DcO+jj4ouYHR3OD0w9P5SCAeInPY19HHCTfNJ6KILFSW6jMuu8oE9nX0aUK/39/e7vd3xC2xDbe0pLTOpBor5zs7/K4+9nX0WcLu7udsN5AEOcKRdC2gBNjX0RcwGCAoGQy+bBj2dfRVwtdib29PR8YhMouisFgXxiDKsa+jbxK+nch3GIPxOfZ19H3CD+q2DSKEOt5WUS4fJ5WYlLCvox/ZPrNRniJE+/t31F2mwU9Ccs3AZ5Pu3sG+jg4OflYHzJ4CBR5/Yb8WfhMayYTSLMpVKOkYJiXCvo4OD4+ODtWRKiLze8Owr6M/Ev5Ux8c2qijR8NhY5T/oKuzr6K+SkxMEzOK/G4Z9Hd1LwM/6xmBf5xcTXAMuYd97KDv8rHd4n8Myh2WT34ywfz5APkA+wNkfAPuOhfc0Bvu63B/I/YHcH8j9gdwfyP2B3B/I/YHcH8j9gdwf+P/0BzCdvLhgn4kvKvkA+QD5ALM/AN5bG95bW7I/kIJrf23J/kAKrv21JfsDKdP2D5L9gRTrBXhHAF0AG6M8qOZXaUVIJ2CVaUdAuwQFqcsM17EiNnX/gDpCGwOddRbGa9YsUBZ1pWugcwY1XPtro56QRsDGxiaTTEbJdYpZZBVbE1YwXPtr0/4A0xYBxHmIZRRaZEin7x9U+gMVw+2CIbj211bpD5yCNA8Yrv6TGuofJPsDKbj2F00AjSbvHyT7AynT9g+S/YGUafsH3h9woxsFow2m7x8k+wMpeumP7v8cIrMoCot1YWTJ/kAKrv0J4/sFyf5ACm7+NogQWr+g6BNYLh8nFe0PKGkSFA2CuFlQqNb4C7j31+4fkDUDItoXiJoGBauVmgjT9w+o1BgwlgejahFc+2tL9gdSwtXfRnWq/kGlP1ByopBESnVc+2tL9gdS8DO/pqWlfwHL8rw2TF/aGAAAAABJRU5ErkJggg==");

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
