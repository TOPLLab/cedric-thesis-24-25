import type { Context } from '@/types/context';
import type { Errors } from '@/types/errors';

export type SasylfResponse = {
	type: "context"
	context: Context
} | {
	type: "errors"
	errors: Errors
}
