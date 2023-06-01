/**********************************************
 *                GLOBALS                     *
 **********************************************/
const canvas = document.getElementById("mainCanvas"); // This is the canvas
const context = canvas.getContext("2d"); // Get the context
const qrDiv = document.getElementById('qrcode'); // This is where the QR image is
const letterOrder = " .`-_':,;^=+/\"|(\\<>)iv%xclrs{*}I?!][1taeo7zjLunT#JCwfy325Fp6mqSghVd4EgXPGZbYkOA&8U$@KHDBWNMR0Q";
var letters; // The letters organized 
var letterMatrix; // The matrix with the letters
var fontMatrix; // The font of each letter
var colorMatrix; // The color of each letter  
var srcFiles; // The files that were selected
var srcImg; // The source image 
var prefix = ""; // This is the prefix of the output file 
var resultCanvas; // The result canvas
var resultCtx; // The result context 
var config = { // The config
  chars: undefined,
  font: undefined,
  map: undefined,
  inferior: undefined,
  superior: undefined,
  gray: undefined,
  text: undefined,
  blackWhite: undefined,
  invertMap: undefined,
  invertGray: undefined,
  letterBg: undefined,
  mixOriginal: undefined,
  arLayer: undefined,
  printSize: undefined,
  lights: undefined
};
var form; // The form with the config
var selectElems; // The HTML selects 
var sideNavInst; // Instance of teh sidenav 
var converted = false; // Flag to set after processing the image
var blur = false; // The blur filter flag
var targetShow; // The image to show, either the original or the processed one

/**********************************************
 *                  UTILS                     *
 **********************************************/

/** 
 * Map the number of a range to another, it's so stupid that JS doesn't have this in the Math object
 */
const mapNumber = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

/**
 * These three methods check the channels of the color to make sure they are inside the correct values
 */
const isTooBlack = (r, g, b, threshold) => r < threshold &&
  g < threshold &&
  b < threshold;

const isTooWhite = (r, g, b, threshold) => r > threshold &&
  g > threshold &&
  b > threshold;

const isTooGray = (r, g, b, threshold, black, white) => r > g - threshold && r < g + threshold &&
  r > b - threshold && r < b + threshold &&
  g > b - threshold && g < b + threshold &&
  !isTooBlack(r, g, b, black) &&
  !isTooWhite(r, g, b, white);
/**
 * Creates the filename of the processed image
 */
