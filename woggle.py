#! /usr/bin/env python3

from random import choice, randint
from datetime import datetime

# From http://www.bananagrammer.com/2013/10/the-boggle-cube-redesign-and-its-effect.html
# "Q" == "QU"
dice = {
	"Classic" : [
		"AACIOT", "ABILTY", "ABJMOQ", "ACDEMP",
		"ACELRS", "ADENVZ", "AHMORS", "BIFORX",
		"DENOSW", "DKNOTU", "EEFHIY", "EGKLUY",
		"EGINTV", "EHINPS", "ELPSTU", "GILRUW",
	],
	"New": [
		"AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS",
		"AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
		"DISTTY", "EEGHNW", "EEINSU", "EHRTVW",
		"EIOSST", "ELRTTY", "HIMNUQ", "HLNNRZ",
	]
}

t = datetime.now()
ref = dict()
numwords = 0
with open("scrabble-dictionary/dictionary.csv", "r") as words_f:
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
print(f"Built Scrabble dict containing {numwords} words in {ms:g}ms")

def inref(word):
	_ref = ref
	for c in word:
		if c not in _ref:
			return None
		_ref = _ref[c]
	if True in _ref:
		return True
	return False

#print(f"inref('aggression') = {inref('aggression'.upper())}")

grid = ["#" for i in range(16)]

def printgrid():
	for i in range(4):
		for j in range(4):
			c = grid[i*4+j].replace("Q", "QU")
			print(f"{c:3}", end="")
		print()

def randgrid():
	thrown = list()
	for die in dice["New"]:
		thrown.append(choice(die))
	for i in range(4):
		for j in range(4):
			t = randint(0, len(thrown)-1)
			grid[i*4+j] = thrown[t]
			del thrown[t]
	assert len(thrown) == 0

done = [False] * 16
word = ""
def _gridwords(found, pos):
	i, j = pos
	global word, done
	assert not done[i*4+j]
	done[i*4+j] = True
	word += grid[i*4+j]
	_word = word.replace("Q", "QU")
	ret = inref(_word)
	if len(_word) > 3 \
	and ret == True \
	and _word not in found:
		found.append(_word)
	if ret is not None:
		for ii in range(max(0,i-1),min(4,i+2)):
			for jj in range(max(0,j-1),min(4,j+2)):
				if not done[ii*4+jj]:
					_gridwords(found, (ii,jj))
	word = word[:-1]
	done[i*4+j] = False

def gridwords():
	t = datetime.now()
	found = []
	for i in range(4):
		for j in range(4):
			_gridwords(found, (i,j))
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
	ms = (datetime.now() - t).total_seconds() * 1000
	print(f"Found {len(found)} words in {ms:g}ms")

for _ in range(4):
	randgrid()
	printgrid()
	gridwords()
