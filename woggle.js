import {dic} from "./fr.dic.js";

function buildref() {
	let ref = {};
	let numwords = 0;
	let pos = [];
	let _ref = ref;
	for (let c of dic) {
		if (c == ".") {
			_ref[true] = true;
			if (++numwords % 10000 == 0)
				console.log(numwords);
		}
		else if (c == ";")
			_ref = pos.pop();
		else {
			_ref[c] = {};
			pos.push(_ref);
			_ref = _ref[c];
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

function _findwords(ref, grid, done, found, word, i, j) {
	//assert not done[i*4+j]
	done[i*4+j] = true;
	word += grid[i*4+j];
	let _word = word.replaceAll("q", "QU");
	let ret = inref(ref, _word);
	if (ret === true && !found.includes(_word))
		found.push(_word);
	if (ret !== null) {
		for (let ii=Math.max(0,i-1); ii<Math.min(4,i+2); ++ii) {
		for (let jj=Math.max(0,j-1); jj<Math.min(4,j+2); ++jj) {
			if (!done[ii*4+jj])
				_findwords(ref, grid, done, found, word, ii, jj);
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
		_findwords(ref, grid, done, found, "", i, j);
	}
	return found;
}

function updatecells(grid) {
	for (let g=0; g<16; ++g) {
		let cell = document.querySelector(`#cell_${g}`);
		let c = grid[g];
		if (c == "q")
			cell.textContent = "Q";
		else
			cell.textContent = c;
	}
}

let ref, grid, found;
let valid = [];
let curpath = [];
let word = "";
let counter = 0;

function allvalid() {
	for (let i=0; i<4; ++i)
	for (let j=0; j<4; ++j)
		valid.push([i,j]);
}

function update() {
	if (curpath.length > 0) {
		let nextvalid = [];
		let [i,j] = curpath[curpath.length - 1];
		for (let ii=Math.max(0,i-1); ii<Math.min(4,i+2); ++ii) {
		for (let jj=Math.max(0,j-1); jj<Math.min(4,j+2); ++jj) {
			let used = false;
			for (let [ci,cj] of curpath) {
				if (ii==ci && jj==cj) {
					used = true;
					break;
				}
			}
			if (!used)
				nextvalid.push([ii,jj]);
		}
		}
		valid = nextvalid;
	} else
		allvalid();
	let disp = document.querySelector("#word");
	disp.textContent = word + "␣".repeat(Math.max(4-word.length, 1));
}

function addpos(i, j) {
	let g = i*4+j;
	console.log(`addpos(${grid[g]})`);
	word += grid[g].replace("q", "QU");
	if (word.length >= 4) {
		let enter = document.querySelector("#enter");
		enter.onclick = (event) => { play(); };
	}
	curpath.push([i,j]);
	update();
}

function removefrompos(i, j) {
	console.log(`removefrompos(${i},${j})`);
	for (let n = curpath.length - 1; n >= 0; --n) {
		let [ii,jj] = curpath[n];
		curpath.splice(n, 1);
		let c = grid[ii*4+jj].replace("q", "QU");
		let m = word.lastIndexOf(c);
		word = word.slice(0, m);
		if (ii==i && jj==j)
			break;
	}
	update();
}

function play() {
	if (inref(ref, word) === true) {
		incrementcounter();
	} else {
		word = "";
		curpath = [];
		update();
	}
} 

function incrementcounter() {
	++counter;
	let disp = document.querySelector("#counter");
	disp.textContent = `${counter}/5`;
}

window.onload = (event) => {
	const tbody = document.querySelector("table#grid > tbody");
	for (let i=0; i<4; ++i) {
		let row = document.createElement("tr");
		tbody.appendChild(row);
		for (let j=0; j<4; ++j) {
			let cell = document.createElement("td");
			cell.id = `cell_${i*4+j}`;
			row.appendChild(cell);
		}
	}
	let numwords;
	[ref, numwords] = buildref();
	console.log(`There are ${numwords} words in the dictionary`);
	while (true) {
		grid = randgrid("Classic");
		found = findwords(ref, grid);
		if (found.length > 30)
			break;
		console.log(`Only ${found.length} words in the grid, throwing the dice again`);
	}
	console.log(`There are ${found.length} words in the grid`);
	updatecells(grid);
	update();
	for (let g=0; g<16; ++g) {
		let cell = document.querySelector(`#cell_${g}`);
		cell.onclick = (event) => {
			console.log(`curpath=${curpath}`);
			for (let [i,j] of curpath) {
				if (i*4+j == g) {
					removefrompos(i,j);
					return;
				}
			}
			console.log(`valid=${valid}`);
			for (let [i,j] of valid) {
				if (i*4+j == g) {
					addpos(i, j);
					return;
				}
			}
			console.log("not in curpath nor valid");
			// show help?
		}
	}
	incrementcounter();
};
