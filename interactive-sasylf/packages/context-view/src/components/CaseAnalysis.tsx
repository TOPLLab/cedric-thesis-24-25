import type { CaseAnalysisContext as CaseAnalysisContextPb } from '@live-sasylf/client';
import { For, type Component } from 'solid-js';

type Props = {
	context: CaseAnalysisContextPb
}

export const CaseAnalysis: Component<Props> = (props: Props) => {
	return (<div>
		<p><span class="italic">Case analysis over:</span> <span class='text-green'>{props.context.currentCaseAnalysisElement}</span></p>
		<p class="italic">Cases:{' '}</p>
		<div class='flex flex-col gap-1'>
			<For each={props.context.cases}>{(c) => (
				<div class='flex flex-row gap-1'><input type='checkbox' disabled checked={props.context.finishedCases.includes(c)} /><span class='text-green'>{c}</span></div>
			)}
			</For>
		</div>
	</div>);
};
