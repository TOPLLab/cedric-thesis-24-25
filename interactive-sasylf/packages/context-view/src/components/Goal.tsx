import { type Component } from 'solid-js';

type Props = {
	goal: string
}

export const Goal: Component<Props> = (props: Props) => {
	return (<>
		<span class='text-green'>{props.goal}</span>
	</>);
};
