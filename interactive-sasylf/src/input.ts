export function splitToAtoms(text: string): string[] {
	// TODO: Split into lines by keywords such as `theorem` and `case`
	return [text];
}

export function clean(text: string): string {
	return text.
		replaceAll("\n", "\\n").
		replaceAll("\t", "\\t");
}