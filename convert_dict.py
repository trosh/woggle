#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import unicodedata

def buildref(fout, fname):
	ref = dict()
	numwords = 0
	with open(fname, "r") as f:
		for line in f:
			orig = line.strip()
			word = unicodedata.normalize("NFD", orig.upper()) \
				.encode("ascii", "ignore").decode("utf-8")
			length = len(word)
			if length < 4:
				continue
			fout.write(f'"{orig}",')
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

with open("dic.js", "w") as f:
	# Prefix
	f.write('export const dic = {\n')
	# English dictionary
	f.write('\t"en_orig": [')
	ref = buildref(f, "dictionary/enable1.txt")
	f.write('],\n\t"en": "')
	outputref(f, ref)
	f.write('",\n')
	# French dictionary
	f.write('\t"fr_orig": [')
	ref = buildref(f, "liste.de.mots.francais.frgut.txt")
	f.write('],\n\t"fr": "')
	outputref(f, ref)
	f.write('",\n')
	# Suffix
	f.write('};\n')
