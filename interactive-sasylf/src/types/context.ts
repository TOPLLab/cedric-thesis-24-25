export type Context = {
	currentTheorem?: Theorem
	currentGoal?: string
	derivations?: Fact[]
	currentCaseAnalysisElement?: string
	cases?: string[]
}

export type Theorem = {
	foralls: Fact[]
	exists: string
}

export type Fact =
	| DerivationFact
	| SyntaxAssumptionFact
	| VariableAssumptionFact

export type DerivationFact = {
	fact: "Derivation"
	name: string
	clause: string
}

export type SyntaxAssumptionFact = {
	fact: "SyntaxAssumption"
	name: string
	context: string
}

export type VariableAssumptionFact = {
	fact: "VariableAssumption"
	name: string
	variable: string
}