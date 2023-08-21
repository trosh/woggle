if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

import {dic} from "./dic.js";

function getcookienames() {
	return document.cookie.split("; ")
		.map((cookie) => cookie.split("=")[0]);
}

function getcookie(name) {
	let ret = document.cookie.split("; ")
		.find((row) => row.startsWith(name + "="))
		?.split("=")[1];
	if (ret?.length > 0)
		console.log(`Read cookie: ${name} → ${ret}`);
	else
		console.log(`No cookie found with name “${name}”`);
	return ret;
}

function setcookie(name, value) {
	let str = `${name}=${value}; Max-Age=90000; SameSite=strict`; // 25h
	console.log("Write cookie: " + str);
	document.cookie = str;
}

function clearcookie(name) {
	let str = name + "=; Max-Age=0; SameSite=strict; Path=/; Domain="+location.hostname;
	console.log("Clear cookie: " + str);
	document.cookie = str;
}

function srand(str) { // cyrb128
	let h1 = 1779033703, h2 = 3144134277,
	    h3 = 1013904242, h4 = 2773480762;
	for (let i = 0, k; i < str.length; ++i) {
		k = str.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
	return [(h1^h2^h3^h4)>>>0, (h2^h1)>>>0, (h3^h1)>>>0, (h4^h1)>>>0];
}

function frand(seed) { // mulberry32
	return function() {
		var t = seed += 0x6D2B79F5;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0); // / 4294967296;
	}
}

let rand;

const MINLENGTH = 4;
const MINTARGETLENGTH = 5;
const NUMTRIES = 5;

let ref, grid, targets, found, target, word, counter;
let valid, curpath, good, bad, histories;
let curlangs = [];

function buildref(langs) {
	let ref = {};
	let numwords = 0;
	let pos = [];
	for (let lang of langs) {
		let _ref = ref;
		for (let c of dic[lang]) {
			if (c == ".") {
				_ref[true] = true;
				++numwords;
			} else if (c == ";")
				_ref = pos.pop();
			else {
				if (!_ref[c])
					_ref[c] = {};
				pos.push(_ref);
				_ref = _ref[c];
			}
		}
	}
	return [ref, numwords];
}

function inref(ref, word) {
	let _ref = ref;
	for (let c of word) {
		if (!_ref[c])
			return null;
		_ref = _ref[c];
	}
	if (_ref[true])
		return true;
	return false;
}

// From http://www.bananagrammer.com/2013/10/the-boggle-cube-redesign-and-its-effect.html
// "q" == "QU"
const dice = {
	"Classic": [
		"AACIOT", "ABILTY", "ABJMOq", "ACDEMP",
		"ACELRS", "ADENVZ", "AHMORS", "BIFORX",
		"DENOSW", "DKNOTU", "EEFHIY", "EGKLUY",
		"EGINTV", "EHINPS", "ELPSTU", "GILRUW",
	],
	"New": [
		"AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
		"AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
		"DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
		"EIOSST", "ELRTTY", "HIMNUq", "HLNNRZ",
	],
	"International": [
		"ETUKNO", "EVGTIN", "DECAMP", "IELRUW",
		"EHIFSE", "RECALS", "ENTDOS", "OFXRIA",
		"NAVEDZ", "EIOATA", "GLENYU", "BMAQJO",
		"TLIBRA", "SPULTE", "AIMSOR", "ENHRIS",
	],
};

function randgrid(diceset) {
	// Initialize grid
	let grid = [];
	for (let g=0; g<16; ++g)
		grid.push("#");
	// Throw each dice
	let thrown = []
	for (let d=0; d<dice[diceset].length; ++d) {
		let n = rand() % 6;
		thrown.push(dice[diceset][d].charAt(n));
	}
	// Dice permutation
	for (let g=0; g<16; ++g) {
		let n = rand() % thrown.length;
		grid[g] = thrown[n];
		thrown.splice(n, 1);
	}
	//assert len(thrown) == 0
	return grid;
}

