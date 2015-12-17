#!/usr/bin/env node
"use strict";

let cheerio = require("cheerio");
let http = require("http");
let entities = require("entities");
let iconv = require("iconv-lite");
let fs = require("fs");
let yaml = require("js-yaml");

let url = "http://maths-03.site2.ac-strasbourg.fr/archives/maths_eur/Lexique/lex_A_T/lexique.htm";

let scrapOptions = {
  normalizeWhitespace: true
};

function extractHeadersFromHTML(body) {
  let re = /<meta\s+http-equiv=["'](\S+)["']\s+content=["'](.+?)["']/ig;

  let headers = {};
  while (true) {
    let matches = re.exec(body);
    if (!matches) break;
    headers[matches[1].toLowerCase()] = matches[2];
  }

  return headers;
}

function normalizeEncoding(encoding) {
  return encoding.replace(/-/g, "").trim().toLowerCase();
}

function extractEncodingHeaders(headers) {
  if (headers.hasOwnProperty("content-type")) {
    let match = /charset=([^\s;]+)/i.exec(headers["content-type"]);
    if (match) return normalizeEncoding(match[1]);
  }
}

function decode(headers, body) {
  let decoded;
  if (Buffer.isBuffer(body)) {

    let encoding = extractEncodingHeaders(headers);

    if (!encoding) {
      decoded = body.toString("utf8");
      encoding = extractEncodingHeaders(extractHeadersFromHTML(decoded));
    }

    if (!encoding || !iconv.encodingExists(encoding)) encoding = "utf8";
    if (decoded === undefined || encoding !== "utf8") decoded = iconv.decode(body, encoding);
  }
  else {
    decoded = body;
  }
  return decoded;
}

function clean(word) {
  return word
  .replace(/<font\s+face="Symbol">b<\/font>/g, "ss")
  .replace(/<font\s+face="Wingdings">n<\/font>/g, "↔")
  .replace(/<font\s+face="Symbol">\u00DE<\/font>/g, "⇒")
  .replace(/<font\s+face="Colonna MT">R<\/font>/g, "ℝ");
  //.replace(/<\/?i>/g, "");
}


function scrap(sourceURL) {
  return new Promise(function (resolve, reject) {
    http.request(sourceURL, function (response) {
      if (response.statusCode !== 200) {
        reject(new Error("Error HTTP " + response.statusCode));
      }
      let body = [];
      response.on("error", reject);
      response.on("data", function (data) {
        body.push(data);
      });
      response.on("end", function () {
        resolve(cheerio.load(clean(decode(response.headers, Buffer.concat(body))), scrapOptions));
      });
    })
    .on("error", reject)
    .end();
  });
}


let dunno = {
  "d'un cône": true,
  "übereinstimmende Figuren": true,
  "ensemble des solutions": true,
  "quadrilatère possédant": true,
  "inscrit": 0,
  "proportionnelle (grandeur...)": true,
  "proportionnelle": true,
  "der (projektive) Bildpunkt": true,
  "méthode de résolution d'un système": true,
  "das Planungspolygon": true,
  "points": true,
  "origine (= point)": true,
  "moyenne": true,
  "triangles": true,
  "fractions": true,
  "figures": true,
  //"lösbare Gleichung": true,
  "ensemble de toutes les droites": true,
  "élever": true,
  "écriture": true,
  "droite passant": true,
  "droite invariante": true,
  "droite coupant un triangle": true,
  "diviseur": true,
  "1°=1 Grad (=1Altgrad)": true,
  "1°=60 Minuten=60\'": true,
  "1\' =60 Sekunden=60\'\'": true,
  "die kanonische Zerlegung": true,
  "côtés": true,
  "base": 0,
  "approchée": 0,
};


function splitWords(label) {
  let parens = [];
  label = entities.decode(label);
  label = label.replace(/[\[\(].*?[\]\)]/g, function (whole) {
    parens.push(whole);
    return "PLACEHOLDER" + (parens.length - 1);
  });

  let words = label.split(/\s*,\s*/).map(function (word) {
    return word.replace(/PLACEHOLDER(\d+)/g, function (whole, i) {
      return parens[i];
    });
  });

  let finished = true;
  if (words[words.length - 1] === "") {
    words.pop();
    finished = false;
  }
  return {
    words: words,
    finished: finished
  };
}

function getWords(cell) {
  let first = cheerio(cell).clone();
  first.find("a, p").remove();

  let words = [];

  function addWord(label) {
    let note = "";
    let synonyms = splitWords(label);
    label = synonyms.words.shift();
    words.push({
      label: label,
      dunno: dunno.hasOwnProperty(label) && dunno[label] === true || dunno[label] === words.length,
      synonyms: synonyms.words,
      note: note,
      finished: synonyms.finished
    });
    return words[words.length - 1];
  }

  function addSynonyms(word, label) {
    let synonyms = splitWords(label);
    word.synonyms.push.apply(word.synonyms, synonyms.words);
    word.finished = synonyms.finished;
  }

  let firstWord = addWord(first.html().trim());
  if (firstWord.dunno) firstWord.title = true;

  cheerio(cell).find("p").each(function (index, el) {
    let html = cheerio(el).html().trim();

    let previousWord = words[words.length - 1];

    if (html === "&#xE0; une inconnue") {
      previousWord.dunno = true;
    }

    if (previousWord.label === "der Betrag" ||
        previousWord.label === "das Quadrat" ||
        previousWord.label === "der Drehwinkel") {
      previousWord.finished = true;
    }
    else if (previousWord.label === "entgegen dem Uhrzeigersinn" ||
             previousWord.label === "der Polarhalbmesser" ||
             previousWord.label === "in Faktoren zerlegen" ||
             previousWord.label === "lösbare Gleichung" ||
             previousWord.label === "die Abszisse (-n)") {
      previousWord.finished = false;
    }

    if (
      previousWord.label === "une somme" ||
      previousWord.label === "nombres donnant le même reste dans la division") {
      previousWord.label += " " + html;
    }
    else if (
      html.startsWith("[") ||
      html.startsWith("selon laquelle") ||
      html.startsWith("exemples :") ||
      html.startsWith("<") && !html.startsWith("<i>voir sous") ||
      html.startsWith("(") && !html.startsWith("(polygones)")) {
      previousWord.note += " " + html;
    }
    else if (!previousWord.finished) {
      addSynonyms(previousWord, html);
    }
    else {
      addWord(html);
    }
  });
  words.forEach(function (w) { delete w.finished; });
  return words;
}

function parseEntries(res) {
  let entries = [];
  let filter = function (w) { return !w.dunno; };

  for (let cell of res("table[width=\"699\"] tr td:first-child").toArray().slice()) {

    let sourceWords = getWords(cell);
    let tradWords = getWords(cheerio(cell).next()[0]);

    let traductions = [];
    let is = 0;
    let it = 0;
    while (is < sourceWords.length && it < tradWords.length) {
      let source = sourceWords[is];
      let trad = tradWords[it];
      if (trad.dunno) {
        traductions.push({ source: null, trad: trad });
        it++;
      }
      else if (source.dunno) {
        traductions.push({ source: source, trad: null });
        is++;
      }
      else {
        traductions.push({ source: source, trad: trad });
        is++;
        it++;
      }
    }

    entries.push(traductions);

    if (sourceWords.filter(filter).length !== tradWords.filter(filter).length) {
      console.log("WOOPS");
      console.log(sourceWords);
      console.log(tradWords);
    }
  }

  return entries;
}

function formatEntry(entry) {
  let output = {};

  output.fr = entry.source.label;
  if (entry.source.note) output.note_fr = entry.source.note.trim();
  if (entry.source.synonyms.length) output.synonyms_fr = entry.source.synonyms;

  if (!entry.trad) {
    output.de = "??";
  }
  else {
    output.de = entry.trad.label;
    if (entry.trad.note) output.note_de = entry.trad.note.trim();
    if (entry.trad.synonyms.length) output.synonyms_de = entry.trad.synonyms;
  }

  return output;
}

function formatEntries(entries) {
  let formatedEntries = [];

  for (let subEntries of entries) {
    for (let entry of subEntries) {
      formatedEntries.push(formatEntry(entry));
    }
  }

  return yaml.safeDump(formatedEntries).replace(/^-/gm, "\n-");
}

function writeEntries(outputPath, entries) {
  fs.writeFileSync(outputPath, formatEntries(entries));
}

module.exports = {

  help: `
lexique scrap [OUTPUT.yml]

Download and format the lexic from ${url}. The argument should be the path of a non-existing yml file (defaults to output.yml).
  `,

  shortHelp: `Download and format the lexic`,

  run(options) {
    return scrap(url)
    .then(parseEntries)
    .then((entries) => writeEntries(options.argv._[0] || "output.yml", entries));
  }

};
