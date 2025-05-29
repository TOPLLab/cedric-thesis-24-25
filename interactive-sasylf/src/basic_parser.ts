import * as vscode from 'vscode';

export type SasylfInput = [vscode.Range, string]

enum AtomWord {
	END_THEOREM = "end theorem",
	END_CASE = "end case",
	END_INDUCTION = "end induction",

	PACKAGE = "package",
	TERMINALS = "terminals",
	SYNTAX = "syntax",
	THEOREM = "theorem",
	CASE = "case",
	IS = "is",
}

function getFirstAtomWordAndIndex(input: string): [AtomWord, number] | null {
	return Object.values(AtomWord).map((word): [AtomWord, number] => {
		const index = input.indexOf(word);
		return [word, index];
	})
		.sort(([aw, a], [bw, b]) => a !== b ? a - b : bw.length - aw.length) // break ties by keeping the longest atom
		.filter(([_a, a]) => a !== -1)[0] ?? null;
}

function getFirstAtomIndex(atom: AtomWord, input: string): number | null {
	const index = input.indexOf(atom);
	if (index < 0) {
		return null;
	}
	return index;
}

export function parseIntoAtoms(input: string, inTheorem: boolean): string[] {
	var result: string[] = [];

	if (inTheorem) {
		const insideThm = parseInsideTheorem(input);
		input = insideThm[0];
		result = result.concat(insideThm[1]);
	}

	while (true) {
		const atomIndex = getFirstAtomWordAndIndex(input);

		if (atomIndex === null) {
			return [...result, input];
		}

		const [atom, index] = atomIndex;

		if (atom === AtomWord.THEOREM) {
			// TODO: handle when still inside theorem
			const insideThm = parseInsideTheorem(input);
			input = insideThm[0];
			result = result.concat(insideThm[1]);
		} else
			if (index !== 0) {
				result.push(input.slice(0, index));
				input = input.slice(index);
			} else {
				const newInput = input.slice(atom.length);
				const nextAtomIndex = getFirstAtomWordAndIndex(newInput);

				if (nextAtomIndex === null) {
					return [...result, input];
				}

				const [_, nextIndex] = nextAtomIndex;
				result.push(input.slice(0, nextIndex + atom.length));
				input = input.slice(nextIndex + atom.length);
			}
	}
}

function parseInsideTheorem(input: string): [string, string[]] {
	// Find the part inside the theorem
	const nextEndTheorem = getFirstAtomIndex(AtomWord.END_THEOREM, input);
	const rest = nextEndTheorem ? input.slice(nextEndTheorem) : "";
	input = nextEndTheorem ? input.slice(0, nextEndTheorem) : input;

	// TODO: First put special stuff such as `case\n*.*\n*is` on their own line and don't touch again

	// Remove any empty lines (their trimmed value === "")
	const lines = input.split('\n').filter((s) => s.trim().length > 0);

	return [rest, lines];
}