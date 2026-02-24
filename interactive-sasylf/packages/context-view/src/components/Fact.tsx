import type {
	Fact as FactPb,
	DerivationFact as DerivationFactPb,
	VariableAssumptionFact as VariableAssumptionFactPb,
	SyntaxAssumptionFact as SyntaxAssumptionFactPb
} from '@live-sasylf/client';
import { type Component } from 'solid-js';

type Props = {
	children: FactPb
};

export const Fact: Component<Props> = (props) => {
	return <>{
		props.children.value.case === "derivationFact"
			? <DerivationFact>{props.children.value.value}</DerivationFact>
			: props.children.value.case === "syntaxAssumptionFact"
				? <SyntaxAssumptionFact>{props.children.value.value}</SyntaxAssumptionFact>
				: props.children.value.case === "variableAssumptionFact"
					? <VariablbeAssumptionFact>{props.children.value.value}</VariablbeAssumptionFact>
					: null
	}</>;
};

type DerivationFactProps = {
	children: DerivationFactPb
};
const DerivationFact: Component<DerivationFactProps> = (props) => {
	return <>
		<span class="text-blue">{props.children.name}</span><span>: </span>
		<span class="text-green">{props.children.clause}</span>
	</>;
};

type SyntaxAssumptionFactProps = {
	children: SyntaxAssumptionFactPb
};
const SyntaxAssumptionFact: Component<SyntaxAssumptionFactProps> = (props) => {
	return <>
		<span class='text-blue'>{props.children.name}</span><span>: </span>
		<span class='text-green'>{props.children.context}</span>
	</>;
};

type VariablbeAssumptionFactProps = {
	children: VariableAssumptionFactPb
};
const VariablbeAssumptionFact: Component<VariablbeAssumptionFactProps> = (props) => {
	return <>
		<span class='text-blue'>${props.children.name}</span><span>: </span>
		<span class='text-green'>${props.children.variable}</span>
	</>;
};
