#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import unicodedata

def buildref(fname):
	ref = dict()
	numwords = 0
	with open(fname, "r") as f:
		for line in f:
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
	return ref

def outputref(f, ref):
	if True in ref:
		f.write(".")
	for l in ref:
		if l == True:
			continue
		f.write(l)
		outputref(f, ref[l])
	f.write(";")

ref = buildref("liste.de.mots.francais.frgut.txt")

import json

with open("fr.json", "w") as f:
	json.dump(ref, f)
#with open("fr.dic", "w") as f:
	#outputref(f, ref)
