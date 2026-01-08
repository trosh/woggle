/* jshint esversion: 11 */

// A décommenter quand j'aurais compris comment ça marche lolilol
//if ("serviceWorker" in navigator) {
//	navigator.serviceWorker.register("sw.js").then(reg => {
//		reg.update();
//	});
//}

let dic_original = false; // Original lists of words, for wiktionary URLs
let dic_target   = false; // Prefix dictionaries with most "popular" words for target search
let dic_player   = false; // Prefix dictionaries with many words for player moves validation

function getstored(name) {
	const value = localStorage.getItem(name);
	console.log("get stored: "+name+": "+value);
	return value;
}

function setstored(name, value) {
	console.log("set stored: "+name+": "+value);
	localStorage.setItem(name, value);
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
	};
}

let rand;

const NUMTRIES = 5;
const LANGS = ["en", "fr", "en_fr"];

let ref_target, ref_player, grid, targets, targetword, targetpath, longestwords, word, counter;
let valid, curpath, good, bad;
let curlangs=[], getlang, langs, date;
let randomgame=false;

function buildref(dic, langs) {
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

function langname(lang) {
	if (lang === undefined)
		lang = getlang;
	switch (lang) {
		case undefined: //fallthrough
		case "en": return "🇬🇧English";
		case "fr": return "🇫🇷French";
		case "en_fr": return "🇬🇧🇫🇷Franglais";
		default: return "??";
	}
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
	let thrown = [];
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

function _findwords(ref, grid, done, found, w, path) {
	let [i, j] = path[path.length - 1];
	//assert not done[i*4+j]
	done[i*4+j] = true;
	w += grid[i*4+j];
	let _word = w.replaceAll("q", "QU");
	let ret = inref(ref, _word);
	if (ret === true) {
		//found.push({"path": [...path], "word": _word});
		if (found[_word] === undefined)
			found[_word] = [];
		found[_word].push([...path]);
	}
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
	return found;
}

function findwords(ref, grid) {
	let found = {};
	let done = [];
	for (let i=0; i<16; ++i)
		done.push(false);
	for (let i=0; i<4; ++i) {
	for (let j=0; j<4; ++j)
		found = _findwords(ref, grid, done, found, "", [[i, j]]);
	}
	return found;
}

function findlongestwords(targets) {
	let maxlength = 0;
	let longestwords = [];
	for (const word in targets) {
		if (word.length > maxlength) {
			maxlength = word.length;
			longestwords = [word];
		} else if (word.length === maxlength)
			longestwords.push(word);
	}
	return longestwords;
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
	for (let g=0; g<16; ++g) {
		const cell = document.querySelector(`#cell_${g}`);
		cell.classList.remove("curfirst");
		cell.classList.remove("cur");
		cell.classList.remove("good");
		cell.classList.remove("bad");
	}
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

function updatetargets(targets, usedword) {
	let newtargets = {};
	for (const word in targets) {
		if (word === usedword)
			continue;
		let first = true;
		for (const path of targets[word]) {
			let ingood = true;
			for (const pos of good) {
				if (!inpath(pos, path)) {
					ingood = false;
					break;
				}
			}
			if (!ingood)
				continue;
			let hasbad = false;
			for (const pos of bad) {
				if (inpath(pos, path)) {
					hasbad = true;
					break;
				}
			}
			if (hasbad)
				continue;
			if (first)
				newtargets[word] = [];
			newtargets[word].push(path);
			first = false;
		}
	}
	return newtargets;
}

function findmatches(evt) {
	const span = evt.target;
	const word = span.textContent;
	let html = "";
	let nb = 0;
	for (let lang of curlangs) {
		for (let orig of dic_original[lang]) {
			const conv = orig.toUpperCase().normalize("NFD")
				.replace(/[\u0300-\u03f6]/g, "") ;
			if (conv !== word)
				continue;
			if (nb > 0)
				html += "/";
			html += `<a target="_blank" rel="noopener noreferrer" href="https://${lang}.wiktionary.org/wiki/${orig}">${orig}</a>`;
			++nb;
		}
	}
	span.onclick = undefined;
	span.innerHTML = html;
	if (nb == 1)
		span.firstChild.click();
}

function showrulesframe() {
	const prevframe = document.querySelector("#endframebg");
	if (prevframe !== null)
		prevframe.parentElement.removeChild(prevframe);
	const endframebg = document.createElement("div");
	const endframe = document.createElement("div");
	endframebg.id = "endframebg";
	endframe.id = "endframe";
	const cross = document.createElement("a");
	cross.textContent = "╳";
	const crossline = document.createElement("p");
	crossline.id = "crossline";
	crossline.appendChild(cross);
	endframe.appendChild(crossline);
	const rulesframe = document.createElement("div");
	rulesframe.id = "rulesframe";
	endframe.appendChild(rulesframe);
	endframebg.appendChild(endframe);
	cross.onclick = () => {
		const frame = document.querySelector("#endframebg");
		frame.parentElement.removeChild(frame);
	};
	document.body.appendChild(endframebg);
	rulesframe.innerHTML = document.querySelector("#rules").innerHTML;
	for (let b of document.querySelectorAll(".clearstorage")) {
		b.onclick = () => {
			localStorage.clear();
			location.reload();
		};
	}
	for (let w of document.querySelectorAll("span.findmatches"))
		w.onclick = findmatches;
}

function showendframe(win) {
	const prevframe = document.querySelector("div#endframebg");
	if (prevframe !== null)
		prevframe.parentElement.removeChild(prevframe);
	const endframebg = document.createElement("div");
	const endframe = document.createElement("div");
	endframebg.id = "endframebg";
	endframe.id = "endframe";
	const cross = document.createElement("a");
	cross.textContent = "╳";
	const crossline = document.createElement("p");
	crossline.id = "crossline";
	crossline.appendChild(cross);
	endframe.appendChild(crossline);
	const title = document.createElement("h1");
	title.textContent = (win ? "🎊" : "😩");
	endframe.appendChild(title);
	const answer = document.createElement("p");
	answer.id = "answer";
	endframe.appendChild(answer);
	endframebg.appendChild(endframe);
	cross.onclick = () => {
		const frame = document.querySelector("#endframebg");
		frame.parentElement.removeChild(frame);
	};
	document.body.appendChild(endframebg);
	const extra = showtarget(win);
	if (randomgame)
		return; // Do not offer to share the results of a random grid
	endframe.appendChild(document.createElement("hr"));
	const dispshare = document.createElement("p");
	dispshare.appendChild(document.createTextNode("Share results: "));
	const share = document.createElement("textarea");
	share.id = "share";
	if (win)
		share.textContent = `I found the mystery ${longestwords[0].length}-letter word${extra} `
			+ `for today's ${langname()} Woggle in ${counter} tr${counter>1?"ies":"y"}!\n`
			+ `Can you find it too?\n${document.URL}`;
	else
		share.textContent = `Can you find the mystery ${longestwords[0].length}-letter word for today's ${langname()} Woggle in ${NUMTRIES} tries or less?\n${document.URL}`;
	share.rows = 6;
	share.cols = 40;
	const copy = document.createElement("button");
	copy.id = "copy";
	copy.textContent = "copy";
	dispshare.appendChild(copy);
	dispshare.appendChild(document.createElement("br"));
	dispshare.appendChild(share);
	copy.onclick = () => {
		try {
			share.select();
			document.execCommand("copy");
			const copied = document.createElement("span");
			copied.textContent = "copied!";
			copy.replaceWith(copied);
			share.blur();
		} catch (e) {
			window.alert(`l. ${e.lineNumber}: ${e}`);
			throw e;
		}
	};
	endframe.appendChild(dispshare);
	const shareagain = document.querySelector("#shareagain");
	shareagain.style.visibility = "visible";
	shareagain.onclick = () => { showendframe(win); };
}

function play() {
	try {
	if (word.includes(" "))
		return false;
	if (ref_player === null) {
		window.alert("The player dictionary is not yet ready…");
		return false;
	}
	if (!inref(ref_player, word)) {
		word += " not in dict ";
		curpath = [];
		update();
		return false;
	}
	let history = document.querySelector("#history");
	for (let histli of history.children) {
		if (histli.firstChild !== null
		 && histli.firstChild.textContent === word) {
			word += " already played ";
			curpath = [];
			update();
			return false;
		}
	}
	for (const pos of curpath) {
		if (inpath(pos, targetpath)) {
			if (!inpath(pos, good))
				good.push(pos);
		} else {
			if (!inpath(pos, bad))
				bad.push(pos);
		}
	}
	targets = updatetargets(targets, word);
	history.children[counter - 1].innerHTML = "<span class='findmatches'>"+word+"</span>";
	for (let w of document.querySelectorAll("span.findmatches"))
		w.onclick = findmatches;
	let curpathstr = curpath.map((pos) => pos.join("")).join("_");
	console.log(`curpathstr: ${curpathstr}`);
	let storedname = `hist_${getlang}_${counter}`;
	if (!getstored(storedname))
		setstored(storedname, curpathstr);
	if (word === targetword) { //comparepaths(curpath, targetpath);
		for (let pos of targetpath) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = "next @&nbsp;00:00&nbsp;UTC";
		curpath = targetpath;
		document.querySelector("#top").style.display = "none";
		update();
		history.children[counter - 1].classList.add("histwin");
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		const enter = document.querySelector("#enter");
		enter.style.visibility = "hidden";
		const randomize = document.querySelector("#randomize");
		randomize.style.visibility = "visible";
		randomize.onclick = (event) => { randomgame = true; setupgame(); };
		showendframe(true);
		setstored("win_"+getlang, "true");
	} else {
		curpath = [];
		word = "";
		update();
		incrementcounter();
		const button = document.querySelector("#togglecolours");
		button.classList.add("desaturate");
		button.style.visibility = "visible";
		button.onclick = togglecolours;
	}
	} catch (e) {
		window.alert(`l. ${e.lineNumber}: ${e}`);
		throw e;
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
		for (let pos of targetpath) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = "word was <span class='findmatches'>"+targetword+"</span>";
		curpath = targetpath;
		document.querySelector("#top").style.display = "none";
		update();
		for (let w of document.querySelectorAll("span.findmatches"))
			w.onclick = findmatches;
		for (let g=0; g<16; ++g) {
			let cell = document.querySelector(`#cell_${g}`);
			cell.onclick = null;
		}
		let enter = document.querySelector("#enter");
		enter.style.visibility = "hidden";
		const randomize = document.querySelector("#randomize");
		randomize.style.visibility = "visible";
		randomize.onclick = (event) => { randomgame = true; setupgame(); };
		showendframe(false);
	}
}

function showtarget(win) {
	let ret = "";
	let html = (win ? "Congratulation! You found the" : "Too bad… Try again tomorrow!<br>The");
	html += ` target word`;
	html += `${win?"":" was"}: <span class="findmatches">${targetword}</span><br>`;
	const disp = document.querySelector("#answer");
	disp.innerHTML = html;
	return ret;
}

function togglecolours() {
	const button = document.querySelector("#togglecolours");
	if (button.classList.contains("desaturate")) {
		for (let g=0; g<16; ++g) {
			const cell = document.querySelector(`#cell_${g}`);
			cell.classList.add("desaturate");
		}
		button.classList.remove("desaturate");
	} else {
		for (let g=0; g<16; ++g) {
			const cell = document.querySelector(`#cell_${g}`);
			cell.classList.remove("desaturate");
		}
		button.classList.add("desaturate");
	}
}

function setup_from_localStorage(langs) {
	if (randomgame)
		return false;
	let prevdate = getstored("date");
	console.log(`date=${prevdate} (read from localStorage)`);
	if (!prevdate) {
		setstored("date", date);
		return false;
	}
	if (date !== prevdate) {
		console.warn(`currentdate=${date} ≠ date=${prevdate} → clear localStorage`);
		localStorage.clear();
		setstored("date", date);
		return false;
	}
	// TODO try loading grid from localStorage
	for (let t=1; t<=NUMTRIES; ++t) {
		let path = getstored(`hist_${getlang}_${t}`);
		if (path === null || path.length === 0)
			return false;
		curpath = path.split("_")
			.map((pair) => [Number(pair[0]), Number(pair[1])]);
		word = curpath.map((pos) => grid[pos[0]*4+pos[1]])
			.join("").replaceAll("q", "QU");
		if (play() === false) {
			console.warn("Bad path read from localStorage; clearing all localStorage and refreshing game");
			localStorage.clear();
			word = "";
			update();
			return false;
		}
	}
	return true;
}

function get_archive_date(date) {
	if (!document.URL.includes("?"))
		return undefined;
	getarchive = document.URL.split("?")[1].split("&")
		?.find((v) => v.startsWith("archive="))
		?.split("=")[1];
	if (getarchive === undefined
	 || getarchive.length === 0)
		return undefined;
	archive = new Date(getarchive);
	if (isNaN(archive.valueOf())) {
		console.error(`Failed to parse archive=${getarchive}`);
		return undefined;
	}
	if (archive.getDate() > date.getDate()) {
		console.error(`No reading the future! archive=${getarchive}`);
		return undefined;
	}
	console.log(`archive=${archive}`);
	return archive;
}

function get_date_string() {
	date = new Date();
	archive = get_archive_date(date);
	if (archive !== undefined)
		date = archive;
	return date.toISOString().slice(0, 10);
}

function inner_setupgame() {
	console.log(`inner_setupgame(random=${randomgame})`);
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
	let getlan;
	if (document.URL.includes("?"))
		getlang = document.URL.split("?")[1].split("&")
			?.find((v) => v.startsWith("lang="))
			?.split("=")[1];
	if (getlang === undefined || getlang.length === 0)
		getlang = "en"; // default value
	document.querySelector("#curlang").textContent = langname(getlang);
	langs = getlang.split("_");
	let numwords;
	[ref_target, numwords] = buildref(dic_target, langs);
	console.log(`There are ${numwords} words in the dictionary`);
	if (numwords == 0)
		return true;
	curlangs = langs;
	date = get_date_string();
	let seed = srand(date+langs);
	if (randomgame) {
		seed = (Math.random() * (1 << 30)) | 0;
		console.log(`srand(${seed})`);
		rand = frand(seed);
	} else {
		console.log(`date=${date} srand(${date+langs})`);
		rand = frand(seed[0]);
	}
	while (true) {
		grid = randgrid("Classic");
		targets = findwords(ref_target, grid);
		const longest = document.querySelector("#longest");
		const targetwords = Object.keys(targets).filter(word => word.length >= 5);
		if (targetwords.length < 10) {
			console.log(`Only ${targetwords.length} target words with ≥ 5 letters in the grid, throwing the dice again`);
			continue;
		}
		longestwords = findlongestwords(targets);
		const maxlength = longestwords[0].length
		if (maxlength < 7) {
			console.log(`Longest word is only ${maxlength}-letters long, throwing the dice again`);
			continue;
		}
		break;
	}
	targetword = longestwords[rand() % longestwords.length];
	targetpath = targets[targetword][rand() % targets[targetword].length];
	//console.log(targetword);
	document.querySelector("#top")       .style.display = "block";
	document.querySelector("#enter")     .style.visibility = "visible";
	document.querySelector("#shareagain").style.visibility = "hidden";
	document.querySelector("#randomize") .style.visibility = "hidden";
	//document.querySelector("#otherlongest").textContent = "";
	updatecells(grid);
	document.querySelector("#targetlength").innerText = `Target word is ${targetword.length}-letters`;
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
		};
	}
	let history = document.querySelector("#history");
	for (let histli of history.children) {
		histli.textContent = "";
		histli.classList = "";
	}
	incrementcounter();
	return true;
}

function setupgame() {
	try {
	for (let i = 0; i < 50; ++i) {
		if (inner_setupgame())
			return;
	}
	} catch (e) {
		window.alert(`l. ${e.lineNumber}: ${e}`);
		throw e;
	}
	console.error("I give up");
}

function setuplangs() {
	document.querySelector("#changelang").onclick = () => {
		const prevframe = document.querySelector("#endframebg");
		if (prevframe !== null)
			prevframe.parentElement.removeChild(prevframe);
		const endframebg = document.createElement("div");
		const endframe = document.createElement("div");
		endframebg.id = "endframebg";
		endframe.id = "endframe";
		const cross = document.createElement("a");
		cross.textContent = "╳";
		const crossline = document.createElement("p");
		crossline.id = "crossline";
		crossline.appendChild(cross);
		endframe.appendChild(crossline);
		const title = document.createElement("h2");
		title.textContent = "Change language";
		endframe.appendChild(title);
		for (let lang of LANGS) {
			const langbutt = document.createElement("button");
			langbutt.textContent = langname(lang);
			langbutt.onclick = () => {
				document.location.href =
					document.URL.split("?")[0] + "?lang="+lang;
			};
			const langline = document.createElement("p");
			langline.classList.add("langline"); 
			langline.appendChild(langbutt);
			if (getstored("win_"+lang) === "true")
				langline.appendChild(document.createTextNode(" ✅"));
			langline.appendChild(document.createElement("br"));
			endframe.appendChild(langline);
		}
		endframebg.appendChild(endframe);
		cross.onclick = () => {
			const frame = document.querySelector("#endframebg");
			frame.parentElement.removeChild(frame);
		};
		document.body.appendChild(endframebg);
	};
}

window.onload = (event) => {
	document.querySelector("#update_date").textContent = "2024-08-20";
	document.querySelector("#showrules").onclick = showrulesframe;
	const loading_original = document.querySelector("#loading_original");
	const loading_target   = document.querySelector("#loading_target");
	const loading_player   = document.querySelector("#loading_player");
	loading_target.style.display = "block";
	fetch("/v16/dic_target.json").then(resp => resp.json()).then(json => {
		console.log("Parsed dic_target");
		dic_target = json; // Required to start building grid
		document.querySelector("#loading_target").style.display = "none";
		setupgame(); // Provides `langs`
		loading_player.style.display = "block";
		fetch("/v16/dic_player.json").then(resp => resp.json()).then(json => {
			console.log("Parsed dic_player");
			dic_player = json;
			loading_player.style.display = "none";
			let numwords_player;
			[ref_player, numwords_player] = buildref(dic_player, langs);
			console.log(`numwords_player: ${numwords_player}`);
			setup_from_localStorage(langs); // Requires `ref_player`
			loading_original.style.display = "block";
			fetch("/v16/dic_original.json").then(resp => resp.json()).then(json => {
				console.log("Parsed dic_original");
				dic_original = json;
				loading_original.style.display = "none";
			});
		});
	});
	setuplangs();
};
