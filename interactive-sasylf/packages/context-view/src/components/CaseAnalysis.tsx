import type { CaseAnalysisContext as CaseAnalysisContextPb } from '@live-sasylf/client';
import { createEffect, For, type Component } from 'solid-js';

type Props = {
	context: CaseAnalysisContextPb
}

export const CaseAnalysis: Component<Props> = (props: Props) => {
	createEffect(() => {
		console.debug(props.context);
	});

	return (<div>
		<p><span class="italic">Case analysis over:</span> <span class='text-green'>{props.context.currentCaseAnalysisElement}</span></p>
		<p class="italic">Cases:{' '}</p>
		<ul class='list-disc list-inside pl-2'>
			<For each={props.context.cases}>{(c) => <li><span class='text-green'>{c}</span></li>}</For>
		</ul>
	</div>);
};
