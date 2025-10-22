import type { Theorem as TheoremPb } from '@live-sasylf/client';
import { For, type Component } from 'solid-js';
import { Fact } from '@/components/Fact';

type Props = {
	theorem: TheoremPb
}

export const Theorem: Component<Props> = (props: Props) => {
	return (<>
		<span class="italic">Theorem:</span> ∀{' '}
		<span class="comma-separated-list">
			<For each={props.theorem.forall}>
				{(forall) => <span><Fact>{forall}</Fact></span>}
			</For>
		</span>{' '}
		∃ <span class='text-green'>{props.theorem.exists}</span>
	</>);
};
