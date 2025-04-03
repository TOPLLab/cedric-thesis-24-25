export type Context = {
	currentTheorem?: Theorem
	currentGoal?: Term
	derivations?: Fact[]
	cases?: string[]
}

export type Theorem = {
	foralls: {
		name: string
		element: Element
	}[]
	exists: Term
}

export type Element = {
	term: Term
}

export type Term =
	| AbstractionTerm
	| ApplicationTerm
	| FreeVarTerm
	| BoundVarTerm
	| ConstantTerm

export type AbstractionTerm = {
	term: "Abstraction"
	varName: string
	varType: Term
	body: Term
}

export type ApplicationTerm = {
	term: "Application"
	function: Term
	arguments: Term[]
}

export type FreeVarTerm = {
	term: "FreeVar",
	name: string,
	stamp: number
}

export type BoundVarTerm = {
	term: "BoundVar"
	name: string
	type: Term
	index: number
}

export type ConstantTerm = {
	term: "Constant"
	name: string
}

export type Fact =
	| DerivationFact
	| SyntaxAssumptionFact
	| VariableAssumptionFact

export type DerivationFact = {
	fact: "Derivation"
	name: string
	clause: Element
}

export type SyntaxAssumptionFact = {
	fact: "SyntaxAssumption"
	name: string
	context: Element
}

export type VariableAssumptionFact = {
	fact: "VariableAssumption"
	name: string
	variable: Element
}