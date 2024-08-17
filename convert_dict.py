#! /usr/bin/env python3
# vim: ts=8:sts=8:sw=8:noexpandtab

import unicodedata
import random
import sys
import re

def filter_dic(fname):
	numwords = 0
	dic_original = set()
	dic_uppercase = set()
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
			dic_original.add(orig)
			dic_uppercase.add(word)
			# Update progress line
			numwords += 1
			if numwords % 10000 == 0:
				print(f"filter_dic({fname+')':<30}{numwords:>7}", end="\r")
	print(f"filter_dic({fname+')':<30}{numwords:>7}")
	return [dic_original, dic_uppercase]

def output_original(fout, dic_original):
	print(f"output_original({fout.name+')':<30}")
	first = True
	for word in dic_original:
		if first:
			first = False
		else:
			fout.write(",")
		fout.write(f'"{word}"')

def buildref(dic_uppercase):
	print("buildref(…)")
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

def outputref(fout, ref):
	if True in ref:
		fout.write(".")
	for l in ref:
		if l == True:
			continue
		fout.write(l)
		outputref(fout, ref[l])
	fout.write(";")

[player_en_original, player_en_uppercase] = filter_dic("player_en.txt")
[player_fr_original, player_fr_uppercase] = filter_dic("dela-fr-public-u8.dic.txt")
[target_en_original, target_en_uppercase] = filter_dic("target_en.txt")
[target_fr_original, target_fr_uppercase] = filter_dic("target_fr.txt")

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