function _findwords(ref, minlen, grid, done, found, w, path) {
	let [i, j] = path[path.length - 1];
	//assert not done[i*4+j]
	done[i*4+j] = true;
	w += grid[i*4+j];
	let _word = w.replaceAll("q", "QU");
	let ret = inref(ref, _word);
	if (_word.length >= minlen
	    && ret === true)
		found.push({"path": [...path], "word": _word});
	if (ret !== null) {
		for (let ii=Math.max(0,i-1); ii<Math.min(4,i+2); ++ii) {
		for (let jj=Math.max(0,j-1); jj<Math.min(4,j+2); ++jj) {
			if (done[ii*4+jj])
				continue;
			path.push([ii,jj]);
			_findwords(ref, minlen, grid, done, found, w, path);
			path.pop();
		}
		}
	}
	done[i*4+j] = false;
}

function findwords(ref, minlen, grid) {
	let found = [];
	let done = [];
	for (let i=0; i<16; ++i)
		done.push(false);
	for (let i=0; i<4; ++i) {
	for (let j=0; j<4; ++j)
		_findwords(ref, minlen, grid, done, found, "", [[i, j]]);
	}
	return found;
}

function updatecells(grid) {
	for (let g=0; g<16; ++g) {
		let cell = document.querySelector(`#cell_${g}`);
		let c = grid[g];
		if (c == "q")
			cell.textContent = "QU";
		else
			cell.textContent = c;
	}
}

function allvalid() {
	for (let i=0; i<4; ++i)
	for (let j=0; j<4; ++j)
		valid.push([i,j]);
}

function comparepaths(p1, p2) {
	if (p1.length != p2.length)
		return false;
	for (let n=0; n<p1.length; ++n) {
		let [i1,j1] = p1[n];
		let [i2,j2] = p2[n];
		if (i1 != i2 || j1 != j2)
			return false;
	}
	return true;
}

function inpath(pos, path) {
	let [i,j] = pos;
	for (let [ii,jj] of path) {
		if (i == ii && j == jj)
			return true;
	}
	return false;
}

function updateword() {
	let disp = document.querySelector("#word");
	if (word.includes(" "))
		disp.innerHTML = word;
	else
		disp.textContent = word + "␣";
}

function update() {
	for (let g=0; g<16; ++g)
		document.querySelector(`#cell_${g}`).classList = "";
	if (curpath.length > 0) {
		let nextvalid = [];
		let [i,j] = curpath[curpath.length - 1];
		for (let ii=Math.max(0,i-1); ii<Math.min(4,i+2); ++ii) {
		for (let jj=Math.max(0,j-1); jj<Math.min(4,j+2); ++jj) {
			if (!inpath([ii,jj], curpath))
				nextvalid.push([ii,jj]);
		}
		}
		valid = nextvalid;
	} else
		allvalid();
	for (let [i,j] of curpath.slice(0, 1))
		document.querySelector(`#cell_${i*4+j}`).classList.add("curfirst");
	for (let [i,j] of curpath)
		document.querySelector(`#cell_${i*4+j}`).classList.add("cur");
	for (let [i,j] of good)
		document.querySelector(`#cell_${i*4+j}`).classList.add("good");
	for (let [i,j] of bad)
		document.querySelector(`#cell_${i*4+j}`).classList.add("bad");
	updateword();
}

function addpos(i, j) {
	let g = i*4+j;
	document.querySelector(`#cell_${g}`).classList.add("cur");
	if (word.includes(" "))
		word = "";
	word += grid[g].replace("q", "QU");
	curpath.push([i,j]);
	update();
}

function removefrompos(i, j) {
	for (let n = curpath.length - 1; n >= 0; --n) {
		let [ii,jj] = curpath[n];
		curpath.splice(n, 1);
		let g = ii*4+jj;
		let c = grid[g].replace("q", "QU");
		let m = word.lastIndexOf(c);
		word = word.slice(0, m);
		if (ii==i && jj==j)
			break;
	}
	update();
}

function updatefound(found, usedword) {
	let newfound = [];
	for (let word of found) {
		let ingood = true;
		for (let pos of good) {
			if (!inpath(pos, word["path"])) {
				ingood = false;
				break;
			}
		}
		let hasbad = false;
		for (let pos of bad) {
			if (inpath(pos, word["path"])) {
				hasbad = true;
				break;
			}
		}
		if (ingood && !hasbad && word["word"] != usedword)
			newfound.push(word)
	}
	return newfound;
}

