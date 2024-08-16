#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import unicodedata
import re

def buildref(fout, fname):
	ref = dict()
	numwords = 0
	first = True
	badletter = re.compile("[^A-Z]")
	with open(fname, "r") as f:
		for line in f:
			orig = line.strip()
			if orig.lower() != orig:
				continue
			word = unicodedata.normalize("NFD", orig.upper()) \
				.encode("ascii", "ignore").decode("utf-8")
			if badletter.search(word):
				continue
			length = len(word)
			if fout is not None:
				if first:
					first = False
				else:
					fout.write(",")
				fout.write(f'"{orig}"')
			_ref = ref
			for c in word:
				if c not in _ref:
					_ref[c] = dict()
				_ref = _ref[c]
			if True not in _ref:
				_ref[True] = "%" # Value doesn't matter
				numwords += 1
			# Update progress line
			if numwords % 10000 == 0:
				print(f"{fname:<30}{numwords:>7}", end="\r")
	print()
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

with open("dic_original.json", "w") as f:
	f.write('{\n')
	f.write('\t"en": [')
	ref_en_player = buildref(f, "dictionary/unix-words")
	f.write('],\n')
	f.write('\t"fr": [')
	ref_fr_player = buildref(f, "wiktionaire-fr/dict.txt")
	f.write(']\n')
	f.write('}\n')

with open("dic_player.json", "w") as f:
	f.write('{\n')
	f.write('\t"en": "')
	outputref(f, ref_en_player)
	f.write('",\n')
	f.write('\t"fr": "')
	outputref(f, ref_fr_player)
	f.write('"\n')
	f.write('}\n')

with open("dic_target.json", "w") as f:
	f.write('{\n')
	f.write('\t"en": "')
	ref = buildref(None, "dictionary/popular.txt")
	outputref(f, ref)
	f.write('",\n')
	f.write('\t"fr": "')
	ref = buildref(None, "nderousseaux.65kmots.gist.txt")
	outputref(f, ref)
	f.write('"\n')
	f.write('}\n')