function createFilename() {
  let d = new Date();
  let t = d.getTime();
  let filename = prefix +
    "_" + config.chars +
    "_" + config.font +
    "_" + config.map +
    "_" + config.inferior +
    "_" + config.superior +
    "_" + config.gray +
    "_" + config.text.replace(/[/\\?%*:|"<>]/g, '').substr(0, 50) +
    "_" + config.blackWhite +
    "_" + config.invertMap +
    "_" + config.invertGray +
    "_" + config.letterBg +
    "_" + config.mixOriginal +
    "_" + config.arLayer +
    "_" + config.framed +
    "_" + config.printSize +
    "_" + config.lights +
    "_" + t;
  return filename;
};

/**
 * Assigns the config or reverts it
 */
function assignConfig(revert) {
  if (revert) {
    // If there is nothing in the config just bail
    if (config.chars == undefined) {
      return false;
    }

    // Revert he config
    form.chars.value = config.chars;
    form.font.value = config.font;
    selectElems[0].M_FormSelect.input.value = config.font;
    form.map.value = config.map;
    selectElems[1].M_FormSelect.input.value = config.map || "Sin umbral";
    form.inferior.value = config.inferior;
    selectElems[2].M_FormSelect.input.value = config.inferior || "Sin umbral";
    form.superior.value = config.superior;
    selectElems[3].M_FormSelect.input.value = config.superior == 255 ? "Sin umbral" : config.superior;
    form.gray.value = config.gray;
    selectElems[4].M_FormSelect.input.value = config.gray || "Sin umbral";
    form.text.value = config.text;
    form.blackWhite.checked = config.blackWhite;
    form.invertMap.checked = config.invertMap;
    form.invertGray.checked = config.invertGray;
    form.letterBg.checked = config.letterBg;
    form.mixOriginal.checked = config.mixOriginal;
    form.arLayer.checked = config.arLayer;
    form.framed.checked = config.framed;
    form.printSize.checked = config.printSize;
    form.lights.value = config.lights;
  }
  else {
    // Get the config values
    config = {
      chars: parseInt(form.chars.value, 10),
      font: parseInt(form.font.value, 10),
      map: parseInt(form.map.value, 10),
      inferior: parseInt(form.inferior.value, 10),
      superior: parseInt(form.superior.value, 10),
      gray: parseInt(form.gray.value, 10),
      text: form.text.value.replace(/[@\.,#!¿¡\$%\^&;:\{\}=\+\-_`~\(\)/\\\?\*\|"<>\[\]]/g, "").replace(/\s+/g, '').toLowerCase(),
      blackWhite: form.blackWhite.checked,
      invertMap: form.invertMap.checked,
      invertGray: form.invertGray.checked,
      letterBg: form.letterBg.checked,
      mixOriginal: form.mixOriginal.checked,
      arLayer: form.arLayer.checked,
      framed: form.framed.checked,
      printSize: form.printSize.checked,
      lights: parseInt(form.lights.value, 10)
    };
  }
}

/**
 * Process the image, this is the algorithm to make the ascii art
 */
function processImage() {
  // Calculate the image and the result size  
  let resizedWidth, resizedHeight, resultWidth, resultHeight;
  if (srcImg.width >= srcImg.height) {
    resizedWidth = config.chars;
    resizedHeight = Math.floor(resizedWidth * srcImg.height / srcImg.width);

    // The final result size
    if (!config.printSize && srcImg.width / srcImg.height >= 1.7 && srcImg.width / srcImg.height <= 1.8) {
      resultHeight = 1080;
      resultWidth = 1920;
    }
    else {
      resultHeight = config.printSize ? 4320 : 1080; // 7680*4320 is 8K
      resultWidth = Math.floor(resultHeight * srcImg.width / srcImg.height);
    }
  }
  else {
    resizedHeight = config.chars;
    resizedWidth = Math.floor(resizedHeight * srcImg.width / srcImg.height);

    // The final result size
    if (!config.printSize && srcImg.height / srcImg.width >= 1.7 && srcImg.height / srcImg.width <= 1.8) {
      resultWidth = 1080;
      resultHeight = 1920;
    }
    else {
      resultWidth = config.printSize ? 4320 : 1080; // 7680*4320 is 8K
      resultHeight = Math.floor(resultWidth * srcImg.height / srcImg.width);
    }
  }

  // Resize the image
  let resizedImg = new OffscreenCanvas(resizedWidth, resizedHeight),
    resizedCtx = resizedImg.getContext('2d');
  resizedCtx.drawImage(srcImg, 0, 0, resizedWidth, resizedHeight);

  // Get the pixels from the resized image
  let imgData = resizedCtx.getImageData(0, 0, resizedWidth, resizedHeight),
    pixels = imgData.data;

  // Set the proportion of the lights
  let lights = mapNumber(config.lights, 1, 5, 1, 2);

  // Loop over each pixel and set up the color, font and letter arrays
  letterMatrix = new Array(resizedWidth * resizedHeight);
  fontMatrix = new Array(resizedWidth * resizedHeight);
  colorMatrix = new Array(resizedWidth * resizedHeight);
  for (let pos = 0; pos < resizedWidth * resizedHeight; pos++) {
    // The position is multiplied by 4, for the 3 channels RGB plus the alpha 
    let pixPos = pos * 4;

    // Check if the color is inside the boundaries of the threshold
    let threshold = isTooBlack(pixels[pixPos], pixels[pixPos + 1], pixels[pixPos + 2], config.inferior) ||
      isTooWhite(pixels[pixPos], pixels[pixPos + 1], pixels[pixPos + 2], config.superior);

    // Check if the color is too Gray
    let itIsGray = isTooGray(
      pixels[pixPos],
      pixels[pixPos + 1],
      pixels[pixPos + 2],
      config.gray,
      config.inferior,
      config.superior
    );

    // Set the color
    if (!threshold && ((config.invertGray && itIsGray) || (!config.invertGray && !itIsGray))) {
      if (config.blackWhite) {
        colorMatrix[pos] = `rgba(0, 0, 0`;
      }
      else {
        colorMatrix[pos] = 'rgba(' +
          (pixels[pixPos] * lights) + ',' +
          (pixels[pixPos + 1] * lights) + ',' +
          (pixels[pixPos + 2] * lights);
      }
      colorMatrix[pos] += ', 1)';
    }
    else {
      letterMatrix[pos] = " ";
      fontMatrix[pos] = 0;
      colorMatrix[pos] = `rgba(0, 0, 0, 0)`;
      continue;
    }

    // This is the max of the color channels
    pixelBright = Math.max(pixels[pixPos], pixels[pixPos + 1], pixels[pixPos + 2]);

    // Set the letter
    if (config.text == "") {
      letterMatrix[pos] = letters[pixelBright];
    }
    else {
      letterMatrix[pos] = config.text[pos % config.text.length];
    }

    // Set the font
    if (config.map > 0) {
      if (config.invertMap) {
        fontMatrix[pos] = mapNumber(pixelBright, 0, 0xff, 1 + (config.font / 10), config.map / 10);
      }
      else {
        fontMatrix[pos] = mapNumber(pixelBright, 0, 0xff, config.map / 10, 1 + (config.font / 10));
      }
    }
    else {
      fontMatrix[pos] = 1 + (config.font / 10);
    }
  }

  // Render and show the results
  resultCanvas = document.createElement('canvas');
  resultCanvas.width = resultWidth;
  resultCanvas.height = resultHeight;
  resultCtx = resultCanvas.getContext('2d');
  if (config.blackWhite) {
    resultCtx.fillStyle = "white";
    resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
  }

  // if (config.arLayer) {
  //   resultCtx.fillStyle = "black";
  //   resultCtx.fillRect(0, 0, resultCanvas.width, resultCanvas.height);
  // }

  let fSize = 1 + (config.font / 10);
  resultCtx.save();
  resultCtx.scale((resultCanvas.width / resizedWidth) * fSize,
    (resultCanvas.height / resizedHeight) * fSize);
  for (let j = 0, pos = 0; j < resizedHeight; j++) {
    resultCtx.translate(0, 1.0 / fSize);
    resultCtx.save();
    for (let i = 0; i < resizedWidth; i++, pos++) {
      if (config.letterBg && letterMatrix[pos] != " ") {
        resultCtx.fillStyle = "black";
        resultCtx.fillRect(0, -1.0 / fSize, 1.0 / fSize, 1.0);
      }
      resultCtx.fillStyle = colorMatrix[pos];
      resultCtx.font = fontMatrix[pos] + "px aAFont";
      resultCtx.fillText(letterMatrix[pos], 0, 0);
      resultCtx.translate(1.0 / fSize, 0);
    }
    resultCtx.restore();
  }
  resultCtx.restore();

  // Put the original image in the background
  if (config.mixOriginal) {
    let mixCanvas = new OffscreenCanvas(resultWidth, resultHeight),
      mixCtx = mixCanvas.getContext('2d');
    mixCtx.drawImage(srcImg, 0, 0, resultWidth, resultHeight);
    mixCtx.drawImage(resultCanvas, 0, 0, resultWidth, resultHeight);
    resultCanvas = document.createElement('canvas');
    resultCanvas.width = resultWidth;
    resultCanvas.height = resultHeight;
    resultCtx = resultCanvas.getContext('2d');
    resultCtx.drawImage(mixCanvas, 0, 0);
  }

  // Add 300 white pixels to the sides to make sort of a frame around the image
  if (config.framed) {
    let framedCanvas = new OffscreenCanvas(resultWidth + 600, resultHeight + 600),
      framedCtx = framedCanvas.getContext('2d');
    framedCtx.fillStyle = 'rgb(255,255,255,1)';
    framedCtx.fillRect(0, 0, framedCanvas.width, framedCanvas.height);
    framedCtx.fillStyle = 'rgb(0,0,0,1)';
    framedCtx.fillRect(300, 300, framedCanvas.width - 600, framedCanvas.height - 600);
    framedCtx.drawImage(resultCanvas, 300, 300);
    resultCanvas = document.createElement('canvas');
    resultCanvas.width = resultWidth + 600;
    resultCanvas.height = resultHeight + 600;
    resultCtx = resultCanvas.getContext('2d');
    resultCtx.drawImage(framedCanvas, 0, 0);
  }

  // Indicate that the image was converted
  converted = true;

  // show the result
  showImage(resultCanvas);
}

/**
 * Switch between showing the source image and processed image
 */
function showImage(preview, filter) {
  let x = 0, y = 0, w, h;

  // If the result canvas is empty don't do anything
  if (preview != undefined) {
    // Priority to the argument
    targetShow = preview;
  }
  else if (targetShow == undefined) {
    // I got nothing to show
    return false;
  }

  // Clear the canvas and draw result
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Adjust the size of the resulting image in order to preview it
  if ((targetShow.width >= targetShow.height && canvas.width > canvas.height) ||
    (targetShow.width < targetShow.height && canvas.height < canvas.width)) {
    h = canvas.height;
    w = Math.floor(h * targetShow.width / targetShow.height);
    x = Math.floor((canvas.width - w) / 2);
  }
  else if ((targetShow.width >= targetShow.height && canvas.width < canvas.height) ||
    (targetShow.width < targetShow.height && canvas.height > canvas.width)) {
    w = canvas.width;
    h = Math.floor(w * targetShow.height / targetShow.width);
    y = Math.floor((canvas.height - h) / 2);
  }

  // Apply blur filter mapping the number of chars
  if (filter) {
    context.filter = 'blur(15px)'; //  + ( config.chars > 200 ? 10 : mapNumber(config.chars, 0, 200, 40, 10))  + 'px)';
  }
  else {
    blur = false;
    context.filter = 'blur(0)';
  }

  // Show the image in the main canvas
  context.drawImage(targetShow, x, y, w, h);
}

/** 
 * Adjust the canvas to the size of the screen
 */
function adjustCanvas() {
  // These are the width and height of the screen
  let vw = window.innerWidth;
  let vh = window.innerHeight;

  // Set the new width
  let aArt = document.querySelector(".aArt");
  aArt.style.width = "100%";
  canvas.width = aArt.offsetWidth * 10;
  canvas.style.width = aArt.offsetWidth + "px";
  canvas.height = Math.floor(aArt.offsetWidth * vh / vw) * 10;
  canvas.style.height = Math.floor(aArt.offsetWidth * vh / vw) + "px";

  // And show any image in the result canvas
  showImage();
}


/**********************************************
 *                  EVENTS                    *
 **********************************************/

if ('serviceWorker' in navigator) {
  /**
  * Register the service worker  
  */
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('service worker registered'))
      .catch(err => console.log('service worker not registered', err));
  });

  /**
   * Add event for when the app is installed
   */
  window.addEventListener('appinstalled', function (evt) {
    console.log(evt);
  });
}

/** 
 * Add the events for the side panel and form 
 */
document.addEventListener('DOMContentLoaded', function () {
  // Create an array with the letters in the correct order
  letters = new Array(256);
  for (let i = 0; i < 256; i++) {
    let j = parseInt(mapNumber(i, 0, 256, 0, letterOrder.length), 10);
    letters[i] = letterOrder[j];
  }

  // Get the form
  form = document.querySelector('form');

  // Init the select 
  selectElems = document.querySelectorAll('select');
  M.FormSelect.init(selectElems);

  // Add form to the side nav
  sideNavInst = M.Sidenav.init(
    document.querySelectorAll('.side-form'),
    {
      edge: 'right',
      draggable: false,
      outDuration: 50,
      onOpenStart: () => { },
      onCloseEnd: () => { }
    }
  );

  // Adjust the way the app looks
  adjustCanvas();
});


/**
 * Add event so the canvas is adjusted to the screen 
 */
window.addEventListener('resize', adjustCanvas);

/** 
 * Add an event for the file input
 */
document.getElementById("cameraFileInput").addEventListener("change", function () {
  if (!this.files && this.files.length) {
    M.toast({ html: 'No file selected.' });
    return false;
  }

  srcFiles = this.files[0];
  prefix = srcFiles.name.split('.')[0];
  if (srcImg == undefined) {
    srcImg = new Image();
  }
  else {
    URL.revokeObjectURL(srcImg.src);
  }
  srcImg.src = window.URL.createObjectURL(srcFiles);
  srcImg.onload = () => {
    // And now show the image in the canvas
    showImage(srcImg);
    // Set converted to false, since this is a new image
    converted = false;
  }
});

/**
 * Add events to the form and buttons
 */
document.querySelectorAll(".submitForm").forEach(element => {
  element.addEventListener("click", function (evt) {
    evt.preventDefault();

    // Before moving forward lets make sure that there is a source image
    if (srcImg == undefined || srcImg.src == undefined || srcImg.src == "") {
      return false;
    }

    // If we already converted this image
    if (converted) {
      // Check if any of the fields of the form changed
      let changed = false;
      for (const [key, value] of Object.entries(config)) {
        if (key == "text" && value != form.text.value.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s/g, '').toLowerCase()) {
          changed = true;
          break;
        }
        else if (form[key].value == "on" && value != form[key].checked) {
          changed = true;
          break;
        }
        else if (form[key].value != "on" && value != form[key].value) {
          changed = true;
          break;
        }
      }

      // If it did not, do not process the image again 
      if (!changed) {
        showImage(resultCanvas);
        return false;
      }
    }

    // Get the config values
    assignConfig();

    // More than 500 chars makes the app break
    if (isNaN(config.chars) || config.chars == 0 || config.chars > 500) {
      M.toast({ html: 'Check the chars field.' });
      return false;
    }

    // Process the image
    // M.toast({html: 'Processing image, please wait...'});
    processImage();
  });
});