function findmatch(word) {
	let match = [];
	for (let lang of curlangs) {
		for (let orig of dic[lang + "_orig"]) {
			const conv = orig.toUpperCase().normalize("NFD")
				.replace(/[\u0300-\u03f6]/g, "") ;
			if (conv == word)
				match.push(`<a target="_blank" rel="noopener noreferrer" href="https://${lang}.wiktionary.org/wiki/${orig}">${orig}</a>`);
		}
	}
	return match;
}

function play() {
	if (word.includes(" "))
		return false;
	if (word.length < MINLENGTH) {
		word += " too short ";
		curpath = [];
		update();
		return false;
	}
	if (!inref(ref, word)) {
		word += " not in dict ";
		curpath = [];
		update();
		return false;
	}
	for (let pos of curpath) {
		if (inpath(pos, target["path"])) {
			if (!inpath(pos, good))
				good.push(pos);
		} else {
			if (!inpath(pos, bad))
				bad.push(pos);
		}
	}
	targets = updatefound(targets, word);
	found   = updatefound(found, word);
	updateremaining(targets);
	let history = document.querySelector("#history");
	history.children[counter - 1].textContent = word;
	let curpathstr = curpath.map((pos) => pos.join("")).join("_");
	console.log(`curpathstr: ${curpathstr}`);
	let cookiename = `hist_${curlangs.join("_")}_${counter}`;
	if (!getcookie(cookiename))
		setcookie(cookiename, curpathstr);
	if (word == target["word"]) { //comparepaths(curpath, target["path"]);
		let match = findmatch(word);
		for (let pos of target["path"]) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = "you win with ";
		if (match.length > 0) {
			for (let omatch of match)
				word += ` ${omatch} `;
		} else
			ord += target["path"] + " ";
		curpath = target["path"];
		update();
		history.children[counter - 1].classList.add("histwin");
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		let enter = document.querySelector("#enter");
		enter.textContent = "replay random";
		enter.onclick = (event) => { setupgame(true); };
	} else {
		curpath = [];
		word = "";
		update();
		incrementcounter();
	}
}

function incrementcounter() {
	++counter;
	let disp = document.querySelector("#counter");
	if (counter == NUMTRIES)
		disp.textContent = "1 try left";
	else if (counter < NUMTRIES)
		disp.textContent = (NUMTRIES+1 - counter) + " tries left";
	else {
		let match = findmatch(target["word"]);
		word = "word was ";
		if (match.length > 0) {
			for (let omatch of match)
				word += ` ${omatch} `;
		} else
			ord += target["path"] + " ";
		curpath = target["path"];
		update();
		disp.textContent = "💀";
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		let enter = document.querySelector("#enter");
		enter.textContent = "replay";
		enter.onclick = (event) => { setupgame(); };
	}
}

function updateremaining(targets) {
	let remaining = document.querySelector("#remaining");
	let num = targets.length;
	if (num == 1)
		remaining.textContent = "1 word left";
	else
		remaining.textContent = targets.length + " words left";
}


