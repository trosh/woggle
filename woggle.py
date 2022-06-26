#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import random
#from datetime import datetime
import unicodedata

# From http://www.bananagrammer.com/2013/10/the-boggle-cube-redesign-and-its-effect.html
# "q" == "QU"
dice = {
	"Classic" : [
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
}

def buildref(file):
	#t = datetime.now()
	ref = dict()
	numwords = 0
	with open(file, "r") as words_f:
		for line in words_f:
			word = unicodedata.normalize("NFD", line.strip().upper()) \
				.encode("ascii", "ignore").decode("utf-8")
			length = len(word)
			if length <= 3:
				continue
			_ref = ref
			for c in word:
				if c not in _ref:
					_ref[c] = dict()
				_ref = _ref[c]
			if True not in _ref:
				_ref[True] = "%"
				numwords += 1
			if numwords % 10000 == 0:
				print(numwords, end="\r")
	#ms = (datetime.now() - t).total_seconds() * 1000
	#print(f"Built dict containing {numwords} words in {ms:g}ms")
	return ref, numwords

def inref(ref, word):
	_ref = ref
	for c in word:
		if c not in _ref:
			return None
		_ref = _ref[c]
	if True in _ref:
		return True
	return False

#print(f"inref('aggression') = {inref('aggression'.upper())}")

def randgrid(diceset):
	grid = ["#" for i in range(16)]
	thrown = list()
	for die in dice[diceset]:
		thrown.append(random.choice(die))
	for i in range(4):
		for j in range(4):
			t = random.randint(0, len(thrown)-1)
			grid[i*4+j] = thrown[t]
			del thrown[t]
	assert len(thrown) == 0
	return grid

def printgrid(grid, path=None, good=None, bad=None):
	for i in range(4):
		for j in range(4):
			c = grid[i*4+j].replace("q", "QU")
			fmt = ""
			if good is not None \
			and (i,j) in good:
				if path is not None \
				and (i,j) in path:
					fmt = "1;42;30"
				else:
					fmt = "42;30"
			elif bad is not None \
			and (i,j) in bad:
				if path is not None \
				and (i,j) in path:
					fmt = "1;41;30"
				else:
					fmt = "41;30"
			print(f"\033[{fmt}m{c:3}\033[m", end="")
		print()
	print()

word = ""
def _findwords(ref, grid, done, found, pos):
	i, j = pos
	global word
	assert not done[i*4+j]
	done[i*4+j] = True
	word += grid[i*4+j]
	_word = word.replace("q", "QU")
	ret = inref(ref, _word)
	if len(_word) > 3 \
	and ret == True \
	and _word not in found:
		found.append(_word)
	if ret is not None:
		for ii in range(max(0,i-1),min(4,i+2)):
			for jj in range(max(0,j-1),min(4,j+2)):
				if not done[ii*4+jj]:
					_findwords(ref, grid, done, found, (ii,jj))
	word = word[:-1]
	done[i*4+j] = False

def findwords(ref, grid):
	#t = datetime.now()
	found = []
	done = [False] * 16
	global word
	word = ""
	for i in range(4):
		for j in range(4):
			_findwords(ref, grid, done, found, (i,j))
	#ms = (datetime.now() - t).total_seconds() * 1000
	#print(f"Found {len(found)} words in {ms:g}ms")
	return found

def updatefound(grid, found, good, bad):
	newfound = []
	for word in found:
		path = set(findpath(grid, word))
		if good.issubset(path) \
		and not path.intersection(bad):
			newfound.append(word)
	return newfound

def printwords(found):
	maxlength = 0
	for word in found:
		maxlength = max(len(word), maxlength)
	curlen = 0
	for word in found:
		print(f"{word:<{maxlength}} ", end="")
		curlen += maxlength + 1
		if curlen > 80:
			curlen = 0
			print()
	if curlen > 0:
		print()

def _findpath(grid, done, word, pos):
	i, j = pos
	assert not done[i*4+j]
	assert len(word) > 0
	qu = (grid[i*4+j] == "q" and word[:2] == "QU")
	if grid[i*4+j] != word[0] and not qu:
		return None
	if len(word) == 1:
		return [(i,j)]
	done[i*4+j] = True
	for ii in range(max(0,i-1),min(4,i+2)):
		for jj in range(max(0,j-1),min(4,j+2)):
			if done[ii*4+jj]:
				continue
			if qu:
				ret = _findpath(grid, done, word[2:], (ii,jj))
			else:
				ret = _findpath(grid, done, word[1:], (ii,jj))
			if ret is not None:
				done[i*4+j] = False
				return [(ii,jj)] + ret
	done[i*4+j] = False
	return None

def findpath(grid, word):
	for i in range(4):
		for j in range(4):
			done = [False] * 16
			ret = _findpath(grid, done, word, (i,j))
			if ret is not None:
				return [(i,j)] + ret
	return None

print("EN/FR?")
while True:
	lang = input("> ").upper()
	if lang == "EN":
		ref, numwords = buildref("scrabble-dictionary/dictionary.csv")
		diceset = "Classic"
	elif lang == "FR":
		ref, numwords = buildref("liste.de.mots.francais.frgut.txt")
		diceset = "International"
	else:
		print("invalid language")
		continue
	break
print(f"The dictionary contains {numwords} words (≥ 4 letters)" if lang == "EN" \
 else f"Le dictionnaire contient {numwords} mots (≥ 4 lettres)")
while True:
	while True:
		grid = randgrid(diceset)
		found = findwords(ref, grid)
		if len(found) > 30:
			break
	print(f"There are {len(found)} words in the grid" if lang == "EN" \
	 else f"Il y a {len(found)} mots dans la grille")
	printgrid(grid)
	target = random.choice(found)
	targetpath = findpath(grid, target)
	good = set()
	bad = set()
	n = 1
	while n <= 5:
		word = input(f"{n}/5 > ").upper()
		word = unicodedata.normalize("NFD", word) \
			.encode("ascii", "ignore").decode("utf-8")
		if word == "":
			printgrid(grid, path, good, bad)
			continue
		if word == "SPOIL ME":
			printwords(found)
			continue
		if word == "SPOIL ME THE TARGET":
			print(target)
			continue
		path = findpath(grid, word)
		if path is None:
			print(f"{word} is not in the grid" if lang == "EN" \
			 else f"{word} n'est pas dans la grille", end=" ")
			continue
		if inref(ref, word) != True:
			print(f"{word} is not in the dictionary" if lang == "EN" \
			 else f"{word} n'est pas dans le dictionnaire", end=" ")
			continue
		for pos in path:
			if pos in targetpath:
				good.add(pos)
			else:
				bad.add(pos)
		printgrid(grid, path, good, bad)
		if word == target:
			print(f"you win in {n} round{'s' if n > 1 else ''}!!!" if lang == "EN" \
			 else f"tu gagnes en {n} tour{'s' if n > 1 else ''} !!!")
			break
		n += 1
		if word in found:
			found.remove(word)
		found = updatefound(grid, found, good, bad)
		print(f"{len(found)} words possible left" if lang == "EN" \
		 else f"Il reste {len(found)} mots possibles")
	else:
		print(f"you loose... the word was {target}" if lang == "EN" \
		 else f"tu as perdu ... le mot était {target}")
	print()
	print("play again? (Y/n)" if lang == "EN" \
	 else "rejouer ? (O/n)")
	cmd = input("> ")
	if cmd in ["n", "N"]:
		break
