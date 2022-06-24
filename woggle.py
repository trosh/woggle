#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import random
from datetime import datetime

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
	t = datetime.now()
	ref = dict()
	numwords = 0
	with open(file, "r") as words_f:
		for line in words_f:
			word = line.strip().upper()
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
	ms = (datetime.now() - t).total_seconds() * 1000
	print(f"Built dict containing {numwords} words in {ms:g}ms")
	return ref

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
	for die in dice["New"]:
		thrown.append(random.choice(die))
	for i in range(4):
		for j in range(4):
			t = random.randint(0, len(thrown)-1)
			grid[i*4+j] = thrown[t]
			del thrown[t]
	assert len(thrown) == 0
	return grid

def printgrid(grid, path=None, good=None, grayed=None):
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
			elif grayed is not None \
			and (i,j) in grayed:
				if path is not None \
				and (i,j) in path:
					fmt = "1;41;30"
				else:
					fmt = "41;30"
			print(f"\033[{fmt}m{c:3}\033[m", end="")
		print()

done = [False] * 16
word = ""
def _findwords(ref, grid, found, pos):
	i, j = pos
	global word, done
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
					_findwords(ref, grid, found, (ii,jj))
	word = word[:-1]
	done[i*4+j] = False

def findwords(ref, grid):
	t = datetime.now()
	found = []
	for i in range(4):
		for j in range(4):
			_findwords(ref, grid, found, (i,j))
	ms = (datetime.now() - t).total_seconds() * 1000
	#print(f"Found {len(found)} words in {ms:g}ms")
	return found

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

def _findpath(grid, word, pos):
	i, j = pos
	global done
	assert not done[i*4+j]
	assert len(word) > 0
	done[i*4+j] = True
	for ii in range(max(0,i-1),min(4,i+2)):
		for jj in range(max(0,j-1),min(4,j+2)):
			if done[ii*4+jj]:
				continue
			qu = (grid[ii*4+jj] == "q" and word[:2] == "QU")
			if grid[ii*4+jj] != word[0] and not qu:
				continue
			if len(word) == 1:
				return [(ii,jj)]
			if qu:
				ret = _findpath(grid, word[2:], (ii,jj))
			else:
				ret = _findpath(grid, word[1:], (ii,jj))
			if ret is not None:
				return [(ii,jj)] + ret
	done[i*4+j] = False

def findpath(grid, word):
	global done
	done = [False] * 16
	for i in range(4):
		for j in range(4):
			ret = _findpath(grid, word, (i,j))
			if ret is not None:
				return ret
	return None

print("EN/FR?")
while True:
	lang = input("> ").upper()
	if lang == "EN":
		ref = buildref("scrabble-dictionary/dictionary.csv")
		diceset = "Classic"
	elif lang == "FR":
		ref = buildref("liste.de.mots.francais.frgut.txt")
		diceset = "International"
	else:
		print("invalid language")
		continue
	break
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
grayed = set()
n = 1
while n <= 5:
	word = input(f"{n}/5 > ").upper()
	if word == "SPOIL ME":
		printwords(found)
		continue
	if word == "SPOIL ME THE TARGET":
		print(target)
		continue
	path = findpath(grid, word)
	if path is None:
		print(f"{word} is not in the grid" if lang == "EN" \
		 else f"{word} n'est pas dans la grille")
		continue
	if word not in found:
		print(f"{word} is not in the dictionary" if lang == "EN" \
		 else f"{word} n'est pas dans le dictionnaire")
		continue
	for pos in path:
		if pos in targetpath:
			good.add(pos)
		else:
			grayed.add(pos)
	printgrid(grid, path, good, grayed)
	if word == target:
		print(f"you win in {n} round{'s' if n > 1 else ''}!!!" if lang == "EN" \
		 else f"tu gagnes en {n} tour{'s' if n > 1 else ''} !!!")
		break
	n += 1
else:
	print("you loooose..." if lang == "EN" \
	 else "tu as perdu ...")
