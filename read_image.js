const Tesseract = require('tesseract.js');

const imagePath = 'C:\\Users\\vubao\\.gemini\\antigravity\\brain\\33cbb114-eae3-4f62-bf97-fadaca6f5785\\media__1779357770832.png';

Tesseract.recognize(
  imagePath,
  'eng+vie',
  { logger: m => console.log(m) }
).then(({ data: { text } }) => {
  console.log("--- OCR TEXT ---");
  console.log(text);
});
