const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/usesinspiration/Development/Projects/cv-bucket/src/assets/Graphic Designer.pdf');

pdf(dataBuffer).then(function(data) {
    console.log("Number of pages:", data.numpages);
    console.log("Info:", data.info);
    console.log("Metadata:", data.metadata);
    console.log("Text Length:", data.text.length);
    console.log("--- Extracted Text ---");
    console.log(data.text);
    console.log("----------------------");
}).catch(function(error){
    console.error("Error parsing PDF:", error);
});