function inner_setupgame(random) {
	console.log(`inner_setupgame(random=${random})`);
	valid = [];
	curpath = [];
	good = [];
	bad = [];
	word = "";
	counter = 0;
	const tbody = document.querySelector("table#grid > tbody");
	if (tbody.childElementCount == 0) {
		for (let i=0; i<4; ++i) {
			let row = document.createElement("tr");
			tbody.appendChild(row);
			for (let j=0; j<4; ++j) {
				let cell = document.createElement("td");
				cell.id = `cell_${i*4+j}`;
				row.appendChild(cell);
			}
		}
	}
	let langs = ["en"]; // default value
	const getlang = document.URL.split("?")[1]?.split("&")
		?.find((v) => v.startsWith("lang="))
		?.split("=")[1];
	if (getlang?.length > 0)
		langs = getlang.split("_");
	if (langs.length == 0)
		return;
	for (let inputlang of document.querySelectorAll("input.lang"))
		inputlang.checked = false;
	for (let inputlang of langs)
		document.querySelector("input#lang_" + inputlang).checked = true;
	// TODO make less ugly
	let langchange = false;
	for (let curlang of curlangs) {
		let f = false;
		for (let lang of langs) {
			if (curlang == lang) {
				f = true;
				break;
			}
		}
		if (!f) {
			langchange = true;
			break;
		}
	}
	if (!langchange) {
		for (let lang of langs) {
			let f = false;
			for (let curlang of curlangs) {
				if (curlang == lang) {
					f = true;
					break;
				}
			}
			if (!f) {
				langchange = true;
				break;
			}
		}
	}
	if (langchange) {
		let numwords;
		[ref, numwords] = buildref(langs);
		console.log(`There are ${numwords} words in the dictionary`);
		if (numwords == 0)
			return true;
	}
	curlangs = langs;
	let date = new Date().toISOString().slice(0, 10);
	let seed = srand(date+langs);
	if (random) {
		seed = (Math.random() * (1 << 30)) | 0;
		console.log(`srand(${seed})`);
		rand = frand(seed);
	} else {
		console.log(`date=${date} srand(${date+langs})`);
		rand = frand(seed[0]);
	}
	while (true) {
		grid = randgrid("Classic");
		targets = findwords(ref, MINTARGETLENGTH, grid);
		if (targets.length > 30)
			break;
		console.log(`Only ${targets.length} target words in the grid, throwing the dice again`);
	}
	let weights = [];
	let i;
	for (i=0; i<targets.length; ++i)
		weights[i] = (targets[i]["path"].length - 3) + (weights[i-1] || 0);
	let rand_t = rand() % weights[weights.length - 1];
	for (i=0; i<weights.length; ++i) {
		if (weights[i] > rand_t)
			break;
	}
	target = targets[i];
	//console.log(target);
	found = findwords(ref, MINLENGTH, grid);
	updatecells(grid);
	updateremaining(targets);
	let enter = document.querySelector("#enter");
	enter.onclick = (event) => { play(); };
	enter.textContent = "⏎";
	update();
	for (let g=0; g<16; ++g) {
		let cell = document.querySelector(`#cell_${g}`);
		cell.onclick = (event) => {
			for (let [i,j] of curpath) {
				if (i*4+j == g) {
					removefrompos(i,j);
					return;
				}
			}
			for (let [i,j] of valid) {
				if (i*4+j == g) {
					addpos(i, j);
					return;
				}
			}
			// show help?
		}
	}
	let history = document.querySelector("#history");
	for (let histli of history.children) {
		histli.textContent = "";
		histli.classList = "";
	}
	incrementcounter();
	if (!random) {
		let prevdate = getcookie("date");
		console.log(`date=${prevdate} (read from cookies)`);
		if (!prevdate)
			setcookie("date", date);
		else if (date !== prevdate) {
			console.log(`currentdate=${date} ≠ date=${prevdate} → clear cookies`);
			for (let cookiename of getcookienames())
				clearcookie(cookiename);
			setcookie("date", date);
		} else {
			for (let t=1; t<=NUMTRIES; ++t) {
				let path = getcookie(`hist_${langs.join("_")}_${t}`);
				if (path?.length > 0) {
					curpath = path.split("_")
						.map((pair) => [Number(pair[0]), Number(pair[1])]);
					word = curpath.map((pos) => grid[pos[0]*4+pos[1]]).join("");
					if (play() === false) {
						console.log("Bad path read from cookie; clearing all cookies and refreshing game");
						for (let cookiename of getcookienames())
							clearcookie(cookiename);
						return false;
					}
				} else
					break;
			}
		}
	}
	return true;
}

function setupgame(random=false) {
	for (let i = 0; i < 50; ++i) {
		if (inner_setupgame(random))
			return;
	}
}

function chooselang() {
	let langs = [];
	for (let inputlang of document.querySelectorAll("input.lang")) {
		if (inputlang.checked)
			langs.push(inputlang.id.split("_")[1]);
	}
	if (langs.length == 0)
		return;
	langs.sort();
	const url = document.URL.split("?")[0];
	document.location.href = url + "?lang=" + langs.join("_");
}

function setuplangs() {
	for (let inputlang of document.querySelectorAll("input.lang"))
		inputlang.onclick = (event) => { chooselang(); };
}

window.onload = (event) => {
	document.getElementById("update_date").textContent = "2023-02-11";
	setuplangs();
	setupgame();
};