document.querySelectorAll(".resetForm").forEach(element => {
  element.addEventListener("click", function (evt) {
    evt.preventDefault();

    assignConfig(true);
  });
});

/**
 * Add event for the refresh image link
 */
document.getElementById("refreshImg").addEventListener("click", function (evt) {
  evt.preventDefault();

  if (srcImg == undefined || srcImg.src == undefined || srcImg.src == "" ||
    resultCanvas == undefined || !converted) {
    M.toast({ html: 'Nothing to show.' });
    return false;
  }

  targetShow = targetShow == srcImg ? resultCanvas : srcImg;
  showImage();
});

/**
 * Add event for the refresh image link
 */
document.getElementById("blurImg").addEventListener("click", function (evt) {
  evt.preventDefault();

  if (resultCanvas == undefined || !converted) {
    M.toast({ html: 'Nothing to blur.' });
    return false;
  }

  blur = !blur;
  showImage(resultCanvas, blur);
});

/** 
 * Add event for the file save link
 */
document.getElementById("saveImage").addEventListener("click", async function (evt) {
  if (resultCanvas == undefined || !converted) {
    evt.preventDefault();
    M.toast({ html: 'Nothing to save.' });
    return false;
  }

  let filename = createFilename();
  if (config.arLayer) {
    this.setAttribute('download', filename + '.png');
    this.href = resultCanvas.toDataURL().replace("image/png", "image/octet-stream");   
  }
  else {
    this.setAttribute('download', filename + '.jpg');
    this.href = resultCanvas.toDataURL('image/jpeg', 1.0).replace("image/jpeg", "image/octet-stream");
  }
});

/** 
 * Add event to share the image link
 */
document.getElementById("shareImage").addEventListener("click", function (evt) {
  evt.preventDefault();

  if (resultCanvas == undefined || !converted) {
    M.toast({ html: 'Nothing to share.' });
    return false;
  }

  if (!navigator.canShare) {
    M.toast({ html: 'Your browser doesn\'t support the Web Share API.' });
    return false;
  }

  resultCanvas.toBlob(async blob => {
    let filename = createFilename();
    const files = [new File([blob], filename + '.jpg', { type: blob.type })]
    const shareData = {
      url: 'https://www.kevinbcasas.com/',
      title: 'Please, share and mention @kevinbcasas.',
      text: 'This artwork was created with an app designed and built by @kevinbcasas, check kevinbcasas.com for more.',
      files: files
    }
    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData)
      }
      catch (err) {
        if (err.name !== 'AbortError') {
          M.toast({ html: 'Error sharing image.' });
          return false;
        }
      }
    }
    else {
      M.toast({ html: 'Sharing not supported.' });
      return false;
    }
  }, 'image/jpeg', 1.0);
});

