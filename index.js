import {dic} from "./dic.js";

let ref, grid, found, target, word, counter;
let valid, curpath, good, bad;
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
				_ref[c] = {};
				pos.push(_ref);
				_ref = _ref[c];
			}
		}
	}
	//assert(ref == _ref);
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
		let n = Math.floor(Math.random() * 6);
		thrown.push(dice[diceset][d].charAt(n));
	}
	// Dice permutation
	for (let g=0; g<16; ++g) {
		let n = Math.floor(Math.random() * thrown.length);
		grid[g] = thrown[n];
		thrown.splice(n, 1);
	}
	//assert len(thrown) == 0
	return grid;
}

function _findwords(ref, grid, done, found, w, path) {
	let [i, j] = path[path.length - 1];
	//assert not done[i*4+j]
	done[i*4+j] = true;
	w += grid[i*4+j];
	let _word = w.replaceAll("q", "QU");
	let ret = inref(ref, _word);
	if (ret === true)
		found.push({"path": [...path], "word": _word});
	if (ret !== null) {
		for (let ii=Math.max(0,i-1); ii<Math.min(4,i+2); ++ii) {
		for (let jj=Math.max(0,j-1); jj<Math.min(4,j+2); ++jj) {
			if (done[ii*4+jj])
				continue;
			path.push([ii,jj]);
			_findwords(ref, grid, done, found, w, path);
			path.pop();
		}
		}
	}
	done[i*4+j] = false;
}

function findwords(ref, grid) {
	let found = [];
	let done = [];
	for (let i=0; i<16; ++i)
		done.push(false);
	for (let i=0; i<4; ++i) {
	for (let j=0; j<4; ++j)
		_findwords(ref, grid, done, found, "", [[i, j]]);
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
		disp.textContent = word;
	else
		disp.textContent = word + "␣".repeat(Math.max(4-word.length, 1));
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
	for (let [i,j] of curpath)
		document.querySelector(`#cell_${i*4+j}`).classList.add("cur");
	for (let [i,j] of good)
		document.querySelector(`#cell_${i*4+j}`).classList.add("good");
	for (let [i,j] of bad)
		document.querySelector(`#cell_${i*4+j}`).classList.add("bad");
	updateword();
	//let enter = document.querySelector("#enter")
	//if (word.length >= 4) enter.onclick = (event) => { play(); };
	//else enter.onclick = null;
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

function updatefound() {
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
		if (ingood && !hasbad)
			newfound.push(word)
	}
	found = newfound;
	updateremaining();
}

function play() {
	if (word.includes(" "))
		return;
	if (word.length < 4) {
		word += " too short ";
		curpath = [];
		update();
		return;
	}
	if (!inref(ref, word)) {
		word += " not in dict ";
		curpath = [];
		update();
		return;
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
	updatefound();
	if (word == target["word"]) { //comparepaths(curpath, target["path"]);
		for (let pos of target["path"]) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = `you win with ${word} `;
		curpath = target["path"];
		update();
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		let enter = document.querySelector("#enter");
		enter.textContent = "replay";
		enter.onclick = (event) => { setupgame(curlangs); };
	} else {
		word = "";
		curpath = [];
		update();
		incrementcounter();
	}
}

function incrementcounter() {
	++counter;
	let disp = document.querySelector("#counter");
	if (counter <= 5) {
		disp.textContent = counter;
	} else {
		word = `word was ${target["word"]} `;
		curpath = target["path"];
		update();
		disp.textContent = "💀";
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		let enter = document.querySelector("#enter");
		enter.textContent = "replay";
		enter.onclick = (event) => { setupgame(curlangs); };
	}
}

function updateremaining() {
	let remaining = document.querySelector("#remaining");
	remaining.textContent = found.length;
}

function setupgame(langs) {
	valid = [];
	curpath = [];
	good = [];
	bad = [];
	word = [];
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
	for (let button of document.querySelectorAll(".curlang"))
		button.classList.remove("curlang");
	document.querySelector(`#lang_${langs.join('')}`).classList.add("curlang");
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
	}
	curlangs = langs;
	while (true) {
		grid = randgrid("Classic");
		found = findwords(ref, grid);
		if (found.length > 40)
			break;
		console.log(`Only ${found.length} words in the grid, throwing the dice again`);
	}
	let weights = [];
	let i;
	for (i=0; i<found.length; ++i)
		weights[i] = (found[i]["path"].length - 3) + (weights[i-1] || 0);
	let rand_t = Math.random() * weights[weights.length - 1];
	for (i=0; i<weights.length; ++i) {
		if (weights[i] > rand_t)
			break;
	}
	target = found[i];
	console.log(target);
	updatecells(grid);
	updateremaining();
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
	incrementcounter();
};

window.onload = (event) => { setupgame(["en"]); };

document.querySelector("#lang_en").onclick = (event) => { setupgame(["en"]); };
document.querySelector("#lang_fr").onclick = (event) => { setupgame(["fr"]); };
document.querySelector("#lang_enfr").onclick = (event) => { setupgame(["en","fr"]); };
