import assert from 'assert';
import * as vscode from 'vscode';
import { SasylfInput } from '@/sasylf_process';

enum SyncWord {
	END_THEOREM = "end theorem",
	END_LEMMA = "end lemma",
	END_CASE = "end case",
	END_INDUCTION = "end induction",
	END_CASE_ANALYSIS = "end case analysis",

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

/// Get all `SyncWord`s in the string and their index
function getSyncWordsAndIndexes(input: string): [SyncWord, number][] {
	return Object
		.values(SyncWord)
		.map((word): [SyncWord, number] => {
			const index = input.indexOf(word);
			return [word, index];
		})
		.sort(([aWord, aIndex], [bWord, bIndex]) => aIndex !== bIndex ? aIndex - bIndex : bWord.length - aWord.length) // break ties by keeping the longest Sync
		.filter(([_, aIndex]) => aIndex !== -1)
		.reduce((filteredList, val) => {

			if (filteredList.length === 0) {
				return [val];
			}
			const lastVal = filteredList.pop()!;
			const [_lastWord, lastIndex] = lastVal;
			const [_currWord, currIndex] = val;

			// If the index is the same, remove since we sorted by length
			if (lastIndex === currIndex) {
				return [...filteredList, lastVal];
			}

			return [...filteredList, lastVal, val];
		}, [] as [SyncWord, number][]);
}

/// Get the first `SyncWord` in the string and it's index
function getFirstSyncWordAndIndex(input: string): [SyncWord, number] | null {
	return getSyncWordsAndIndexes(input)[0] ?? null;
}

/// Get the index of the first occurence of a certain `SyncWord`
function getFirstSyncIndex(sync: SyncWord, input: string): number | null {
	const syncIndexes = getSyncWordsAndIndexes(input);
	if (!syncIndexes) {
		return null;
	}

	for (const [word, idx] of syncIndexes) {
		if (word === sync) {
			return idx;
		}
	}
	return null;
}

/**
 * Parses a complete file into ranges which are appropriate to send to SASyLF
 * @param input The full file text to pre parse
 * @returns 
 */
export function preparse(input: string): SasylfInput[] {
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
	var currentPos = new vscode.Position(0, 0); // `.with()` makes a clone.

	while (true) {
		const syncIndex = getFirstSyncWordAndIndex(input);

		if (syncIndex === null) {
			const endPos = calculatePosition(currentPos, input);
			return [...result, {
				range: new vscode.Range(currentPos, endPos),
				input: input
			}];
		}

		const [sync, index] = syncIndex;

		if (sync === SyncWord.THEOREM || sync === SyncWord.LEMMA) {
			const [rest, resultInThm] = parseInsideTheorem(currentPos, input);
			input = rest;
			result = result.concat(resultInThm);
			if (resultInThm.length > 0) {
				currentPos = resultInThm[resultInThm.length - 1].range.end;
			}
		} else
			if (index !== 0 && input.slice(0, index).trim() !== "") {
				const slice = input.slice(0, index);
				const endPos = calculatePosition(currentPos, slice);
				result.push({
					range: new vscode.Range(currentPos, endPos),
					input: slice
				});
				currentPos = endPos;
				input = input.slice(index);
			} else {
				const newInput = input.slice(index + sync.length);

				// Get slice until next Sync
				const nextSyncIndex = getFirstSyncWordAndIndex(newInput);

				// If no Sync, take everything till the end
				if (nextSyncIndex === null) {
					const endPos = calculatePosition(currentPos, input);
					return [...result, {
						range: new vscode.Range(currentPos, endPos),
						input: input
					}];
				}

				// Else slice until next sync
				const [_, nextIndex] = nextSyncIndex;
				const slice = input.slice(0, index + sync.length + nextIndex);
				const endPos = calculatePosition(currentPos, slice);
				result.push({
					range: new vscode.Range(currentPos, endPos),
					input: slice
				});
				currentPos = endPos;
				input = input.slice(index + sync.length + nextIndex);
			}
	}
}

function parseInsideTheorem(position: vscode.Position, input: string): [string, SasylfInput[]] {
	// NOTE: To keep the positions/ranges correct, at no point may a part of the input string be lost. **

	// Find the part inside the theorem
	const nextEndTheorem = [getFirstSyncIndex(SyncWord.END_THEOREM, input), getFirstSyncIndex(SyncWord.END_LEMMA, input)].sort()[0];
	const rest = nextEndTheorem ? input.slice(nextEndTheorem) : "";
	input = nextEndTheorem ? input.slice(0, nextEndTheorem) : input;

	// First put special stuff such as `case ... is` and `end case` on their own line and don't touch again. 
	// (`case ... is` may be separated by newlines, `end case` has to be captured to not interfere with `case ... is`)
	const rEndCase = /\bend\b\s+\bcase\b(?!\s+\banalysis\b)\s*/;
	const rCaseIs = /(?!\bcase\b\s+\banalysis\b\s*)\bcase\b(?:.|\s)+?\bis\b\s*/;

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