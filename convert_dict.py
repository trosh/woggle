#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import unicodedata
import random
import sys
import re

def filter_dic(fname, upper=True):
	numwords = 0
	dic = set()
	diacritics = u"\u0300-\u036F" # primary Combining Diacritical Marks codepage
	re_nonrepr = re.compile(f"[^A-Za-z{diacritics}]")
	re_acronym = re.compile("[A-Z][A-Z]")
	re_upper   = re.compile("[A-Z]")
	with open(fname, "r") as f:
		for line in f:
			word = line.strip()
			if len(word) > 16:
				continue
			# Check all characters can be represented as ASCII
			decomposed = unicodedata.normalize("NFD", word)
			if re_nonrepr.search(decomposed):
				continue
			# Remove diacritics
			nodiacritics = decomposed \
				.encode("ascii", "ignore") \
				.decode("utf-8")
			if not upper and re_upper.search(word):
				continue
			# Check there's no consecutive uppers
			if re_acronym.search(nodiacritics):
				continue
			dic.add(word)
			# Update progress line
			numwords += 1
			if numwords % 10000 == 0:
				print(f"filter_dic({fname+')':<30}{numwords:>7}", end="\r")
	print(f"filter_dic({fname+')':<30}{numwords:>7}")
	return dic

def output_original(fout, dic_original):
	print(f"output_original({fout.name})")
	first = True
	for word in dic_original:
		if first:
			first = False
		else:
			fout.write(",")
		fout.write(f'"{word}"')

def buildref(dic_uppercase):
	print(f"buildref({len(dic_uppercase)})")
	ref = dict()
	for word in dic_uppercase:
		_ref = ref
		for c in word:
			if c not in _ref:
				_ref[c] = dict()
			_ref = _ref[c]
		if True not in _ref:
			_ref[True] = "%" # Value doesn't matter
	return ref

def _outputref(fout, ref):
	if True in ref:
		fout.write(".")
	for l in ref:
		if l == True:
			continue
		fout.write(l)
		_outputref(fout, ref[l])
	fout.write(";")

def outputref(fout, ref):
	print(f"outputref({fout.name})")
	_outputref(fout, ref)

enwiktionary_filtered = set()
scrabble_extended = set()

enwikt_filt        = filter_dic("english-wordlist-from-wiktionary/english-wordlist.txt")
enscrabble_ext     = filter_dic("dictionary/enable1.txt")
enpopular          = filter_dic("dictionary/popular.txt")
player_fr_original = filter_dic("dela-fr-public-u8.dic.txt", upper=False)
target_fr_original = filter_dic("target_fr.txt", upper=False)

print("player_en_original = enwikt_filt union enscrabble_ext")
player_en_original = enwikt_filt.union(enscrabble_ext)
print(f"player_en_original = {len(player_en_original)} words")
print("target_en_original = enpopular inter player_en_original")
target_en_original = enpopular.intersection(player_en_original)
print(f"target_en_original = {len(target_en_original)} words")

player_en_uppercase = set(map(str.upper, player_en_original))
target_en_uppercase = set(map(str.upper, target_en_original))
player_fr_uppercase = set(map(str.upper, player_fr_original))
target_fr_uppercase = set(map(str.upper, target_fr_original))

missing_en = target_en_original - player_en_original
missing_fr = target_fr_original - player_fr_original
if len(missing_en) > 0 or len(missing_fr) > 0:
	print(f"{len(missing_en)} words in target(en) but not in player(en)")
	print("[" + ", ".join(random.sample(sorted(missing_en), 10)) + ", …]")
	with open("player_en.txt", "w") as f:
		for word in sorted(target_en_original.union(player_en_original)):
			f.write(f"{word}\n")
	with open("target_en.txt", "w") as f:
		for word in sorted(target_en_original.intersection(player_en_original)):
			f.write(f"{word}\n")
	print(f"{len(missing_fr)} words in target(fr) but not in player(fr)")
	print("[" + ", ".join(random.sample(sorted(missing_fr), 10)) + ", …]")
	with open("target_fr.txt", "w") as f:
		for word in sorted(target_fr_original.intersection(player_fr_original)):
			f.write(f"{word}\n")
	sys.exit(1)

ref_en_player = buildref(player_en_uppercase)
ref_fr_player = buildref(player_fr_uppercase)
ref_en_target = buildref(target_en_uppercase)
ref_fr_target = buildref(target_fr_uppercase)

with open("dic_original.json", "w") as f:
	f.write('{\n')
	f.write('\t"en": [')
	output_original(f, player_en_original)
	f.write('],\n')
	f.write('\t"fr": [')
	output_original(f, player_fr_original)
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
	outputref(f, ref_en_target)
	f.write('",\n')
	f.write('\t"fr": "')
	outputref(f, ref_fr_target)
	f.write('"\n')
	f.write('}\n')

test_kept_words = [
	"discombobulated", "stat", "stats", "realise", "saviour",
	"smartest", "thrice", #"touché",
	]

test_removed_words = [
	"MA", "dc",
	]

for w in test_kept_words:
	assert(w in player_en_original)
for w in test_removed_words:
	assert(w not in player_en_original)
