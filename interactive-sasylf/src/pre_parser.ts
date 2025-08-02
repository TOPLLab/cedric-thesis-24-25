import assert from 'assert';
import * as vscode from 'vscode';
import { SasylfInput } from '@/sasylf_process';

// TODO: Handle comments

enum AtomWord {
	END_THEOREM = "end theorem",
	END_LEMMA = "end lemma",
	END_CASE = "end case",
	END_INDUCTION = "end induction",

	PACKAGE = "package",
	TERMINALS = "terminals",
	SYNTAX = "syntax",
	JUDGMENT = "judgment",
	THEOREM = "theorem",
	LEMMA = "lemma",
	CASE = "case",
	IS = "is",
}

function calculatePosition(start: vscode.Position, str: string): vscode.Position {
	const newlines = str.split('').filter(c => c === '\n').length;
	const charactersOnLastLine = str.slice(str.lastIndexOf('\n') + 1).length;
	if (newlines === 0) {
		return start.translate(undefined, charactersOnLastLine);
	}

	return start.translate(newlines).with(undefined, charactersOnLastLine);
}

/// Get all `AtomWord`s in the string and their index
function getAtomWordsAndIndexes(input: string): [AtomWord, number][] {
	return Object
		.values(AtomWord)
		.map((word): [AtomWord, number] => {
			const index = input.indexOf(word);
			return [word, index];
		})
		.sort(([aw, a], [bw, b]) => a !== b ? a - b : bw.length - aw.length) // break ties by keeping the longest atom
		.filter(([_a, a]) => a !== -1);
}

/// Get the first `AtomWord` in the string and it's index
function getFirstAtomWordAndIndex(input: string): [AtomWord, number] | null {
	const result = getAtomWordsAndIndexes(input);

	if (input.startsWith("//") || input.startsWith("/*")) {
		return result[1] ?? null;
	}

	return result[0] ?? null;
}

/// Get the index of the first occurence of a certain `AtomWord`
function getFirstAtomIndex(atom: AtomWord, input: string): number | null {
	const atomIndexes = getAtomWordsAndIndexes(input);
	if (!atomIndexes) {
		return null;
	}

	for (const [a, idx] of atomIndexes) {
		if (a === atom) {
			return idx;
		}
	}
	return null;
}

export function parseIntoAtoms(position: vscode.Position, input: string, inTheorem: boolean): SasylfInput[] {
	// NOTE: To keep the positions/ranges correct, at no point may a part of the input string be lost.

	// Mask comments in the input
	input = input
		.replace(
			/\/\/.*$/gm,
			(match) => match.replace(/./g, ' ')
		).replace(
			/\/\*.*?\*\//gs,
			(match) => match.replace(/[^\n]/g, ' ')
		);

	var result: SasylfInput[] = [];
	var currentPos = position.with(); // `.with()` makes a clone.

	if (inTheorem) {
		const [rest, resultInThm] = parseInsideTheorem(currentPos, input);
		input = rest;
		result = result.concat(resultInThm);
		if (resultInThm.length > 0) {
			currentPos = resultInThm[resultInThm.length - 1].range.end;
		}
	}

	while (true) {
		const atomIndex = getFirstAtomWordAndIndex(input);

		if (atomIndex === null) {
			const endPos = calculatePosition(currentPos, input);
			return [...result, {
				range: new vscode.Range(currentPos, endPos),
				input: input
			}];
		}

		const [atom, index] = atomIndex;

		if (atom === AtomWord.THEOREM || atom === AtomWord.LEMMA) {
			const [rest, resultInThm] = parseInsideTheorem(currentPos, input);
			input = rest;
			result = result.concat(resultInThm);
			if (resultInThm.length > 0) {
				currentPos = resultInThm[resultInThm.length - 1].range.end;
			}
		} else
			if (index !== 0) {
				const slice = input.slice(0, index);
				const endPos = calculatePosition(currentPos, slice);
				result.push({
					range: new vscode.Range(currentPos, endPos),
					input: slice
				});
				currentPos = endPos;
				input = input.slice(index);
			} else {
				const newInput = input.slice(atom.length);

				// Get slice until next atom
				const nextAtomIndex = getFirstAtomWordAndIndex(newInput);

				// If no atom, take everything till the end
				if (nextAtomIndex === null) {
					const endPos = calculatePosition(currentPos, input);
					return [...result, {
						range: new vscode.Range(currentPos, endPos),
						input: input
					}];
				}

				// Else slice until next atom
				const [_, nextIndex] = nextAtomIndex;
				const slice = input.slice(0, nextIndex + atom.length);
				const endPos = calculatePosition(currentPos, slice);
				result.push({
					range: new vscode.Range(currentPos, endPos),
					input: slice
				});
				currentPos = endPos;
				input = input.slice(nextIndex + atom.length);
			}
	}
}

function parseInsideTheorem(position: vscode.Position, input: string): [string, SasylfInput[]] {
	// NOTE: To keep the positions/ranges correct, at no point may a part of the input string be lost. **

	// Find the part inside the theorem
	const nextEndTheorem = [getFirstAtomIndex(AtomWord.END_THEOREM, input), getFirstAtomIndex(AtomWord.END_LEMMA, input)].sort()[0];
	const rest = nextEndTheorem ? input.slice(nextEndTheorem) : "";
	input = nextEndTheorem ? input.slice(0, nextEndTheorem) : input;

	// First put special stuff such as `case ... is` and `end case` on their own line and don't touch again. 
	// (`case ... is` may be separated by newlines, `end case` has to be captured to not interfere with `case ... is`)
	const rEndCase = /\bend\b\s+\bcase\b\s*/;
	const rCaseIs = /\bcase\b(?:.|\s)+?\bis\b\s*/;

	const parts = input
		.split(new RegExp(`(${rEndCase.source}|${rCaseIs.source})`, 'g'))
		.filter(s => !!s && s !== '') // Remove undefined and empty strings (this is OK by **)
		.map<[string, boolean]>(p => { // Mark which parts NOT to touch (true === final)
			if (new RegExp(`^${rEndCase.source}$`).test(p)) {
				return [p, true];
			}
			if (new RegExp(`^${rCaseIs.source}$`).test(p)) {
				return [p, true];
			}
			return [p, false];
		});

	// TODO: Concat empty lines back onto the previous line
	const lines = parts
		.flatMap(([str, isFinal]) => {
			if (!isFinal) {
				return str
					.split(/([^\n]*\n\s*)/g) // slice after every newline and include all spaces (including newlines) after it.
					.filter(s => s !== ''); // Remove empty strings (this is OK by **)
			}
			return str;
		});

	assert(input === lines.join(''), 'parseInsideTheorem: The text after parsing is no longer exactly the same as before. Some parts may have been ommited which is not allowed.');

	var currentPos = position.with(); // `.with()` makes a clone.
	const linesWithRanges = lines
		.map<SasylfInput>(line => {
			const endPos = calculatePosition(currentPos, line);
			const val = {
				range: new vscode.Range(currentPos, endPos),
				input: line
			};
			currentPos = endPos;
			return val;
		});

	return [rest, linesWithRanges];
}