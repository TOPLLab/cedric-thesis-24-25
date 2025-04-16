import { Context } from '@/types/context';
import { Errors } from '@/types/errors';

export type SasylfResponse = {
	type: "context"
	context: Context
} | {
	type: "errors"
	errors: Errors
}