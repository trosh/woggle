/* jshint esversion: 11 */

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
		console.warn(`No cookie found with name “${name}”`);
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

//async function refreshUI() {
//	await new Promise(r => setTimeout(r, 0));
//}

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

const MINLENGTH = 4;
const NUMTRIES = 5;
const LANGS = ["en", "fr", "en_fr"];

let ref, grid, targets, targetword, targetpath, longestwords, word, counter;
let valid, curpath, good, bad;
let curlangs = [], getlang;
let randomgame = false;

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

function langname(lang) {
	if (lang === undefined)
		lang = getlang;
	switch (lang) {
		case undefined:; //fallthrough
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

function _findwords(ref, minlen, grid, done, found, w, path) {
	let [i, j] = path[path.length - 1];
	//assert not done[i*4+j]
	done[i*4+j] = true;
	w += grid[i*4+j];
	let _word = w.replaceAll("q", "QU");
	let ret = inref(ref, _word);
	if (_word.length >= minlen
	    && ret === true) {
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
			_findwords(ref, minlen, grid, done, found, w, path);
			path.pop();
		}
		}
	}
	done[i*4+j] = false;
	return found;
}

function findwords(ref, minlen, grid) {
	let found = {};
	let done = [];
	for (let i=0; i<16; ++i)
		done.push(false);
	for (let i=0; i<4; ++i) {
	for (let j=0; j<4; ++j)
		found = _findwords(ref, minlen, grid, done, found, "", [[i, j]]);
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
		for (let orig of dic[lang + "_orig"]) {
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
	for (let b of document.querySelectorAll(".clearcookies")) {
		b.onclick = () => {
			for (let cookiename of getcookienames())
				clearcookie(cookiename);
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
	const extra = showlongest(win);
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
			+ `Can you do better?\n${document.URL}`;
	else
		share.textContent = `Can you find the mystery ${longestwords[0].length}-letter word for today's ${langname()} Woggle in ${NUMTRIES} tries or less?\n${document.URL}`;
	share.rows = 6;
	share.cols = 50;
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
	updateremaining(targets);
	updatelongest(targets);
	history.children[counter - 1].innerHTML = "<span class='findmatches'>"+word+"</span>";
	for (let w of document.querySelectorAll("span.findmatches"))
		w.onclick = findmatches;
	let curpathstr = curpath.map((pos) => pos.join("")).join("_");
	console.log(`curpathstr: ${curpathstr}`);
	let cookiename = `hist_${curlangs.join("_")}_${counter}`;
	if (!getcookie(cookiename))
		setcookie(cookiename, curpathstr);
	if (word === targetword) { //comparepaths(curpath, targetpath);
		for (let pos of targetpath) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = "next grid @ 00:00 UTC";
		curpath = targetpath;
		updateremaining(targets);
		document.querySelector("#top").style.visibility = "hidden";
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
		setcookie("win_"+getlang, "true");
	} else {
		curpath = [];
		word = "";
		update();
		incrementcounter();
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
		disp.textContent = "1 try left,";
	else if (counter < NUMTRIES)
		disp.textContent = (NUMTRIES+1 - counter) + " tries left,";
	else {
		for (let pos of targetpath) {
			if (!inpath(pos, good))
				good.push(pos);
		}
		word = "word was <span class='findmatches'>"+targetword+"</span>";
		curpath = targetpath;
		document.querySelector("#top").style.visibility = "hidden";
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

function updateremaining(targets) {
	const remaining = document.querySelector("#remaining");
	const numremain = Object.keys(targets).length;
	const s = numremain > 1 ? "s" : "";
	remaining.textContent = `${numremain} remaining word${s}`;
}

function updatelongest(targets) {
	const longest = document.querySelector("#longest");
	const sublongestwords = findlongestwords(targets);
	const maxlength = longestwords[0].length;
	let nummax = 0;
	if (sublongestwords.length > 0
	 && sublongestwords[0].length === maxlength)
		nummax = sublongestwords.length;
	const s = (nummax > 1 ? "s" : "");
	longest.textContent = `${nummax} remaining ${maxlength}-letter word${s}`;
}

function showlongest(win) {
	const maxlength = longestwords[0].length;
	let otherlongest = [];
	let unfoundlongest = [];
	for (let w of longestwords) {
		if (w === targetword)
			continue;
		let found = false;
		let history = document.querySelector("#history");
		for (let histli of history.children) {
			if (histli.textContent
			 && histli.textContent === w) {
				found = true;
				otherlongest.push(w);
				break;
			}
		}
		if (!found)
			unfoundlongest.push(w);
	}
	let ret = "";
	let html = (win ? "Congratulation! You found the" : "Too bad… Try again tomorrow!<br>The");
	html += ` ${longestwords.length>1?"target":"only "+maxlength+"-letter"} word`;
	html += `${win?"":" was"}: <span class="findmatches">${targetword}</span><br>`;
	if (otherlongest.length > 0) {
		const s = (otherlongest.length > 1);
		html += `You ${win?"also ":""}found ${s?"these":"this"} ${maxlength}-letter word${s?"s":""}:<br>`;
		for (let w of otherlongest)
			html += `<span class='findmatches'>${w}</span> `;
		ret = ` (+${otherlongest.length} extra word${s?"s":""} 💪)`;
	}
	if (unfoundlongest.length > 0) {
		if (otherlongest.length > 0)
			html += "<br>";
		const s = (unfoundlongest.length > 1);
		html += `Also in the grid ${s?"were these":"was this"} ${maxlength}-letter word${s?"s":""}:<br>`;
		for (let w of unfoundlongest)
			html += `<span class='findmatches'>${w}</span> `;
	}
	const disp = document.querySelector("#answer");
	disp.innerHTML = html;
	for (let w of document.querySelectorAll("span.findmatches"))
		w.onclick = findmatches;
	return ret;
}

function setup_from_cookies(date, langs) {
	if (randomgame)
		return false;
	let prevdate = getcookie("date");
	console.log(`date=${prevdate} (read from cookies)`);
	if (!prevdate) {
		setcookie("date", date);
		return false;
	}
	if (date !== prevdate) {
		console.warn(`currentdate=${date} ≠ date=${prevdate} → clear cookies`);
		for (let cookiename of getcookienames())
			clearcookie(cookiename);
		setcookie("date", date);
		return false;
	}
	// TODO try loading grid from cookies
	for (let t=1; t<=NUMTRIES; ++t) {
		let path = getcookie(`hist_${langs.join("_")}_${t}`);
		if (path === undefined || path.length === 0)
			return false;
		curpath = path.split("_")
			.map((pair) => [Number(pair[0]), Number(pair[1])]);
		word = curpath.map((pos) => grid[pos[0]*4+pos[1]])
			.join("").replaceAll("q", "QU");
		if (play() === false) {
			console.warn("Bad path read from cookie; clearing all cookies and refreshing game");
			for (let cookiename of getcookienames())
				clearcookie(cookiename);
			return false;
		}
	}
	return true;
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
	let langs = ["en"]; // default value
	getlang = document.URL.split("?")[1]?.split("&")
		?.find((v) => v.startsWith("lang="))
		?.split("=")[1];
	if (getlang?.length > 0)
		langs = getlang.split("_");
	if (langs.length == 0)
		return;
	document.querySelector("#curlang").textContent = langname();
	let numwords;
	[ref, numwords] = buildref(langs);
	console.log(`There are ${numwords} words in the dictionary`);
	if (numwords == 0)
		return true;
	curlangs = langs;
	let date = new Date().toISOString().slice(0, 10);
	let seed = srand(date+langs);
	if (randomgame) {
		seed = (Math.random() * (1 << 30)) | 0;
		console.log(`srand(${seed})`);
		rand = frand(seed);
	} else {
		console.log(`date=${date} srand(${date+langs})`);
		rand = frand(seed[0]);
	}
	let targetwords;
	while (true) {
		grid = randgrid("Classic");
		targets = findwords(ref, MINLENGTH, grid);
		const longest = document.querySelector("#longest");
		targetwords = Object.keys(targets);
		if (targetwords.length > 30)
			break;
		console.log(`Only ${targetwords.length} target words in the grid, throwing the dice again`);
	}
	longestwords = findlongestwords(targets);
	targetword = longestwords[rand() % longestwords.length];
	targetpath = targets[targetword][rand() % targets[targetword].length];
	//console.log(targetword);
	document.querySelector("#top")       .style.visibility = "visible";
	document.querySelector("#enter")     .style.visibility = "visible";
	document.querySelector("#shareagain").style.visibility = "hidden";
	document.querySelector("#randomize") .style.visibility = "hidden";
	//document.querySelector("#otherlongest").textContent = "";
	updatecells(grid);
	updateremaining(targets);
	updatelongest(targets);
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
	setup_from_cookies(date, langs);
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
		const title = document.createElement("h1");
		title.textContent = "📚";
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
			if (getcookie("win_"+lang) === "true")
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
	document.querySelector("#update_date").textContent = "2023-12-06";
	document.querySelector("#showrules").onclick = showrulesframe;
	setuplangs();
	setupgame();
};
